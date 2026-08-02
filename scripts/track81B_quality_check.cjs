const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '..', 'data', 'stockstory.db'));

// Check quality_registry schema
console.log('=== quality_registry schema ===');
const qs = db.prepare("PRAGMA table_info('quality_registry')").all();
console.log(qs.map(r => `${r.name} (${r.type})`).join('\n'));

// Sample rows
console.log('\n=== quality_registry sample (5 rows) ===');
const qr = db.prepare('SELECT * FROM quality_registry LIMIT 5').all();
for (const r of qr) {
  console.log(JSON.stringify(r));
}

// Check prediction_registry sample
console.log('\n=== prediction_registry sample (3 rows) ===');
const pr = db.prepare('SELECT * FROM prediction_registry LIMIT 3').all();
for (const r of pr) {
  console.log(JSON.stringify(r));
}

// Count with condition
console.log('\n=== Violation check ===');
const total = db.prepare('SELECT COUNT(*) as c FROM quality_registry q JOIN prediction_registry p ON q.symbol = p.symbol').get();
console.log('total joined pairs:', total.c);
const v = db.prepare('SELECT COUNT(*) as c FROM quality_registry q JOIN prediction_registry p ON q.symbol = p.symbol WHERE q.data_date > p.prediction_date').get();
console.log('where data_date > prediction_date:', v.c);

// Show examples of violating rows
const ex = db.prepare('SELECT q.symbol, q.data_date, p.prediction_date FROM quality_registry q JOIN prediction_registry p ON q.symbol = p.symbol WHERE q.data_date > p.prediction_date LIMIT 5').all();
for (const r of ex) {
  console.log('  ', r.symbol, 'q.data_date:', r.data_date, 'p.prediction_date:', r.prediction_date);
}

db.close();
