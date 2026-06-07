/**
 * TRACK-46 SCHEMA AUDIT — verify actual column names
 */
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'stockstory.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

console.log('=== FACTOR_SNAPSHOTS SCHEMA ===');
const fsCols = db.prepare('PRAGMA table_info(factor_snapshots)').all();
fsCols.forEach(c => console.log(`  ${c.name} (${c.type})`));
const fsCount = db.prepare('SELECT COUNT(*) as c FROM factor_snapshots').get();
console.log(`  ROWS: ${fsCount.c}`);
const fsSample = db.prepare('SELECT * FROM factor_snapshots LIMIT 1').get();
if (fsSample) {
  console.log('  SAMPLE:', JSON.stringify(fsSample));
}

console.log('\n=== PREDICTION_REGISTRY SCHEMA ===');
try {
  const prCols = db.prepare('PRAGMA table_info(prediction_registry)').all();
  prCols.forEach(c => console.log(`  ${c.name} (${c.type})`));
  const prCount = db.prepare('SELECT COUNT(*) as c FROM prediction_registry').get();
  console.log(`  ROWS: ${prCount.c}`);
} catch(e) {
  console.log('  TABLE DOES NOT EXIST:', e.message);
}

console.log('\n=== FEATURE_SNAPSHOTS SCHEMA ===');
const fCols = db.prepare('PRAGMA table_info(feature_snapshots)').all();
fCols.forEach(c => console.log(`  ${c.name} (${c.type})`));
const fCount = db.prepare('SELECT COUNT(*) as c FROM feature_snapshots').get();
console.log(`  ROWS: ${fCount.c}`);

console.log('\n=== FINANCIAL_SNAPSHOTS SCHEMA ===');
const finCols = db.prepare('PRAGMA table_info(financial_snapshots)').all();
finCols.forEach(c => console.log(`  ${c.name} (${c.type})`));
const finCount = db.prepare('SELECT COUNT(*) as c FROM financial_snapshots').get();
console.log(`  ROWS: ${finCount.c}`);

// Check for existing intelligence registries
const tables = ['future_health_registry', 'quality_registry_v4', 'risk_registry', 'explainability_registry', 'portfolio_doctor_registry'];
console.log('\n=== INTELLIGENCE REGISTRIES ===');
for (const t of tables) {
  try {
    const cols = db.prepare(`PRAGMA table_info(${t})`).all();
    const count = db.prepare(`SELECT COUNT(*) as c FROM ${t}`).get();
    console.log(`  ${t}: ${count.c} rows, cols=[${cols.map(c => c.name).join(', ')}]`);
  } catch(e) {
    console.log(`  ${t}: DOES NOT EXIST`);
  }
}

db.close();
console.log('\n=== DONE ===');
