/**
 * Materialize prediction outcomes.
 *
 * For each prediction_registry entry with a non-null ranking_score,
 * finds the realised price at the horizon date using daily_prices,
 * computes the return, and upserts into prediction_outcomes.
 *
 * Usage:
 *   npx tsx scripts/outcomes/materialize-prediction-outcomes.ts --apply
 *   npx tsx scripts/outcomes/materialize-prediction-outcomes.ts --symbol=RELIANCE --apply
 *   npx tsx scripts/outcomes/materialize-prediction-outcomes.ts --horizon=30 --dry-run
 *
 * Dry-run is the default. Pass --apply to write results.
 */

export {};

const DRY_RUN = !process.argv.includes('--apply');
const symbolFilter = process.argv.find((a) => a.startsWith('--symbol='))?.split('=')[1] || null;
const horizonFilter = process.argv.find((a) => a.startsWith('--horizon='))?.split('=')[1] || null;

interface OutcomeRegistryRow {
  id: string;
  symbol: string;
  prediction_date: string;
  prediction_horizon: number;
  ranking_score: number;
  classification: string;
  confidence_score: number;
  price_at_prediction: number | null;
}

interface PriceRow {
  date: string;
  close: number;
}

function scoreBucket(score: number | null): string {
  if (score === null) return 'unknown';
  if (score >= 85) return '85-100';
  if (score >= 70) return '70-84';
  if (score >= 55) return '55-69';
  if (score >= 40) return '40-54';
  if (score >= 25) return '25-39';
  return '0-24';
}

function confidenceBucket(confidence: number | null): string {
  if (confidence === null) return 'unknown';
  if (confidence >= 80) return 'high';
  if (confidence >= 60) return 'medium';
  if (confidence >= 40) return 'low';
  return 'partial';
}

function directionResult(returnPct: number): string {
  if (returnPct > 5) return 'positive_return';
  if (returnPct < -5) return 'negative_return';
  return 'flat';
}

async function run() {
  console.log(`\nPrediction Outcomes Materializer`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'APPLY'}`);
  if (symbolFilter) console.log(`Symbol filter: ${symbolFilter}`);
  if (horizonFilter) console.log(`Horizon filter: ${horizonFilter}D`);
  console.log('');

  const { dbAdapter } = await import('../../src/db/DatabaseAdapter');
  await dbAdapter.initialize();

  const stats = {
    checked: 0,
    created: 0,
    updated: 0,
    skippedUnmatured: 0,
    skippedMissingPrice: 0,
    skippedMissingPredictionPrice: 0,
    failed: 0,
  };

  try {
    let query = `SELECT id, symbol, prediction_date, prediction_horizon,
                        ranking_score, classification, confidence_score, price_at_prediction
                 FROM prediction_registry
                 WHERE ranking_score IS NOT NULL`;
    const params: string[] = [];

    if (symbolFilter) {
      params.push(symbolFilter.toUpperCase());
      query += ` AND UPPER(REPLACE(symbol, ' ', '')) = $${params.length}`;
    }
    if (horizonFilter) {
      params.push(horizonFilter);
      query += ` AND prediction_horizon = $${params.length}`;
    }
    query += ' ORDER BY prediction_date DESC';

    const result = await dbAdapter.query(query, params);
    const rows: OutcomeRegistryRow[] = result.rows as OutcomeRegistryRow[];

    console.log(`Predictions to process: ${rows.length}`);

    for (const row of rows) {
      stats.checked++;
      const horizon = row.prediction_horizon || 30;
      const predDate = new Date(row.prediction_date);
      const targetDate = new Date(predDate.getTime() + horizon * 24 * 60 * 60 * 1000);
      const today = new Date();

      // Skip unmatured predictions
      if (targetDate > today) {
        stats.skippedUnmatured++;
        continue;
      }

      // Price at prediction must exist
      if (row.price_at_prediction === null) {
        stats.skippedMissingPredictionPrice++;
        continue;
      }

      // Find realised price: use the close price closest to target date
      const priceResult = await dbAdapter.query(
        `SELECT date, close FROM daily_prices
         WHERE UPPER(REPLACE(symbol, ' ', '')) = $1
           AND date <= $2
         ORDER BY date DESC LIMIT 1`,
        [row.symbol.toUpperCase().trim(), targetDate.toISOString().slice(0, 10)],
      );

      if (!priceResult.rows || priceResult.rows.length === 0) {
        stats.skippedMissingPrice++;
        continue;
      }

      const priceRow = priceResult.rows[0] as PriceRow;
      const realisedPrice = priceRow.close;
      const priceAtPred = row.price_at_prediction;

      if (!realisedPrice || priceAtPred <= 0) {
        stats.skippedMissingPrice++;
        continue;
      }

      const realisedReturn = ((realisedPrice - priceAtPred) / priceAtPred) * 100;
      const dir = directionResult(realisedReturn);
      const sBucket = scoreBucket(row.ranking_score);
      const cBucket = confidenceBucket(row.confidence_score);

      if (DRY_RUN) {
        console.log(`  ${row.symbol} ${horizon}D: score=${row.ranking_score} bucket=${sBucket} return=${realisedReturn.toFixed(2)}% dir=${dir}`);
        continue;
      }

      // Upsert
      await dbAdapter.query(
        `INSERT INTO prediction_outcomes
           (prediction_id, symbol, horizon_days, prediction_date,
            price_at_prediction, realised_price, realised_return_pct,
            realised_at, direction_result, score_bucket,
            confidence_bucket, classification_at_prediction)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (prediction_id) DO UPDATE SET
           realised_price = EXCLUDED.realised_price,
           realised_return_pct = EXCLUDED.realised_return_pct,
           realised_at = EXCLUDED.realised_at,
           direction_result = EXCLUDED.direction_result,
           updated_at = NOW()`,
        [
          row.id, row.symbol, horizon, row.prediction_date,
          priceAtPred, realisedPrice, realisedReturn,
          priceRow.date, dir, sBucket, cBucket, row.classification,
        ],
      );

      stats.created++;
    }

    console.log(`\nSummary:`);
    console.log(`  Predictions checked:              ${stats.checked}`);
    console.log(`  Outcomes created/updated:         ${stats.created + stats.updated}`);
    console.log(`  Skipped (unmatured):              ${stats.skippedUnmatured}`);
    console.log(`  Skipped (missing price):          ${stats.skippedMissingPrice}`);
    console.log(`  Skipped (missing pred price):     ${stats.skippedMissingPredictionPrice}`);
    console.log(`  Failed:                           ${stats.failed}`);
    console.log(`\n${DRY_RUN ? 'DRY RUN complete. Pass --apply to write outcomes.' : 'Apply complete.'}`);
  } finally {
    await dbAdapter.reset();
  }
}

run().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
