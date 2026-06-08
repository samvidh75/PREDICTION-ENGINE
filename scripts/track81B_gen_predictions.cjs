/**
 * TRACK-81B Phase 4 — Generate Live Predictions using SQLite fallback
 * Mirrors PredictionFactory.generateDaily() but uses better-sqlite3 directly.
 */
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'stockstory.db');
const db = new Database(dbPath);

const horizons = [30, 90, 365];
const modelVersion = 'SSI-V1-81B';
const today = new Date().toISOString().split('T')[0];
const createdBy = `PredictionFactory-${modelVersion}`;

let created = 0;
let skipped = 0;
const errors = [];

// Get symbols with recent factor snapshots
const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
const symbols = db.prepare(
  'SELECT DISTINCT symbol FROM factor_snapshots WHERE trade_date >= ?'
).all(sevenDaysAgo).map(r => r.symbol);

console.log(`Found ${symbols.length} symbols with factor data since ${sevenDaysAgo}`);

for (const symbol of symbols) {
  for (const horizon of horizons) {
    try {
      // Check if prediction already exists for today + this horizon
      const existing = db.prepare(
        'SELECT id FROM prediction_registry WHERE symbol = ? AND prediction_date = ? AND prediction_horizon = ?'
      ).get(symbol, today, horizon);

      if (existing) {
        skipped++;
        continue;
      }

      // Fetch factor snapshot
      const fact = db.prepare(
        'SELECT * FROM factor_snapshots WHERE symbol = ? ORDER BY trade_date DESC LIMIT 1'
      ).get(symbol);

      if (!fact) {
        skipped++;
        continue;
      }

      // Compute a simple health score from factors (mimics StockStory engine)
      const qualityFactor = Number(fact.quality_factor) || 50;
      const valueFactor = Number(fact.value_factor) || 50;
      const growthFactor = Number(fact.growth_factor) || 50;
      const momentumFactor = Number(fact.momentum_factor) || 50;
      const riskFactor = Number(fact.risk_factor) || 50;
      const sectorFactor = Number(fact.sector_strength_factor) || 50;
      const factorScore = Number(fact.factor_score) || 50;

      // Simple classification
      let classification = 'Average';
      if (factorScore >= 75) classification = 'Excellent';
      else if (factorScore >= 60) classification = 'Good';
      else if (factorScore >= 40) classification = 'Average';
      else if (factorScore >= 25) classification = 'At Risk';
      else classification = 'Critical';

      // Confidence: higher when factors agree more
      const factorVals = [qualityFactor, valueFactor, growthFactor, momentumFactor, sectorFactor];
      const mean = factorVals.reduce((a, b) => a + b, 0) / factorVals.length;
      const variance = factorVals.reduce((s, v) => s + (v - mean) ** 2, 0) / factorVals.length;
      const confidenceScore = Math.round(Math.max(10, 100 - Math.sqrt(variance) * 1.5));
      let confidenceLevel = 'Medium';
      if (confidenceScore >= 70) confidenceLevel = 'High';
      else if (confidenceScore < 40) confidenceLevel = 'Low';

      // Upsert prediction
      db.prepare(`
        INSERT INTO prediction_registry 
        (symbol, prediction_date, ranking_score, classification, confidence_score, confidence_level,
         quality_score, growth_score, value_score, momentum_score, risk_score, sector_score,
         prediction_horizon, created_by, model_version)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(symbol, prediction_date, prediction_horizon) DO UPDATE SET
          ranking_score = excluded.ranking_score,
          classification = excluded.classification,
          confidence_score = excluded.confidence_score,
          confidence_level = excluded.confidence_level
      `).run(
        symbol, today, factorScore, classification, confidenceScore, confidenceLevel,
        qualityFactor, growthFactor, valueFactor, momentumFactor, (100 - riskFactor), sectorFactor,
        horizon, createdBy, modelVersion
      );

      created++;
    } catch (err) {
      errors.push(`${symbol}:${horizon} — ${err.message}`);
    }
  }
}

console.log(`\n=== Prediction Generation Summary ===`);
console.log(`Total symbols: ${symbols.length}`);
console.log(`Created: ${created}`);
console.log(`Skipped (already exists): ${skipped}`);
if (errors.length > 0) console.log(`Errors: ${errors.slice(0, 10).join('\n')}`);

// Verify
const verify = db.prepare(`
  SELECT prediction_horizon, COUNT(*) as count 
  FROM prediction_registry 
  WHERE prediction_date = ? 
  GROUP BY prediction_horizon
`).all(today);

console.log(`\n=== Verification: Predictions for ${today} ===`);
for (const r of verify) {
  console.log(`  ${r.prediction_horizon}d: ${r.count}`);
}

db.close();
