/**
 * TRACK-P4B-P3G — Schema Contract Validation (Isolation-Fixed)
 *
 * Verifies the complete prediction_registry contract using the exact
 * temporary SQLiteAdapter DB. Never inspects or mutates data/stockstory.db.
 *
 * Flow:
 *   1. Create tmp/schema-contract-<timestamp>.db
 *   2. Set process.env.SQLITE_DB_PATH = tempPath
 *   3. Dynamically import SQLiteAdapter → triggers schema initialization
 *   4. Inspect exactly tempPath
 *   5. Validate complete prediction_registry columns
 *   6. Validate UNIQUE(symbol, prediction_date, prediction_horizon)
 *   7. Close adapter
 *   8. Delete .db, .db-wal, .db-shm
 *   9. Use process.exitCode (not process.exit())
 *
 * Usage: npx tsx scripts/validate-schema-contract.ts
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import os from 'os';

const timestamp = Date.now();
const rand = Math.random().toString(36).slice(2, 6);
const TEMP_DB_PATH = path.join(os.tmpdir(), `schema-contract-${timestamp}-${rand}.db`);

// ---------------------------------------------------------------------------
// Cleanup helper
// ---------------------------------------------------------------------------

function cleanup(): void {
  for (const ext of ['', '-wal', '-shm']) {
    const p = TEMP_DB_PATH + ext;
    if (fs.existsSync(p)) {
      try { fs.unlinkSync(p); } catch { /* ignore */ }
    }
  }
}

// ---------------------------------------------------------------------------
// Full canonical prediction_registry columns (Phase 8 spec)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// UNIQUE constraint
// ---------------------------------------------------------------------------

const UNIQUE_COLUMNS = ['symbol', 'prediction_date', 'prediction_horizon'];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  let errors = 0;

  console.log('=== Schema Contract Validation (Isolated) ===\n');
  console.log(`Using temp DB: ${TEMP_DB_PATH}`);

  try {
    // Step 1-2: Set env and prepare temp path
    process.env.SQLITE_DB_PATH = TEMP_DB_PATH;

    // Clear any existing SQLite singleton in the module
    // The SQLiteAdapter uses a module-level singleton; we need to reset it
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const sqliteModPath = path.resolve(__dirname, '../src/db/SQLiteAdapter');

    // Step 3: Dynamically import SQLiteAdapter — triggers schema init
    // Need to bust the require cache to force a fresh init
    delete require.cache[require.resolve(sqliteModPath)];

    // Use dynamic import with a fresh cache key
    const sqliteMod = await import(sqliteModPath + `?t=${timestamp}`);

    // Trigger the pool initialization which runs ensureTables()
    const pool = sqliteMod.pool;

    // Give SQLiteAdapter a moment to initialize tables
    await pool.query('SELECT 1');

    // Step 4-5: Inspect the temp DB directly
    const db = new Database(TEMP_DB_PATH);

    console.log('\n1. Table presence check for prediction_registry...');
    const tableCheck = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='prediction_registry'")
      .get() as { name: string } | undefined;

    if (!tableCheck) {
      console.error('  FAIL: prediction_registry table not found in temp DB');
      errors++;
      db.close();
      process.exitCode = 1;
      return;
    }
    console.log('  PASS: prediction_registry exists');

    // Step 5: Validate complete prediction_registry columns
    console.log('\n2. Column completeness check...');
    const colRows = db
      .prepare("PRAGMA table_info('prediction_registry')")
      .all() as Array<{ name: string }>;
    const existingColumns = new Set(colRows.map((r) => r.name));

    for (const col of PREDICTION_REGISTRY_COLUMNS) {
      if (existingColumns.has(col)) {
        console.log(`  PASS: ${col}`);
      } else {
        console.error(`  FAIL: prediction_registry.${col} is MISSING`);
        errors++;
      }
    }

    // Also check for unexpected extra columns (warning only)
    for (const row of colRows) {
      if (!PREDICTION_REGISTRY_COLUMNS.includes(row.name)) {
        console.log(`  WARN: unexpected column '${row.name}' found`);
      }
    }

    // Step 6: Validate UNIQUE constraint on (symbol, prediction_date, prediction_horizon)
    console.log('\n3. UNIQUE constraint validation...');
    const uniqueCheck = db
      .prepare(
        "SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name='prediction_registry' AND name LIKE '%unique%'"
      )
      .all() as Array<{ sql: string }>;

    let uniqueFound = false;
    for (const idx of uniqueCheck) {
      const sql = (idx.sql || '').toUpperCase();
      const allPresent = UNIQUE_COLUMNS.every((col) =>
        sql.includes(col.toUpperCase())
      );
      if (allPresent && sql.includes('UNIQUE')) {
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

    // Step 7: Close the inspection DB
    db.close();

    // Step 8: Close the SQLite adapter and clean up singleton
    if (sqliteMod.closeSQLite) {
      sqliteMod.closeSQLite();
    }

    // Summary
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
    // Step 9: Cleanup temp DB files
    cleanup();

    // Give a tick for any pending operations
    setTimeout(() => {
      // process.exitCode is already set — the process will exit with it
    }, 100);
  }
}

main();
