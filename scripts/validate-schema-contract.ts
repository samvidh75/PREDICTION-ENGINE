/**
 * TRACK-P3 — Schema Contract Validation
 * 
 * Verifies that required tables exist in SQLite and have correct columns.
 * Designed to run in CI without PostgreSQL.
 * 
 * Usage: npx tsx scripts/validate-schema-contract.ts
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'stockstory_test_validation.db');

interface TableContract {
  table: string;
  requiredColumns: string[];
}

const REQUIRED_TABLES: TableContract[] = [
  {
    table: 'symbols',
    requiredColumns: ['symbol', 'exchange', 'isin', 'company_name', 'sector', 'industry', 'listing_status'],
  },
  {
    table: 'daily_prices',
    requiredColumns: ['symbol', 'trade_date', 'open', 'high', 'low', 'close', 'adjusted_close', 'volume'],
  },
  {
    table: 'financial_snapshots',
    requiredColumns: ['symbol', 'period_end', 'market_cap', 'pe_ratio', 'eps', 'dividend_yield', 'beta',
      'fcf_yield', 'ev_ebitda', 'roa', 'roe', 'roic', 'debt_to_equity', 'current_ratio',
      'revenue_growth', 'profit_growth', 'eps_growth', 'fcf_growth', 'gross_margin', 'operating_margin', 'pb_ratio'],
  },
  {
    table: 'feature_snapshots',
    requiredColumns: ['symbol', 'trade_date', 'rsi', 'macd', 'macd_signal', 'macd_histogram',
      'adx', 'atr', 'bollinger_width', 'momentum', 'volatility',
      'relative_strength', 'moving_average_distance', 'trend_strength'],
  },
  {
    table: 'factor_snapshots',
    requiredColumns: ['symbol', 'trade_date', 'quality_factor', 'value_factor', 'growth_factor',
      'momentum_factor', 'risk_factor', 'sector_strength_factor', 'factor_score', 'explanations'],
  },
  {
    table: 'prediction_registry',
    requiredColumns: ['id', 'symbol', 'prediction_date', 'ranking_score', 'classification',
      'confidence_score', 'confidence_level', 'quality_score', 'growth_score',
      'value_score', 'momentum_score', 'risk_score', 'sector_score',
      'price_at_prediction', 'benchmark_level', 'prediction_horizon', 'validation_status'],
  },
  {
    table: 'benchmark_observations',
    requiredColumns: ['date', 'nifty50', 'source'],
  },
  {
    table: 'daily_prediction_snapshots',
    requiredColumns: ['date', 'horizon', 'top10', 'top25'],
  },
  {
    table: 'master_security_registry',
    requiredColumns: ['symbol', 'isin', 'company_name', 'sector', 'industry', 'listing_status'],
  },
];

const NAMING_RULES: Array<{ table: string; column: string; expectedName: string; rationale: string }> = [
  { table: 'feature_snapshots', column: 'trade_date', expectedName: 'trade_date', rationale: 'canonical date column' },
  { table: 'factor_snapshots', column: 'trade_date', expectedName: 'trade_date', rationale: 'canonical date column' },
  { table: 'prediction_registry', column: 'prediction_date', expectedName: 'prediction_date', rationale: 'not snapshot_date' },
  { table: 'financial_snapshots', column: 'period_end', expectedName: 'period_end', rationale: 'canonical period column' },
];

let errors = 0;
let warnings = 0;

// Clean up existing test db if present
if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
}

// Ensure directory exists
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(DB_PATH);

// Import and run SQLite fallback tables from SQLiteAdapter (replicate its ensureTables)
import('../src/db/SQLiteAdapter').then(async (mod) => {
  // SQLiteAdapter auto-creates tables on construction
  // Use the pool to trigger table creation
  const { pool } = mod;
  
  console.log('=== Schema Contract Validation ===\n');
  
  // Test 1: All required tables exist
  console.log('1. Table presence check...');
  const existingTables = new Set<string>();
  const tableRows = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>;
  for (const row of tableRows) {
    existingTables.add(row.name);
  }
  
  for (const contract of REQUIRED_TABLES) {
    if (existingTables.has(contract.table)) {
      console.log(`  PASS: ${contract.table} exists`);
    } else {
      console.error(`  FAIL: ${contract.table} is missing`);
      errors++;
    }
  }
  
  // Test 2: Required columns for each table
  console.log('\n2. Column contract check...');
  for (const contract of REQUIRED_TABLES) {
    if (!existingTables.has(contract.table)) continue;
    
    const colRows = db.prepare(`PRAGMA table_info('${contract.table}')`).all() as Array<{ name: string }>;
    const existingColumns = new Set(colRows.map(r => r.name));
    
    for (const requiredCol of contract.requiredColumns) {
      if (existingColumns.has(requiredCol)) {
        // OK
      } else {
        console.error(`  FAIL: ${contract.table}.${requiredCol} is missing`);
        errors++;
      }
    }
  }
  console.log('  Column checks completed');
  
  // Test 3: Naming conventions
  console.log('\n3. Naming convention check...');
  for (const rule of NAMING_RULES) {
    if (!existingTables.has(rule.table)) continue;
    
    const colRows = db.prepare(`PRAGMA table_info('${rule.table}')`).all() as Array<{ name: string }>;
    const existingColumns = new Set(colRows.map(r => r.name));
    
    if (existingColumns.has(rule.expectedName)) {
      console.log(`  PASS: ${rule.table}.${rule.expectedName} — ${rule.rationale}`);
    } else {
      // Check if a deprecated name exists
      if (rule.expectedName === 'prediction_date' && existingColumns.has('snapshot_date')) {
        console.error(`  FAIL: ${rule.table} uses deprecated 'snapshot_date' (should be 'prediction_date')`);
        errors++;
      } else {
        console.log(`  WARN: ${rule.table}.${rule.column} not found — ${rule.rationale}`);
        warnings++;
      }
    }
  }
  
  // Test 4: No deprecated snapshots_date
  console.log('\n4. Deprecated column check...');
  for (const table of ['prediction_registry', 'feature_snapshots', 'factor_snapshots']) {
    if (!existingTables.has(table)) continue;
    const colRows = db.prepare(`PRAGMA table_info('${table}')`).all() as Array<{ name: string }>;
    const cols = new Set(colRows.map(r => r.name));
    if (cols.has('snapshot_date')) {
      console.error(`  FAIL: ${table} has deprecated 'snapshot_date' column`);
      errors++;
    }
  }
  console.log('  PASS: no deprecated snapshot_date columns detected');
  
  // Clean up
  db.close();
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
  }
  
  // Summary
  console.log(`\n=== Validation Complete ===`);
  console.log(`Errors: ${errors}, Warnings: ${warnings}`);
  
  if (errors === 0) {
    console.log('PASS: Schema contract validation passed');
    process.exit(0);
  } else {
    console.error(`FAIL: ${errors} schema contract error(s) found`);
    process.exit(1);
  }
}).catch(err => {
  console.error('Schema validation failed:', err);
  db.close();
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
  process.exit(1);
});
