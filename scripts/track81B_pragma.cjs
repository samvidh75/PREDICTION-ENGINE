const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '..', 'data', 'stockstory.db'));

console.log('=== feature_snapshots schema ===');
const fs = db.prepare("PRAGMA table_info('feature_snapshots')").all();
console.log(fs.map(r => `${r.name} (${r.type})`).join('\n'));

console.log('\n=== prediction_registry schema ===');
try {
  const pr = db.prepare("PRAGMA table_info('prediction_registry')").all();
  console.log(pr.map(r => `${r.name} (${r.type})`).join('\n'));
} catch (e) { console.log(e.message); }

console.log('\n=== quality_registry schema ===');
try {
  const qr = db.prepare("PRAGMA table_info('quality_registry')").all();
  console.log(qr.map(r => `${r.name} (${r.type})`).join('\n'));
} catch (e) { console.log(e.message); }

console.log('\n=== pipeline_health schema ===');
try {
  const ph = db.prepare("PRAGMA table_info('pipeline_health')").all();
  console.log(ph.map(r => `${r.name} (${r.type})`).join('\n'));
} catch (e) { console.log(e.message); }

// Feature snapshots count
const feCount = db.prepare('SELECT COUNT(*) as c FROM feature_snapshots').get();
const feDistinct = db.prepare('SELECT COUNT(DISTINCT symbol) as c FROM feature_snapshots').get();
console.log('\n=== feature_snapshots counts ===');
console.log('rows:', feCount.c, '| distinct symbols:', feDistinct.c);

db.close();
