const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'stockstory.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

console.log('=== CURRENT DATABASE STATE ===\n');

// Tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('TABLES:');
tables.forEach(t => console.log('  ', t.name));

// Key counts
function safeCount(table) { try { return db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get().c; } catch(e) { return 'ERROR: ' + e.message; } }

console.log('\nKEY COUNTS:');
console.log('  daily_prices:', safeCount('daily_prices'));
console.log('  prediction_registry:', safeCount('prediction_registry'));
console.log('  financial_snapshots:', safeCount('financial_snapshots'));
console.log('  prediction_outcomes:', safeCount('prediction_outcomes'));
console.log('  factor_snapshots:', safeCount('factor_snapshots'));
console.log('  ranking_snapshots:', safeCount('ranking_snapshots'));

// Column check prediction_registry
console.log('\nPREDICTION_REGISTRY SCHEMA:');
try {
  const cols = db.prepare("PRAGMA table_info('prediction_registry')").all();
  cols.forEach(c => console.log(`  ${c.name} (${c.type})`));
} catch (e) {
  console.log('  ERROR:', e.message);
}

// price_at_prediction status
console.log('\nPRICE_AT_PREDICTION COLUMN STATUS:');
try {
  const hasCol = db.prepare("PRAGMA table_info('prediction_registry')").all().some(c => c.name === 'price_at_prediction');
  if (hasCol) {
    const zeroCount = db.prepare('SELECT COUNT(*) as cnt FROM prediction_registry WHERE price_at_prediction = 0').get().cnt;
    const posCount = db.prepare('SELECT COUNT(*) as cnt FROM prediction_registry WHERE price_at_prediction > 0').get().cnt;
    const nullCount = db.prepare('SELECT COUNT(*) as cnt FROM prediction_registry WHERE price_at_prediction IS NULL').get().cnt;
    console.log(`  Column EXISTS`);
    console.log(`  = 0: ${zeroCount}`);
    console.log(`  > 0: ${posCount}`);
    console.log(`  NULL: ${nullCount}`);
  } else {
    console.log('  COLUMN MISSING');
  }
} catch (e) {
  console.log('  ERROR:', e.message);
}

// financial_snapshots schema
console.log('\nFINANCIAL_SNAPSHOTS SCHEMA:');
try {
  const cols = db.prepare("PRAGMA table_info('financial_snapshots')").all();
  cols.forEach(c => console.log(`  ${c.name} (${c.type})`));
  const total = db.prepare('SELECT COUNT(*) as c FROM financial_snapshots').get().c;
  console.log(`  Total rows: ${total}`);
  const withROE = db.prepare('SELECT COUNT(*) as c FROM financial_snapshots WHERE roe IS NOT NULL').get().c;
  console.log(`  With ROE: ${withROE}`);
} catch (e) {
  console.log('  TABLE DOES NOT EXIST:', e.message);
}

// Symbols in daily_prices
const symbolsInPrices = db.prepare('SELECT COUNT(DISTINCT symbol) as cnt FROM daily_prices').get();
console.log('\nUNIQUE SYMBOLS IN daily_prices:', symbolsInPrices.cnt);

// Date range of daily_prices
const dateRange = db.prepare('SELECT MIN(trade_date) as min_d, MAX(trade_date) as max_d FROM daily_prices').get();
console.log('PRICE DATE RANGE:', dateRange.min_d, '->', dateRange.max_d);

// Date range of prediction_registry
try {
  const predRange = db.prepare('SELECT MIN(prediction_date) as min_d, MAX(prediction_date) as max_d FROM prediction_registry').get();
  console.log('PREDICTION DATE RANGE:', predRange.min_d, '->', predRange.max_d);
} catch (e) {
  console.log('PREDICTION DATE RANGE: ERROR -', e.message);
}

// Check for other relevant tables
console.log('\nLOOKING FOR RELEVANT TABLES:');
const relTables = ['data_quality_registry', 'corporate_actions', 'factor_snapshot', 'prediction_outcomes', 'alpha_records'];
for (const t of relTables) {
  const exists = tables.some(tbl => tbl.name === t);
  console.log(`  ${t}: ${exists ? 'EXISTS' : 'MISSING'}`);
}

db.close();
console.log('\n=== CHECK COMPLETE ===');
