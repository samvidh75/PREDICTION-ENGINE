const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '..', 'data', 'stockstory.db'));

// Phase 1 - max trade_date for factor_snapshots
const fsMax = db.prepare('SELECT MAX(trade_date) as d FROM factor_snapshots').get();
console.log('P1: factor_snapshots MAX trade_date:', fsMax.d);

// Phase 2 - check feature_snapshots latest date
const feMax = db.prepare('SELECT MAX(snapshot_date) as d FROM feature_snapshots').get();
console.log('P2: feature_snapshots MAX snapshot_date:', feMax.d);

// Phase 5 - Temporal Integrity
const futureF = db.prepare("SELECT COUNT(*) as c FROM factor_snapshots WHERE trade_date > DATE('now')").get();
console.log('P5: future factor_snapshots:', futureF.c);

try {
  const viol = db.prepare(`
    SELECT COUNT(*) as c
    FROM quality_registry q
    JOIN prediction_registry p ON q.symbol = p.symbol
    WHERE q.data_date > p.prediction_date
  `).get();
  console.log('P5: quality/prediction temporal violations:', viol.c);
} catch (e) {
  console.log('P5: temporal join error:', e.message);
}

// Phase 4 - Prediction registry check
try {
  const pr = db.prepare("SELECT prediction_date, horizon, COUNT(*) as c FROM prediction_registry WHERE prediction_date >= DATE('now', '-1 day') GROUP BY prediction_date, horizon").all();
  console.log('P4: predictions today:', JSON.stringify(pr));
} catch (e) {
  console.log('P4: error:', e.message);
}

// Pipeline health
try {
  const ph = db.prepare('SELECT * FROM pipeline_health ORDER BY created_at DESC LIMIT 5').all();
  console.log('P6: pipeline_health latest:', ph.length, 'rows');
  for (const row of ph) {
    console.log(' ', JSON.stringify(row));
  }
} catch (e) {
  console.log('P6: pipeline_health error:', e.message);
}

db.close();
