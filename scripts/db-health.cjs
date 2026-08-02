/**
 * TRACK-38 — Database Health Check
 * Queries real row counts from the SQLite database.
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'stockstory.db');

console.log('=== TRACK-38 DATABASE HEALTH CHECK ===\n');
console.log('DB Path:', DB_PATH);
console.log('DB Exists:', fs.existsSync(DB_PATH));

if (!fs.existsSync(DB_PATH)) {
  console.error('DATABASE FILE NOT FOUND!');
  process.exit(1);
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

const tables = [
  'daily_prices',
  'financial_snapshots',
  'feature_snapshots',
  'factor_snapshots',
  'prediction_registry',
  'symbols',
  'master_security_registry',
  'benchmark_observations',
  'daily_prediction_snapshots',
];

console.log('\n--- TABLE ROW COUNTS ---');
let totalRows = 0;
for (const table of tables) {
  try {
    const result = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
    const count = result.count;
    totalRows += count;
    const indicator = count > 0 ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
    console.log(`  ${indicator} ${table}: ${count.toLocaleString()} rows`);
  } catch (e) {
    console.log(`  \x1b[33m?\x1b[0m ${table}: TABLE DOES NOT EXIST`);
  }
}

console.log(`\n  TOTAL: ${totalRows.toLocaleString()} rows across all tables`);

// Sample data from daily_prices
console.log('\n--- SAMPLE: daily_prices (latest 3) ---');
try {
  const samples = db.prepare('SELECT * FROM daily_prices ORDER BY trade_date DESC LIMIT 3').all();
  if (samples.length > 0) {
    for (const row of samples) {
      console.log(' ', JSON.stringify(row));
    }
  } else {
    console.log('  (no data)');
  }
} catch (e) {
  console.log('  Error:', e.message);
}

// Sample from financial_snapshots
console.log('\n--- SAMPLE: financial_snapshots (latest 3) ---');
try {
  const samples = db.prepare('SELECT symbol, period_end, market_cap, pe_ratio, eps FROM financial_snapshots ORDER BY period_end DESC LIMIT 3').all();
  if (samples.length > 0) {
    for (const row of samples) {
      console.log(' ', JSON.stringify(row));
    }
  } else {
    console.log('  (no data)');
  }
} catch (e) {
  console.log('  Error:', e.message);
}

// Distinct symbols
console.log('\n--- DISTINCT SYMBOLS ---');
for (const table of ['daily_prices', 'financial_snapshots', 'feature_snapshots', 'factor_snapshots']) {
  try {
    const result = db.prepare(`SELECT COUNT(DISTINCT symbol) as count FROM ${table}`).get();
    console.log(`  ${table}: ${result.count} distinct symbols`);
    if (result.count > 0 && result.count <= 10) {
      const syms = db.prepare(`SELECT DISTINCT symbol FROM ${table}`).all();
      console.log('    Symbols:', syms.map(s => s.symbol).join(', '));
    }
  } catch {}
}

console.log('\n--- DATE RANGES ---');
for (const table of ['daily_prices', 'financial_snapshots', 'feature_snapshots', 'factor_snapshots']) {
  try {
    const dateCol = table === 'daily_prices' ? 'trade_date' : table === 'financial_snapshots' ? 'period_end' : 'snapshot_date';
    const min = db.prepare(`SELECT MIN(${dateCol}) as min_date, MAX(${dateCol}) as max_date FROM ${table}`).get();
    if (min.min_date) {
      console.log(`  ${table}: ${min.min_date} → ${min.max_date}`);
    } else {
      console.log(`  ${table}: no date range (empty)`);
    }
  } catch {}
}

db.close();
console.log('\n=== HEALTH CHECK COMPLETE ===');
