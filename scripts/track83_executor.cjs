/**
 * TRACK-83 — Prediction Registry Constraint Repair
 */
const Database = require('better-sqlite3');
const { execSync } = require('child_process');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'data', 'stockstory.db'));
const TODAY = new Date().toISOString().split('T')[0];

// ─── 1. Schema BEFORE ────────────────────────────────────────────────────────
console.log('=== SCHEMA BEFORE ===');
const cols = db.pragma('table_info(prediction_registry)');
console.log('Columns:', cols.map(c => c.name).join(', '));
const idxBefore = db.pragma('index_list(prediction_registry)');
console.log('Indices:', JSON.stringify(idxBefore.map(i => ({ name: i.name, unique: i.unique }))));

// ─── 2. Predictions BEFORE ───────────────────────────────────────────────────
console.log('\n=== PREDICTIONS BEFORE ===');
const totalBefore = db.prepare('SELECT COUNT(*) AS c FROM prediction_registry').get().c;
const todayBefore = db.prepare('SELECT COUNT(*) AS c FROM prediction_registry WHERE prediction_date = ?').get(TODAY).c;
const symBefore = db.prepare('SELECT COUNT(DISTINCT symbol) AS c FROM prediction_registry WHERE prediction_date = ?').get(TODAY).c;
console.log(`Total predictions: ${totalBefore}`);
console.log(`Today predictions: ${todayBefore}`);
console.log(`Today symbols: ${symBefore}`);

// ─── 3. Create unique index ──────────────────────────────────────────────────
console.log('\n=== CREATING UNIQUE INDEX ===');
try {
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_prediction_unique
    ON prediction_registry(symbol, prediction_date, prediction_horizon)
  `);
  console.log('✅ Index created');
} catch(e) {
  console.log('Index creation error:', e.message);
}

// ─── 4. Schema AFTER ─────────────────────────────────────────────────────────
console.log('\n=== SCHEMA AFTER ===');
const idxAfter = db.pragma('index_list(prediction_registry)');
console.log('Indices:', JSON.stringify(idxAfter.map(i => ({ name: i.name, unique: i.unique }))));

// ─── 5. Run prediction generation ────────────────────────────────────────────
console.log('\n=== RUNNING PREDICTION GENERATION ===');
try {
  execSync(`node "${path.join(__dirname, 'track81B_gen_predictions.cjs')}"`, {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    timeout: 120000
  });
} catch(e) {
  console.log('Generation error (may be partial):', e.message.substring(0, 200));
}

// ─── 6. Predictions AFTER ────────────────────────────────────────────────────
console.log('\n=== PREDICTIONS AFTER ===');
const totalAfter = db.prepare('SELECT COUNT(*) AS c FROM prediction_registry').get().c;
const todayAfter = db.prepare('SELECT COUNT(*) AS c FROM prediction_registry WHERE prediction_date = ?').get(TODAY).c;
const symAfter = db.prepare('SELECT COUNT(DISTINCT symbol) AS c FROM prediction_registry WHERE prediction_date = ?').get(TODAY).c;
console.log(`Total predictions: ${totalAfter}`);
console.log(`Today predictions: ${todayAfter}`);
console.log(`Today symbols: ${symAfter}`);

const byHorizon = db.prepare(`
  SELECT prediction_horizon, COUNT(*) AS c
  FROM prediction_registry
  WHERE prediction_date = ?
  GROUP BY prediction_horizon
  ORDER BY prediction_horizon
`).all(TODAY);
byHorizon.forEach(r => console.log(`  ${r.prediction_horizon}d: ${r.c}`));

// ─── 7. Root cause ───────────────────────────────────────────────────────────
console.log('\n=== ROOT CAUSE ===');
console.log('prediction_registry had no UNIQUE constraint on (symbol, prediction_date, prediction_horizon)');
console.log('The ON CONFLICT clause in the INSERT referenced a constraint that did not exist.');
console.log('Fix: CREATE UNIQUE INDEX idx_prediction_unique ON prediction_registry(symbol, prediction_date, prediction_horizon)');

// ─── 8. Classification ───────────────────────────────────────────────────────
console.log('\n=== FINAL CLASSIFICATION ===');
const pass = symAfter >= 96 && todayAfter > 0;
if (pass) {
  console.log('✅ PUBLIC BETA — OPERATIONAL');
} else {
  console.log('⚠️  PRIVATE BETA');
}

db.close();
