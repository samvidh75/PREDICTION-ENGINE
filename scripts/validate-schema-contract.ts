/**
 * TRACK-P4B-P3H — Schema Contract Validation (Hardened)
 *
 * Verifies the complete prediction_registry contract using a temporary
 * SQLiteAdapter DB. Never inspects or mutates data/stockstory.db.
 */
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import os from 'os';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const TIMESTAMP = Date.now();
const RAND = Math.random().toString(36).slice(2, 6);
const TEMP_DB_PATH = path.join(os.tmpdir(), `schema-contract-${TIMESTAMP}-${RAND}.db`);

// ---------------------------------------------------------------------------
// Canonical prediction_registry columns
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

const UNIQUE_COLUMNS = ['symbol', 'prediction_date', 'prediction_horizon'];

// ---------------------------------------------------------------------------
// Cleanup
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
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  let errors = 0;

  console.log('=== Schema Contract Validation (Hardened) ===\n');
  console.log(`Temp DB: ${TEMP_DB_PATH}`);

  try {
    // Step 1: Set SQLITE_DB_PATH and create the adapter
    process.env.SQLITE_DB_PATH = TEMP_DB_PATH;
    process.env.NODE_ENV = 'test';
    process.env.DB_ADAPTER = 'sqlite';
    delete process.env.DATABASE_URL;

    // Step 2: Dynamically import DatabaseAdapter and initialize
    const { dbAdapter } = await import('../src/db/DatabaseAdapter.js');
    await dbAdapter.initialize();

    // Step 3: Give SQLiteAdapter time to create tables, then inspect
    const db = new Database(TEMP_DB_PATH);

    // ---- Validate table presence ----
    console.log('1. Table presence...');
    const tableCheck = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='prediction_registry'")
      .get() as { name: string } | undefined;

    if (!tableCheck) {
      console.error('   FAIL: prediction_registry table not found');
      errors++;
      db.close();
      await dbAdapter.shutdown();
      process.exitCode = 1;
      return;
    }
    console.log('   PASS: prediction_registry table found');

    // ---- Validate columns ----
    console.log('\n2. Column completeness...');
    const colRows = db.prepare("PRAGMA table_info('prediction_registry')").all() as Array<{ name: string }>;
    const existingColumns = new Set(colRows.map((r) => r.name));

    for (const col of PREDICTION_REGISTRY_COLUMNS) {
      if (existingColumns.has(col)) {
        console.log(`   PASS: ${col}`);
      } else {
        console.error(`   FAIL: prediction_registry.${col} is MISSING`);
        errors++;
      }
    }

    // Warn on unexpected columns
    for (const row of colRows) {
      if (!PREDICTION_REGISTRY_COLUMNS.includes(row.name)) {
        console.log(`   WARN: unexpected column '${row.name}' found`);
      }
    }

    // ---- Validate UNIQUE constraint ----
    console.log('\n3. UNIQUE constraint validation...');

    // Use PRAGMA index_list to find unique indexes
    const indexList = db.prepare("PRAGMA index_list('prediction_registry')").all() as Array<{
      seq: number;
      name: string;
      unique: number;
      origin: string;
      partial: number;
    }>;

    const uniqueIndexes = indexList.filter((idx) => idx.unique === 1);

    if (uniqueIndexes.length === 0) {
      console.error('   FAIL: No UNIQUE indexes found on prediction_registry');
      errors++;
    }

    let uniqueMatched = false;
    for (const idx of uniqueIndexes) {
      // Use PRAGMA index_info to get columns for each unique index
      const indexInfo = db.prepare(`PRAGMA index_info('${idx.name}')`).all() as Array<{
        seqno: number;
        cid: number;
        name: string;
      }>;

      const indexedColumns = indexInfo.map((i) => i.name).sort();
      const expectedSorted = [...UNIQUE_COLUMNS].sort();

      if (indexedColumns.length === expectedSorted.length &&
          indexedColumns.every((col, i) => col === expectedSorted[i])) {
        uniqueMatched = true;
        console.log(`   PASS: UNIQUE on (${indexedColumns.join(', ')}) via index '${idx.name}'`);
        break;
      }
    }

    if (!uniqueMatched) {
      console.error(`   FAIL: UNIQUE constraint on (${UNIQUE_COLUMNS.join(', ')}) NOT FOUND`);
      if (uniqueIndexes.length > 0) {
        console.error('   Existing unique indexes:');
        for (const idx of uniqueIndexes) {
          const info = db.prepare(`PRAGMA index_info('${idx.name}')`).all() as Array<{ name: string }>;
          console.error(`     ${idx.name}: (${info.map((i) => i.name).join(', ')})`);
        }
      }
      errors++;
    }

    // Step 4: Close inspection DB
    db.close();

    // Step 5: Close SQLiteAdapter
    await dbAdapter.shutdown();
    // Also close the SQLite singleton directly to ensure clean state
    const { closeSQLite } = await import('../src/db/SQLiteAdapter.js');
    closeSQLite();

    // ---- Summary ----
    console.log(`\n=== Validation Complete ===`);
    console.log(`Errors: ${errors}`);

    if (errors === 0) {
      console.log('PASS: Schema contract validation passed');
    } else {
      console.error(`FAIL: ${errors} schema contract error(s) found`);
    }

    process.exitCode = errors > 0 ? 1 : 0;

  } catch (err) {
    console.error('Schema validation failed with exception:', err);
    process.exitCode = 1;
  } finally {
    cleanup();
  }
}

main();
