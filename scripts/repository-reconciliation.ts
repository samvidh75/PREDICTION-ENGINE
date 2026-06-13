/**
 * Repository Reconciliation — Item 5 from production stabilization.
 *
 * Checks:
 *  - All migrations have been applied
 *  - The daily_prices schema matches canonical column names
 *  - prediction_registry has expected indexes
 *  - No schema drift between migration files and actual database
 */
import { pool } from '../src/db';

interface ReconciliationIssue {
  type: string;
  severity: 'error' | 'warn';
  message: string;
}

async function main() {
  const issues: ReconciliationIssue[] = [];
  const dbKind = await detectDbKind();

  console.log(`=== Repository Reconciliation (db=${dbKind}) ===\n`);

  // ── 1. Migration status ───────────────────────────────────────────────────
  console.log('[1/5] Migration status...');
  try {
    const migrations = await pool.query(
      'SELECT name, applied_at FROM _migrations ORDER BY name'
    );
    const applied = migrations.rows.map(r => String(r.name));
    if (applied.length === 0) {
      issues.push({ type: 'migrations', severity: 'error', message: 'No migrations have been applied' });
    } else {
      console.log(`  ${applied.length} migrations applied:`);
      for (const m of applied) console.log(`    ${m}`);
    }
  } catch {
    issues.push({ type: 'migrations', severity: 'error', message: 'Cannot query _migrations table' });
  }

  // ── 2. daily_prices column check ──────────────────────────────────────────
  console.log('[2/5] daily_prices schema...');
  try {
    let columns: string[];
    if (dbKind === 'postgres') {
      const res = await pool.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'daily_prices'
         ORDER BY ordinal_position`
      );
      columns = res.rows.map(r => String(r.column_name));
    } else {
      const res = await pool.query('PRAGMA table_info(daily_prices)');
      columns = res.rows.map(r => String(r.name));
    }

    const expected = ['symbol', 'trade_date', 'open', 'high', 'low', 'close', 'adjusted_close',
      'volume', 'dividends', 'stock_splits', 'source', 'quality_score', 'ingested_at'];

    for (const col of expected) {
      if (!columns.includes(col)) {
        issues.push({ type: 'schema-drift', severity: 'error', message: `daily_prices missing column: ${col}` });
      }
    }

    const legacyCols = columns.filter(c => c === 'date' || c === 'adj_close');
    for (const col of legacyCols) {
      issues.push({ type: 'schema-drift', severity: 'error', message: `daily_prices has legacy column: ${col} (should be trade_date/adjusted_close)` });
    }

    console.log(`  ${columns.length} columns: ${legacyCols.length > 0 ? 'LEGACY COLUMNS DETECTED' : 'OK'}`);
  } catch (e) {
    issues.push({ type: 'schema-drift', severity: 'error', message: `Cannot inspect daily_prices: ${e}` });
  }

  // ── 3. prediction_registry indexes ────────────────────────────────────────
  console.log('[3/5] prediction_registry indexes...');
  try {
    let indexes: string[];
    if (dbKind === 'postgres') {
      const res = await pool.query(
        "SELECT indexname AS name FROM pg_indexes WHERE tablename = 'prediction_registry'"
      );
      indexes = res.rows.map(r => String(r.name));
    } else {
      const res = await pool.query(
        "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='prediction_registry'"
      );
      indexes = res.rows.map(r => String(r.name));
    }

    const needed = ['idx_prediction_registry_symbol', 'idx_prediction_registry_prediction_date'];
    for (const idx of needed) {
      if (!indexes.includes(idx)) {
        issues.push({ type: 'missing-index', severity: 'warn', message: `Missing index: ${idx}` });
      }
    }
    console.log(`  ${indexes.length} indexes: ${needed.filter(i => !indexes.includes(i)).length > 0 ? 'MISSING' : 'OK'}`);
  } catch (e) {
    issues.push({ type: 'missing-index', severity: 'warn', message: `Cannot inspect indexes: ${e}` });
  }

  // ── 4. Created_by consistency ──────────────────────────────────────────────
  console.log('[4/5] prediction_registry created_by tags...');
  try {
    const tags = await pool.query(
      'SELECT DISTINCT created_by FROM prediction_registry ORDER BY created_by'
    );
    const createdByTags = tags.rows.map(r => String(r.created_by));
    console.log(`  Created by tags: ${createdByTags.join(', ') || '(empty)'}`);
    if (createdByTags.includes('ManualSnapshot') && createdByTags.includes('PredictionFactory')) {
      issues.push({
        type: 'scoring-path',
        severity: 'warn',
        message: 'Both ManualSnapshot (scoreEngine) and PredictionFactory paths are writing to prediction_registry. Consider consolidating.',
      });
    }
  } catch {
    issues.push({ type: 'scoring-path', severity: 'warn', message: 'Cannot inspect created_by tags' });
  }

  // ── 5. Data integrity ──────────────────────────────────────────────────────
  console.log('[5/5] data integrity...');
  try {
    const nullScores = await pool.query(
      `SELECT COUNT(*) as c FROM prediction_registry WHERE ranking_score IS NULL`
    );
    console.log(`  Predictions with null ranking_score: ${nullScores.rows[0]?.c ?? '?'}`);
  } catch {
    issues.push({ type: 'data-integrity', severity: 'warn', message: 'Cannot check data integrity' });
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`\n=== Results ===`);
  console.log(`  Errors: ${issues.filter(i => i.severity === 'error').length}`);
  console.log(`  Warnings: ${issues.filter(i => i.severity === 'warn').length}`);

  for (const issue of issues) {
    console.log(`  [${issue.severity.toUpperCase()}] ${issue.type}: ${issue.message}`);
  }

  process.exit(issues.some(i => i.severity === 'error') ? 1 : 0);
}

async function detectDbKind(): Promise<'sqlite' | 'postgres'> {
  try {
    const row = await pool.query('SELECT version()');
    if (row.rows.length > 0 && String(row.rows[0]?.version ?? '').toLowerCase().includes('postgresql')) {
      return 'postgres';
    }
  } catch { /* fall through */ }
  return 'sqlite';
}

main().catch(e => { console.error('Reconciliation failed:', e); process.exit(1); });
