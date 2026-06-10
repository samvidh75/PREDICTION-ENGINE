/**
 * TRACK-P4B-P3G — Schema Contract Validation (sql.js)
 *
 * Verifies prediction_registry contract using the sql.js-backed SQLiteAdapter.
 * Never imports better-sqlite3. Uses temp DB via resetForTest.
 *
 * Usage: npx tsx scripts/validate-schema-contract.ts
 */
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

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

const PREDICTION_REGISTRY_COLUMNS: string[] = [
  'id', 'symbol', 'prediction_date', 'ranking_score', 'classification',
  'confidence_score', 'confidence_level', 'quality_score', 'growth_score',
  'value_score', 'momentum_score', 'risk_score', 'sector_score',
  'price_at_prediction', 'benchmark_level', 'prediction_horizon',
  'validation_status', 'validated_at', 'future_return', 'benchmark_return',
  'alpha', 'created_at', 'created_by',
];

const UNIQUE_COLUMNS: string[] = ['symbol', 'prediction_date', 'prediction_horizon'];

async function main(): Promise<void> {
  let errors = 0;
  console.log('=== Schema Contract Validation (sql.js) ===\n');
  console.log(`Using temp DB: ${TEMP_DB_PATH}`);

  try {
    // 1 & 2 — Set temp DB path
    process.env.SQLITE_DB_PATH = TEMP_DB_PATH;

    // 3 — Dynamically import SQLiteAdapter
    const sqliteMod = await import('../src/db/SQLiteAdapter');

    // 4 — Reset for test with temp path
    await sqliteMod.resetForTest(TEMP_DB_PATH);

    // 5 — Trigger schema init
    const pool = sqliteMod.pool;
    await pool.query('SELECT 1 AS one');

    // 6 — Inspect table structure
    console.log('\n1. Table check: prediction_registry...');
    const tableResult = await pool.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='prediction_registry'"
    );
    if (tableResult.rows.length === 0) {
      console.error('  FAIL: prediction_registry not found');
      errors++;
      await sqliteMod.closeSQLite();
      process.exitCode = 1;
      return;
    }
    console.log('  PASS: prediction_registry exists');

    // 6 — Column completeness via PRAGMA table_info
    console.log('\n2. Column completeness...');
    const colResult = await pool.query("PRAGMA table_info('prediction_registry')");
    const existingColumns = new Set<string>(colResult.rows.map((r: Record<string, unknown>) => r.name as string));

    for (const col of PREDICTION_REGISTRY_COLUMNS) {
      if (existingColumns.has(col)) {
        console.log(`  PASS: ${col}`);
      } else {
        console.error(`  FAIL: prediction_registry.${col} is MISSING`);
        errors++;
      }
    }

    for (const row of colResult.rows) {
      const rowName = row.name as string;
      if (!PREDICTION_REGISTRY_COLUMNS.includes(rowName)) {
        console.log(`  WARN: unexpected column '${rowName}'`);
      }
    }

    // 7 — Inspect unique indexes via PRAGMA index_list
    console.log('\n3. Unique indexes...');
    const indexListResult = await pool.query("PRAGMA index_list('prediction_registry')");
    const uniqueIndexes = indexListResult.rows.filter((r: Record<string, unknown>) => r.unique === 1);

    if (uniqueIndexes.length === 0) {
      console.error('  FAIL: No unique indexes found on prediction_registry');
      errors++;
    }

    // 8 — For each unique index, query PRAGMA index_info
    let uniqueConstraintFound = false;
    for (const idx of uniqueIndexes) {
      const idxName: string = idx.name as string;
      const indexInfoResult = await pool.query(`PRAGMA index_info('${idxName}')`);
      const indexedColumns: string[] = indexInfoResult.rows.map((r: Record<string, unknown>) => r.name as string);

      console.log(`  Index '${idxName}' columns: [${indexedColumns.join(', ')}]`);

      const allPresent = UNIQUE_COLUMNS.every(
        col => indexedColumns.map(c => c.toLowerCase()).includes(col.toLowerCase())
      );
      if (allPresent && indexedColumns.length === UNIQUE_COLUMNS.length) {
        uniqueConstraintFound = true;
      }
    }

    // 10 — Verify UNIQUE(symbol, prediction_date, prediction_horizon)
    if (uniqueConstraintFound) {
      console.log(`  PASS: UNIQUE on (${UNIQUE_COLUMNS.join(', ')})`);
    } else {
      console.error(`  FAIL: UNIQUE constraint on (${UNIQUE_COLUMNS.join(', ')}) NOT FOUND`);
      errors++;
    }

    // 11 — Close
    await sqliteMod.closeSQLite();

    console.log('\n=== Validation Complete ===');
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
    // 12 — Delete temp DB, WAL, SHM files
    cleanup();
  }
  // 13 — Use process.exitCode, NOT process.exit()
}

main();