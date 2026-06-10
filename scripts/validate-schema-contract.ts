/**
 * TRACK-P4B-P3G — Schema Contract Validation (sql.js)
 *
 * Verifies prediction_registry contract using the sql.js-backed SQLiteAdapter.
 * Never imports better-sqlite3. Uses temp DB via resetForTest.
 *
 * Usage: npx tsx scripts/validate-schema-contract.ts
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

const timestamp = Date.now();
const rand = Math.random().toString(36).slice(2, 6);
const TEMP_DB_PATH = path.join(os.tmpdir(), `schema-contract-${timestamp}-${rand}.db`);

function cleanup(): void {
  for (const ext of ['', '-wal', '-shm']) {
    const p = TEMP_DB_PATH + ext;
    if (fs.existsSync(p)) {
      try { fs.unlinkSync(p); } catch { /* ignore */ }
    }
  }
}

const PREDICTION_REGISTRY_COLUMNS = [
  'id', 'symbol', 'prediction_date', 'ranking_score', 'classification',
  'confidence_score', 'confidence_level', 'quality_score', 'growth_score',
  'value_score', 'momentum_score', 'risk_score', 'sector_score',
  'price_at_prediction', 'benchmark_level', 'prediction_horizon',
  'validation_status', 'validated_at', 'future_return', 'benchmark_return',
  'alpha', 'created_at', 'created_by',
];

const UNIQUE_COLUMNS = ['symbol', 'prediction_date', 'prediction_horizon'];

async function main(): Promise<void> {
  let errors = 0;
  console.log('=== Schema Contract Validation (sql.js) ===\n');
  console.log(`Using temp DB: ${TEMP_DB_PATH}`);

  try {
    process.env.SQLITE_DB_PATH = TEMP_DB_PATH;
    const sqliteMod = await import('../src/db/SQLiteAdapter');
    if (sqliteMod.resetForTest) sqliteMod.resetForTest(TEMP_DB_PATH);

    const pool = sqliteMod.pool;
    await pool.query('SELECT 1 AS one');

    console.log('\n1. Table check: prediction_registry...');
    const tableResult = await pool.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=$1",
      ['prediction_registry']
    );
    if (tableResult.rows.length === 0) {
      console.error('  FAIL: prediction_registry not found');
      errors++;
      if (sqliteMod.closeSQLite) sqliteMod.closeSQLite();
      process.exitCode = 1;
      return;
    }
    console.log('  PASS: prediction_registry exists');

    console.log('\n2. Column completeness...');
    const colResult = await pool.query("PRAGMA table_info('prediction_registry')");
    const existingColumns = new Set(colResult.rows.map((r: any) => r.name));

    for (const col of PREDICTION_REGISTRY_COLUMNS) {
      if (existingColumns.has(col)) {
        console.log(`  PASS: ${col}`);
      } else {
        console.error(`  FAIL: prediction_registry.${col} is MISSING`);
        errors++;
      }
    }

    for (const row of colResult.rows) {
      if (!PREDICTION_REGISTRY_COLUMNS.includes(row.name as string)) {
        console.log(`  WARN: unexpected column '${row.name}'`);
      }
    }

    console.log('\n3. UNIQUE constraint...');
    const idxResult = await pool.query(
      "SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name='prediction_registry' AND name LIKE $1",
      ['%unique%']
    );
    let uniqueFound = false;
    for (const row of idxResult.rows) {
      const sql = ((row.sql as string) || '').toUpperCase();
      const allPresent = UNIQUE_COLUMNS.every(c => sql.includes(c.toUpperCase()));
      if (allPresent && sql.includes('UNIQUE')) {
        uniqueFound = true;
        console.log(`  PASS: UNIQUE on (${UNIQUE_COLUMNS.join(', ')})`);
        break;
      }
    }
    if (!uniqueFound) {
      console.error(`  FAIL: UNIQUE constraint on (${UNIQUE_COLUMNS.join(', ')}) NOT FOUND`);
      errors++;
    }

    if (sqliteMod.closeSQLite) sqliteMod.closeSQLite();

    console.log(`\n=== Validation Complete ===`);
    console.log(`Errors: ${errors}`);
    if (errors === 0) {
      console.log('PASS: Schema contract validation passed');
      process.exitCode = 0;
    } else {
      console.error(`FAIL: ${errors} schema contract error(s)`);
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Schema validation exception:', err);
    process.exitCode = 1;
  } finally {
    cleanup();
  }
}

main();
