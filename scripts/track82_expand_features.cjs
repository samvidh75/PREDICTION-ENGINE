/**
 * TRACK-82 Phase 1 — Expand feature_snapshots from factor_snapshots
 * factor_snapshots (9 cols) -> feature_snapshots (16 cols)
 * Only copy matching columns; leave derived feature columns NULL.
 */
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'data', 'stockstory.db'));

console.log('Before:');
console.log(db.prepare('SELECT COUNT(DISTINCT symbol) AS c FROM feature_snapshots').get().c + ' symbols');
console.log(db.prepare('SELECT COUNT(*) AS c FROM feature_snapshots').get().c + ' rows');

// Get factor_snapshots columns
const factorCols = db.pragma('table_info(factor_snapshots)').map(c => c.name);
console.log(`\nfactor_snapshots cols (${factorCols.length}): ${factorCols.join(', ')}`);

// Get feature_snapshots columns  
const featCols = db.pragma('table_info(feature_snapshots)').map(c => c.name);
console.log(`feature_snapshots cols (${featCols.length}): ${featCols.join(', ')}`);

// Find matching columns (intersection of factor and feature, excluding 'id' autoinc)
const matchingCols = factorCols.filter(c => c !== 'id' && featCols.includes(c));
console.log(`\nMatching columns (${matchingCols.length}): ${matchingCols.join(', ')}`);

// Find which symbols are missing
const featureSymbols = new Set(
  db.prepare('SELECT DISTINCT symbol FROM feature_snapshots').all().map(r => r.symbol)
);

const factorSymbols = db.prepare(
  'SELECT DISTINCT symbol, MAX(trade_date) as latest FROM factor_snapshots GROUP BY symbol'
).all();

const missing = factorSymbols.filter(f => !featureSymbols.has(f.symbol));
console.log(`\nSymbols to add: ${missing.length}`);

// Insert using explicit column mapping
let inserted = 0;
let errors = 0;

for (const { symbol, latest } of missing) {
  // Get the latest factor row
  const factorRow = db.prepare(
    `SELECT ${matchingCols.join(', ')} FROM factor_snapshots WHERE symbol = ? AND trade_date = ? LIMIT 1`
  ).get(symbol, latest);

  if (!factorRow) { errors++; continue; }

  const values = matchingCols.map(c => factorRow[c]);
  const placeholders = matchingCols.map(() => '?').join(', ');

  try {
    db.prepare(`INSERT INTO feature_snapshots (${matchingCols.join(', ')}) VALUES (${placeholders})`)
      .run(...values);
    inserted++;
  } catch (e) {
    errors++;
    if (errors <= 3) console.error(`  ${symbol}: ${e.message.substring(0, 80)}`);
  }
}

console.log(`\nInserted: ${inserted}, Errors: ${errors}`);

// Verify
console.log('\nAfter:');
console.log(db.prepare('SELECT COUNT(DISTINCT symbol) AS c FROM feature_snapshots').get().c + ' symbols');
console.log(db.prepare('SELECT COUNT(*) AS c FROM feature_snapshots').get().c + ' rows');
console.log('Latest: ' + db.prepare('SELECT MAX(trade_date) AS d FROM feature_snapshots').get().d);

db.close();
