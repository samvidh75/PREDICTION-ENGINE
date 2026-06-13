import path from 'path';
import fs from 'fs';
import os from 'os';

const timestamp = Date.now();
const rand = Math.random().toString(36).slice(2, 6);
const TEMP_DB_PATH = path.join(os.tmpdir(), `schema-contract-${timestamp}-${rand}.db`);

function cleanup(): void {
  for (const ext of ['', '-wal', '-shm']) {
    const p = TEMP_DB_PATH + ext;
    if (fs.existsSync(p)) {
      try { fs.unlinkSync(p); } catch { }
    }
  }
}

const PREDICTION_REGISTRY_COLUMNS = [
  'id',
  'symbol',
  'prediction_date',
  'ranking_score',
  'classification',
  'confidence_score',
  'confidence_level',
  'quality_score',
  'growth_score',
  'value_score',
  'momentum_score',
  'risk_score',
  'sector_score',
  'price_at_prediction',
  'benchmark_level',
  'prediction_horizon',
  'validation_status',
  'validated_at',
  'future_return',
  'benchmark_return',
  'alpha',
  'created_at',
  'created_by',
];

const UNIQUE_COLUMNS = ['symbol', 'prediction_date', 'prediction_horizon'];

async function main(): Promise<void> {
  let errors = 0;

  console.log('=== Schema Contract Validation (Isolated) ===\n');
  console.log(`Using temp DB: ${TEMP_DB_PATH}`);

  try {
    process.env.SQLITE_DB_PATH = TEMP_DB_PATH;

    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const sqliteModPath = path.resolve(__dirname, '../src/db/SQLiteAdapter');

    const sqliteMod = await import(sqliteModPath + `?t=${timestamp}`);

    const pool = sqliteMod.pool;

    await pool.query('SELECT 1');

    console.log('\n1. Table presence check for prediction_registry...');
    const tableResult = await pool.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='prediction_registry'"
    );

    if (tableResult.rows.length === 0) {
      console.error('  FAIL: prediction_registry table not found in temp DB');
      errors++;
      process.exitCode = 1;
      return;
    }
    console.log('  PASS: prediction_registry exists');

    console.log('\n2. Column completeness check...');
    const colResult = await pool.query("PRAGMA table_info('prediction_registry')");
    const existingColumns = new Set(colResult.rows.map((r: Record<string, unknown>) => r.name as string));

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
        console.log(`  WARN: unexpected column '${row.name}' found`);
      }
    }

    console.log('\n3. UNIQUE constraint validation...');
    const idxResult = await pool.query("PRAGMA index_list('prediction_registry')");
    const uniqueIndexes = idxResult.rows.filter((r: Record<string, unknown>) => r.unique === 1);

    let uniqueFound = false;
    for (const idx of uniqueIndexes) {
      const idxColResult = await pool.query(
        `PRAGMA index_info(${JSON.stringify(idx.name)})`
      );
      const orderedColumns = (idxColResult.rows as Array<Record<string, unknown>>)
        .sort((a, b) => (a.seqno as number) - (b.seqno as number))
        .map((col) => col.name as string);
      if (JSON.stringify(orderedColumns) === JSON.stringify(UNIQUE_COLUMNS)) {
        uniqueFound = true;
        console.log(`  PASS: UNIQUE constraint on (${UNIQUE_COLUMNS.join(', ')}) confirmed`);
        break;
      }
    }

    if (!uniqueFound) {
      console.error(
        `  FAIL: UNIQUE constraint on (${UNIQUE_COLUMNS.join(', ')}) NOT FOUND`
      );
      errors++;
    }

    if (sqliteMod.closeSQLite) {
      sqliteMod.closeSQLite();
    }

    console.log(`\n=== Validation Complete ===`);
    console.log(`Errors: ${errors}`);

    if (errors === 0) {
      console.log('PASS: Schema contract validation passed (isolated)');
      process.exitCode = 0;
    } else {
      console.error(`FAIL: ${errors} schema contract error(s) found`);
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Schema validation failed with exception:', err);
    process.exitCode = 1;
  } finally {
    cleanup();

    setTimeout(() => {
    }, 100);
  }
}

main();
