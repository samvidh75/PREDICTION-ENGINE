/**
 * TRACK-P4B-P3G — Schema Contract Validation
 *
 * Validates the complete prediction_registry schema contract against an
 * isolated temporary SQLite database. Never inspects or mutates data/stockstory.db.
 *
 * Flow:
 *   1. Create tmp/schema-contract-<timestamp>.db
 *   2. Set SQLITE_DB_PATH to the temp path
 *   3. Dynamically import SQLiteAdapter to trigger schema initialization
 *   4. Inspect exactly the temp path
 *   5. Validate complete prediction_registry columns
 *   6. Validate UNIQUE(symbol, prediction_date, prediction_horizon)
 *   7. Close adapter and clean up .db, .db-wal, .db-shm
 *   8. Use process.exitCode — never process.exit() before cleanup
 *
 * Usage: npx tsx scripts/validate-schema-contract.ts
 */
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import os from 'os';

const TIMESTAMP = Date.now();
const TEMP_DB_PATH = path.join(os.tmpdir(), `schema-contract-${TIMESTAMP}.db`);

interface ValidationError {
  table: string;
  column?: string;
  message: string;
}

const errors: ValidationError[] = [];
let db: Database.Database | null = null;

function cleanup(): void {
  if (db) {
    try { db.close(); } catch { /* ignore */ }
    db = null;
  }
  for (const ext of ['', '-wal', '-shm']) {
    const p = TEMP_DB_PATH + ext;
    if (fs.existsSync(p)) {
      try { fs.unlinkSync(p); } catch { /* ignore */ }
    }
  }
}

async function main(): Promise<void> {
  try {
    // Step 1: Ensure temp db does not exist from a previous run
    cleanup();

    // Step 2: Set env var to use temp path
    process.env.SQLITE_DB_PATH = TEMP_DB_PATH;

    // Step 3: Dynamically import SQLiteAdapter to trigger schema initialization
    // This will create the temp DB and run ensureTables()
    const sqliteMod = await import('../src/db/SQLiteAdapter');
    // The pool singleton auto-creates tables on construction
    // Just accessing it triggers the side effect
    void sqliteMod.pool;

    // Step 4: Open the temp DB directly with better-sqlite3 for inspection
    db = new Database(TEMP_DB_PATH);

    console.log('=== Schema Contract Validation ===\n');
    console.log(`Using isolated temp DB: ${TEMP_DB_PATH}\n`);

    // Step 5: Validate complete prediction_registry columns
    console.log('1. prediction_registry column contract check...');

    const requiredColumns = [
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

    // Check table exists
    const tableRows = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='prediction_registry'").all() as Array<{ name: string }>;
    if (tableRows.length === 0) {
      errors.push({ table: 'prediction_registry', message: 'Table prediction_registry does not exist' });
    } else {
      const colRows = db.prepare("PRAGMA table_info('prediction_registry')").all() as Array<{ name: string; type: string }>;
      const existingColumns = new Set(colRows.map(r => r.name));
      const columnTypes = new Map(colRows.map(r => [r.name, r.type]));

      for (const col of requiredColumns) {
        if (existingColumns.has(col)) {
          console.log(`  PASS: prediction_registry.${col}`);
        } else {
          const err: ValidationError = { table: 'prediction_registry', column: col, message: `Column ${col} is missing` };
          errors.push(err);
          console.error(`  FAIL: prediction_registry.${col} is missing`);
        }
      }

      // Verify column types for key columns
      const expectedTypes: Record<string, string> = {
        symbol: 'TEXT',
        prediction_date: 'TEXT',
        classification: 'TEXT',
        confidence_level: 'TEXT',
        validation_status: 'TEXT',
        created_by: 'TEXT',
      };

      for (const [col, expectedType] of Object.entries(expectedTypes)) {
        const actualType = columnTypes.get(col);
        if (actualType && actualType !== expectedType) {
          console.warn(`  WARN: prediction_registry.${col} type is ${actualType} (expected ${expectedType})`);
        }
      }
    }

    // Step 6: Validate UNIQUE constraint
    console.log('\n2. UNIQUE constraint validation...');
    try {
      // Insert a row
      db.prepare(`
        INSERT INTO prediction_registry
        (symbol, prediction_date, ranking_score, classification,
         confidence_score, confidence_level, quality_score, growth_score,
         value_score, momentum_score, risk_score, sector_score, prediction_horizon)
        VALUES ('UNIQUE_VALIDATOR', '2025-01-01', 80, 'Good', 0.75, 'Medium',
         70, 60, 80, 50, 40, 65, 30)
      `).run();

      // Attempt duplicate insert
      try {
        db.prepare(`
          INSERT INTO prediction_registry
          (symbol, prediction_date, ranking_score, classification,
           confidence_score, confidence_level, quality_score, growth_score,
           value_score, momentum_score, risk_score, sector_score, prediction_horizon)
          VALUES ('UNIQUE_VALIDATOR', '2025-01-01', 80, 'Good', 0.75, 'Medium',
           70, 60, 80, 50, 40, 65, 30)
        `).run();
        errors.push({ table: 'prediction_registry', message: 'UNIQUE(symbol, prediction_date, prediction_horizon) not enforced' });
        console.error('  FAIL: UNIQUE constraint not enforced');
      } catch {
        console.log('  PASS: UNIQUE(symbol, prediction_date, prediction_horizon) enforced');
      }
    } catch (err: unknown) {
      errors.push({ table: 'prediction_registry', message: `UNIQUE test failed: ${err instanceof Error ? err.message : String(err)}` });
    }

    // Validate CHECK constraint on classification
    console.log('\n3. CHECK constraint validation...');
    try {
      db.prepare(`
        INSERT INTO prediction_registry
        (symbol, prediction_date, ranking_score, classification,
         confidence_score, confidence_level, quality_score, growth_score,
         value_score, momentum_score, risk_score, sector_score, prediction_horizon)
        VALUES ('CHECK_VALIDATOR', '2025-02-01', 80, 'InvalidClass', 0.75, 'Medium',
         70, 60, 80, 50, 40, 65, 30)
      `).run();
      errors.push({ table: 'prediction_registry', column: 'classification', message: 'CHECK constraint on classification not enforced' });
      console.error('  FAIL: classification CHECK constraint not enforced');
    } catch {
      console.log('  PASS: classification CHECK constraint enforced');
    }

    // Validate CHECK constraint on prediction_horizon
    try {
      db.prepare(`
        INSERT INTO prediction_registry
        (symbol, prediction_date, ranking_score, classification,
         confidence_score, confidence_level, quality_score, growth_score,
         value_score, momentum_score, risk_score, sector_score, prediction_horizon)
        VALUES ('CHECK_HZN', '2025-03-01', 80, 'Good', 0.75, 'Medium',
         70, 60, 80, 50, 40, 65, 999)
      `).run();
      errors.push({ table: 'prediction_registry', column: 'prediction_horizon', message: 'CHECK constraint on prediction_horizon not enforced' });
      console.error('  FAIL: prediction_horizon CHECK constraint not enforced');
    } catch {
      console.log('  PASS: prediction_horizon CHECK constraint enforced');
    }

    // Validate DEFAULT values
    console.log('\n4. DEFAULT value validation...');
    try {
      db.prepare(`
        INSERT INTO prediction_registry
        (symbol, prediction_date, ranking_score, classification,
         confidence_score, confidence_level, quality_score, growth_score,
         value_score, momentum_score, risk_score, sector_score, prediction_horizon)
        VALUES ('DEFAULT_VALIDATOR', '2025-04-01', 80, 'Good', 0.75, 'Medium',
         70, 60, 80, 50, 40, 65, 7)
      `).run();

      const row = db.prepare(
        "SELECT created_at, created_by FROM prediction_registry WHERE symbol = 'DEFAULT_VALIDATOR'"
      ).get() as { created_at: string; created_by: string };

      if (row.created_at) {
        console.log('  PASS: created_at populated by default');
      } else {
        errors.push({ table: 'prediction_registry', column: 'created_at', message: 'created_at default not set' });
        console.error('  FAIL: created_at default not set');
      }

      if (row.created_by === 'DailyPredictionCapture') {
        console.log('  PASS: created_by defaults to DailyPredictionCapture');
      } else {
        errors.push({
          table: 'prediction_registry',
          column: 'created_by',
          message: `created_by defaults to "${row.created_by}" (expected "DailyPredictionCapture")`,
        });
        console.error(`  FAIL: created_by default is "${row.created_by}"`);
      }
    } catch (err: unknown) {
      errors.push({ table: 'prediction_registry', message: `DEFAULT test failed: ${err instanceof Error ? err.message : String(err)}` });
    }

    // Summary
    console.log('\n=== Validation Complete ===');
    console.log(`Errors: ${errors.length}`);

    if (errors.length === 0) {
      console.log('PASS: Schema contract validation passed');
    } else {
      console.error(`FAIL: ${errors.length} schema contract error(s) found`);
      for (const e of errors) {
        console.error(`  - ${e.table}${e.column ? '.' + e.column : ''}: ${e.message}`);
      }
    }

    // Step 7-8: Cleanup and set exit code
    cleanup();
    process.exitCode = errors.length === 0 ? 0 : 1;

  } catch (err: unknown) {
    console.error('Schema validation failed with unexpected error:', err);
    cleanup();
    process.exitCode = 1;
  }
}

main();
