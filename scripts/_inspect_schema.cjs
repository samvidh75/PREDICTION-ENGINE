const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, '..', 'data', 'stockstory.db');
const db = new Database(dbPath);

console.log('=== prediction_registry columns ===');
const cols = db.prepare("PRAGMA table_info('prediction_registry')").all();
cols.forEach(c => console.log(`  ${c.name} (${c.type})`));

console.log('');
console.log('=== First 3 rows of prediction_registry ===');
const rows = db.prepare('SELECT * FROM prediction_registry LIMIT 3').all();
console.log(JSON.stringify(rows, null, 2));

console.log('');
console.log('=== Count of predictions with price_at_prediction = 0 vs > 0 ===');
const zeroCount = db.prepare('SELECT COUNT(*) as cnt FROM prediction_registry WHERE price_at_prediction = 0').get();
const posCount = db.prepare('SELECT COUNT(*) as cnt FROM prediction_registry WHERE price_at_prediction > 0').get();
const nullCount = db.prepare('SELECT COUNT(*) as cnt FROM prediction_registry WHERE price_at_prediction IS NULL').get();
console.log(`price_at_prediction = 0: ${zeroCount.cnt}`);
console.log(`price_at_prediction > 0: ${posCount.cnt}`);
console.log(`price_at_prediction IS NULL: ${nullCount.cnt}`);

console.log('');
console.log('=== Total predictions ===');
const total = db.prepare('SELECT COUNT(*) as cnt FROM prediction_registry').get();
console.log(`Total: ${total.cnt}`);

console.log('');
console.log('=== Distinct prediction_horizon values ===');
const horizons = db.prepare('SELECT prediction_horizon, COUNT(*) as cnt FROM prediction_registry GROUP BY prediction_horizon ORDER BY prediction_horizon').all();
console.table(horizons);

console.log('');
console.log('=== validation_status distribution ===');
const statuses = db.prepare('SELECT validation_status, COUNT(*) as cnt FROM prediction_registry GROUP BY validation_status').all();
console.table(statuses);

console.log('');
console.log('=== daily_prices columns ===');
const dpCols = db.prepare("PRAGMA table_info('daily_prices')").all();
dpCols.forEach(c => console.log(`  ${c.name} (${c.type})`));

console.log('');
console.log('=== daily_prices date range ===');
const dateRange = db.prepare('SELECT MIN(trade_date) as min_date, MAX(trade_date) as max_date, COUNT(*) as cnt FROM daily_prices').get();
console.log(`Min: ${dateRange.min_date}, Max: ${dateRange.max_date}, Rows: ${dateRange.cnt}`);

console.log('');
console.log('=== Existing tables in DB ===');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
tables.forEach(t => console.log(`  ${t.name}`));

db.close();