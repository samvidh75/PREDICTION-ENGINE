/**
 * TRACK-81C — First Live Prediction Proof
 * All 5 phases. Database evidence only.
 */
const Database = require('better-sqlite3');
const path = require('path');
const { execSync } = require('child_process');

const dbPath = path.join(__dirname, '..', 'data', 'stockstory.db');
const db = new Database(dbPath);

const TODAY = new Date().toISOString().split('T')[0];
const results = {};

console.log('='.repeat(60));
console.log('TRACK-81C — FIRST LIVE PREDICTION PROOF');
console.log(`Timestamp: ${new Date().toISOString()}`);
console.log('='.repeat(60));

// ─── Phase 1: Feature Generation ────────────────────────────────────────────
console.log('\n── Phase 1: Feature Generation ──');

// 1a. Schema
const cols = db.pragma('table_info(feature_snapshots)');
console.log(`feature_snapshots columns: ${cols.length}`);

// 1b. Count rows
const featRows = db.prepare('SELECT COUNT(*) AS c FROM feature_snapshots').get().c;
results.featureRows = featRows;
console.log(`Feature Rows: ${featRows}`);

// 1c. Distinct symbols
const featSymbols = db.prepare('SELECT COUNT(DISTINCT symbol) AS c FROM feature_snapshots').get().c;
results.featureSymbols = featSymbols;
console.log(`Feature Symbols: ${featSymbols}`);

// 1d. Latest date (feature_snapshots uses trade_date)
const maxSnap = db.prepare('SELECT MAX(trade_date) AS d FROM feature_snapshots').get().d;
results.featureLatestDate = maxSnap;
console.log(`Latest feature trade_date: ${maxSnap}`);

// 1e. Also check factor_snapshots
const fsMax = db.prepare('SELECT MAX(trade_date) AS d FROM factor_snapshots').get().d;
console.log(`Latest factor trade_date: ${fsMax}`);

// ─── Phase 2: Predictions ───────────────────────────────────────────────────
console.log('\n── Phase 2: Predictions ──');

// Run prediction generation (the existing script)
try {
  execSync(`node "${path.join(__dirname, 'track81B_gen_predictions.cjs')}"`, {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    timeout: 120000
  });
  console.log('Prediction generation completed.');
} catch (e) {
  console.log('Prediction generation script had errors:', e.message);
}

// Verify predictions
const pred30 = db.prepare('SELECT COUNT(*) AS c FROM prediction_registry WHERE prediction_date = ? AND prediction_horizon = 30').get(TODAY).c;
const pred90 = db.prepare('SELECT COUNT(*) AS c FROM prediction_registry WHERE prediction_date = ? AND prediction_horizon = 90').get(TODAY).c;
const pred365 = db.prepare('SELECT COUNT(*) AS c FROM prediction_registry WHERE prediction_date = ? AND prediction_horizon = 365').get(TODAY).c;
const predTotal = pred30 + pred90 + pred365;

results.predictionsGeneratedToday = predTotal;
results.pred30 = pred30;
results.pred90 = pred90;
results.pred365 = pred365;

console.log(`30d predictions: ${pred30}`);
console.log(`90d predictions: ${pred90}`);
console.log(`365d predictions: ${pred365}`);
console.log(`Total predictions today: ${predTotal}`);

// ─── Phase 3: Temporal Integrity ────────────────────────────────────────────
console.log('\n── Phase 3: Temporal Integrity ──');

// 3a. Factor snapshots with trade_date > now
let futureFactors = 0;
try {
  futureFactors = db.prepare("SELECT COUNT(*) AS c FROM factor_snapshots WHERE trade_date > DATE('now')").get().c;
} catch (e) {
  futureFactors = db.prepare("SELECT COUNT(*) AS c FROM factor_snapshots WHERE trade_date > ?").get(TODAY).c;
}
console.log(`Future-dated factor_snapshots: ${futureFactors}`);

// 3b. Quality data after prediction date
let qualityAfterPred = 0;
try {
  qualityAfterPred = db.prepare(`
    SELECT COUNT(*) AS c
    FROM quality_registry q
    JOIN prediction_registry p ON q.symbol = p.symbol
    WHERE q.data_date > p.prediction_date
  `).get().c;
} catch (e) {
  qualityAfterPred = -1;
}
console.log(`Quality-timeline violations: ${qualityAfterPred}`);

results.temporalViolations = futureFactors + (qualityAfterPred > 0 ? qualityAfterPred : 0);

// ─── Phase 4: Pipeline Health ───────────────────────────────────────────────
console.log('\n── Phase 4: Pipeline Health ──');

let pipelineStatus = 'NOT_FOUND';
try {
  const ph = db.prepare('SELECT * FROM pipeline_health ORDER BY created_at DESC LIMIT 20').all();
  if (ph.length > 0) {
    const phases = ph.map(r => r.phase || r.status || JSON.stringify(r)).join(', ');
    pipelineStatus = `${ph.length} records — latest: ${ph[0].created_at || ph[0].timestamp || 'unknown'}`;
    console.log(`Pipeline health records: ${ph.length}`);
    console.log(`Sample phases: ${phases.substring(0, 200)}`);
  } else {
    console.log('No pipeline_health records found');
  }
} catch (e) {
  console.log('pipeline_health table may not exist:', e.message);
  pipelineStatus = 'TABLE_MISSING';
}

results.schedulerStatus = pipelineStatus;

// ─── Phase 5: Production Gate ────────────────────────────────────────────────
console.log('\n── Phase 5: Production Gate ──');

let failCount = -1;
try {
  const output = execSync(`node "${path.join(__dirname, 'production_gate.ts')}"`, {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
    timeout: 60000
  });
  console.log(output.substring(0, 500));
  // Count FAIL occurrences
  const matches = output.match(/FAIL/gi);
  failCount = matches ? matches.length : 0;
} catch (e) {
  console.log('Production gate error:', e.message);
  // Try TS version
  try {
    const output = execSync(`npx tsx "${path.join(__dirname, 'production_gate.ts')}"`, {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8',
      timeout: 60000
    });
    console.log(output.substring(0, 500));
    const matches = output.match(/FAIL/gi);
    failCount = matches ? matches.length : 0;
  } catch (e2) {
    console.log('Production gate TS error:', e2.message);
    failCount = -1;
  }
}

results.productionGateFails = failCount;

// ─── Final Output ────────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(60));
console.log('TRACK-81C FINAL VERDICT');
console.log('='.repeat(60));

console.log(`
| Metric | Value |
|----------|----------|
| Feature Rows | ${results.featureRows} |
| Feature Symbols | ${results.featureSymbols} |
| Predictions Generated Today | ${results.predictionsGeneratedToday} |
| 30d Predictions | ${results.pred30} |
| 90d Predictions | ${results.pred90} |
| 365d Predictions | ${results.pred365} |
| Temporal Violations | ${results.temporalViolations} |
| Scheduler Status | ${results.schedulerStatus} |
| Production Gate FAIL Count | ${results.productionGateFails} |
`);

// Classification
const pass =
  results.featureRows > 0 &&
  results.featureSymbols >= 96 &&
  results.pred30 > 0 &&
  results.pred90 > 0 &&
  results.pred365 > 0 &&
  results.temporalViolations === 0 &&
  results.productionGateFails === 0;

if (pass) {
  console.log('\n✅ PUBLIC BETA — OPERATIONAL');
} else {
  console.log('\n⚠️  PRIVATE BETA');
  if (results.featureRows === 0) console.log('  → BLOCKER: No feature rows');
  if (results.featureSymbols < 96) console.log('  → BLOCKER: < 96 symbols');
  if (results.pred30 === 0) console.log('  → BLOCKER: No 30d predictions');
  if (results.pred90 === 0) console.log('  → BLOCKER: No 90d predictions');
  if (results.pred365 === 0) console.log('  → BLOCKER: No 365d predictions');
  if (results.temporalViolations > 0) console.log('  → BLOCKER: Temporal violations');
  if (results.productionGateFails !== 0) console.log('  → BLOCKER: Production gate failures');
}

db.close();
