// TRACK-84 Phase 1 — Prediction Coverage Expansion
const path = require('path');
const Database = require('better-sqlite3');
const db = new Database(path.join(__dirname, '..', 'data', 'stockstory.db'));

const total = db.prepare('SELECT COUNT(*) as cnt FROM symbols').get().cnt;
const priceSyms = db.prepare('SELECT COUNT(DISTINCT symbol) as cnt FROM daily_prices').get().cnt;
const factorSyms = db.prepare('SELECT COUNT(DISTINCT symbol) as cnt FROM factor_snapshots').get().cnt;
const featureSyms = db.prepare("SELECT COUNT(DISTINCT symbol) as cnt FROM feature_snapshots WHERE trade_date >= date('now', '-7 days')").get().cnt;
const predToday = db.prepare("SELECT COUNT(DISTINCT symbol) as cnt FROM prediction_registry WHERE prediction_date = date('now')").get().cnt;
const predTotal = db.prepare('SELECT COUNT(DISTINCT symbol) as cnt FROM prediction_registry').get().cnt;

// Identify excluded symbols — those with prices/features but no predictions
const excluded = db.prepare(`
  SELECT DISTINCT s.symbol FROM symbols s
  LEFT JOIN (SELECT DISTINCT symbol FROM prediction_registry) pr ON s.symbol = pr.symbol
  LEFT JOIN (SELECT DISTINCT symbol FROM factor_snapshots) fs ON s.symbol = fs.symbol
  WHERE pr.symbol IS NULL AND fs.symbol IS NOT NULL
  LIMIT 30
`).all().map(r => r.symbol);

const result = {
  phase: '1_prediction_coverage',
  total_symbols: total,
  daily_prices: priceSyms,
  factor_snapshots: factorSyms,
  feature_snapshots_7d: featureSyms,
  prediction_symbols_today: predToday,
  prediction_symbols_total: predTotal,
  gap: total - predTotal,
  excluded_sample: excluded,
  success: predTotal >= 124,
  recommendation: predTotal < 124 ? `Need to add ${124 - predTotal} more symbols to prediction coverage` : null
};

console.log(JSON.stringify(result, null, 2));
db.close();
