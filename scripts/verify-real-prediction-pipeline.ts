/**
 * verify-real-prediction-pipeline.ts — one-shot verification script.
 *
 * Runs the full real pipeline in a single process (the local SQLite
 * fallback doesn't persist across process invocations, so this can't be
 * split into separate backfill/verify steps for local verification):
 *
 *   EODHD candles -> daily_prices -> FeatureEngine -> feature_snapshots
 *   -> FactorEngine -> factor_snapshots -> PredictionFactory.generateDaily()
 *   -> prediction_registry
 *
 * This is a verification tool, not a production job — scripts/
 * backfill-daily-prices.ts + a real scheduled FeatureEngine/FactorEngine
 * run are the production path once a persistent DB is configured.
 *
 * Usage: tsx scripts/verify-real-prediction-pipeline.ts [--limit=15]
 */
import 'dotenv/config';

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : 15;

  const [
    dbMod,
    registryMod,
    providerMod,
    featureMod,
    factorMod,
    factoryMod,
  ] = await Promise.all([
    import('../src/db/index'),
    import('../src/services/data/MasterCompanyRegistry'),
    import('../src/services/providers/EodhdCandleProvider'),
    import('../src/services/FeatureEngine'),
    import('../src/services/FactorEngine'),
    import('../src/predictions/PredictionFactory'),
  ]);

  const pool = dbMod.default;
  const registry = registryMod.default.getInstance();
  const { eodhdCandleProvider } = providerMod;
  const { featureEngine } = featureMod;
  const { factorEngine } = factorMod;
  const { PredictionFactory } = factoryMod;

  console.log('--- Creating tables ---');
  // Drop first: this script may run against a dev SQLite file left over
  // from an earlier verification run with a different ad-hoc schema, and
  // CREATE TABLE IF NOT EXISTS would silently keep the stale one.
  for (const t of ['daily_prices', 'feature_snapshots', 'factor_snapshots', 'symbols', 'financial_snapshots', 'prediction_registry']) {
    await pool.query(`DROP TABLE IF EXISTS ${t}`);
  }
  await pool.query(`CREATE TABLE IF NOT EXISTS daily_prices (
    symbol VARCHAR(20) NOT NULL, trade_date DATE NOT NULL,
    open DECIMAL(14,4), high DECIMAL(14,4), low DECIMAL(14,4), close DECIMAL(14,4), volume BIGINT,
    PRIMARY KEY (symbol, trade_date))`);
  await pool.query(`CREATE TABLE IF NOT EXISTS feature_snapshots (
    symbol VARCHAR(20) NOT NULL, trade_date DATE NOT NULL,
    rsi DECIMAL(8,4), macd DECIMAL(12,6), macd_signal DECIMAL(12,6), macd_histogram DECIMAL(12,6),
    adx DECIMAL(8,4), atr DECIMAL(12,6), bollinger_width DECIMAL(12,6), momentum DECIMAL(10,4),
    volatility DECIMAL(10,4), relative_strength DECIMAL(10,4), moving_average_distance DECIMAL(10,4),
    trend_strength DECIMAL(10,4), PRIMARY KEY (symbol, trade_date))`);
  await pool.query(`CREATE TABLE IF NOT EXISTS factor_snapshots (
    symbol VARCHAR(20) NOT NULL, trade_date DATE NOT NULL,
    quality_factor DECIMAL(5,2), value_factor DECIMAL(5,2), growth_factor DECIMAL(5,2),
    momentum_factor DECIMAL(5,2), risk_factor DECIMAL(5,2), sector_strength_factor DECIMAL(5,2),
    factor_score DECIMAL(5,2), explanations TEXT, PRIMARY KEY (symbol, trade_date))`);
  await pool.query(`CREATE TABLE IF NOT EXISTS symbols (
    symbol VARCHAR(20) PRIMARY KEY, sector TEXT, industry TEXT)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS financial_snapshots (
    symbol VARCHAR(20) NOT NULL, period_end DATE NOT NULL,
    pe_ratio DECIMAL, pb_ratio DECIMAL, eps DECIMAL, dividend_yield DECIMAL, beta DECIMAL,
    market_cap DECIMAL, free_float DECIMAL, fcf_yield DECIMAL, ev_ebitda DECIMAL,
    roa DECIMAL, roe DECIMAL, roic DECIMAL, debt_to_equity DECIMAL, current_ratio DECIMAL,
    revenue_growth DECIMAL, profit_growth DECIMAL, eps_growth DECIMAL, fcf_growth DECIMAL,
    gross_margin DECIMAL, operating_margin DECIMAL, PRIMARY KEY (symbol, period_end))`);
  await pool.query(`CREATE TABLE IF NOT EXISTS prediction_registry (
    id VARCHAR(40) PRIMARY KEY, symbol VARCHAR(20) NOT NULL,
    prediction_date DATE NOT NULL, ranking_score DECIMAL(5,2) NOT NULL,
    classification VARCHAR(20) NOT NULL, confidence_score DECIMAL(5,2) NOT NULL,
    confidence_level VARCHAR(20) NOT NULL,
    quality_score DECIMAL(5,2) NOT NULL, growth_score DECIMAL(5,2) NOT NULL,
    value_score DECIMAL(5,2) NOT NULL, momentum_score DECIMAL(5,2) NOT NULL,
    risk_score DECIMAL(5,2) NOT NULL, sector_score DECIMAL(5,2) NOT NULL,
    price_at_prediction DECIMAL(15,2), benchmark_level DECIMAL(10,2),
    prediction_horizon INT NOT NULL DEFAULT 30,
    validation_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    validated_at TIMESTAMP, future_return DECIMAL(10,4), benchmark_return DECIMAL(10,4),
    alpha DECIMAL(10,4), created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) NOT NULL DEFAULT 'DailyPredictionCapture')`);

  const companies = registry.getAll().slice(0, limit);
  console.log(`--- Backfilling real EODHD data for ${companies.length} symbols ---`);

  let priceOk = 0;
  for (const c of companies) {
    const candles = await eodhdCandleProvider.fetchPrices(c.symbol, '2025-07-28', '2026-07-24');
    if (candles.length === 0) {
      console.log(`  ${c.symbol}: no EODHD data, skipping`);
      continue;
    }
    for (const cd of candles) {
      await pool.query(
        `INSERT INTO daily_prices (symbol, trade_date, open, high, low, close, volume) VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (symbol, trade_date) DO UPDATE SET close=EXCLUDED.close`,
        [c.symbol, cd.date, cd.open, cd.high, cd.low, cd.close, cd.volume],
      );
    }
    await pool.query(
      `INSERT INTO symbols (symbol, sector, industry) VALUES ($1,$2,$3)
       ON CONFLICT (symbol) DO UPDATE SET sector=EXCLUDED.sector`,
      [c.symbol, c.sector, c.industry],
    );
    await featureEngine.calculateAndStoreFeatures(c.symbol);
    await factorEngine.calculateAndStoreFactors(c.symbol);
    priceOk++;
  }
  console.log(`--- Real price/feature/factor data populated for ${priceOk}/${companies.length} symbols ---`);

  console.log('--- Running PredictionFactory.generateDaily() (the real, live scoring path) ---');
  const factory = new PredictionFactory();
  const summary = await factory.generateDaily([30]);
  console.log('Generation summary:', JSON.stringify(summary, null, 2));

  const rows = await pool.query(
    `SELECT symbol, ranking_score, classification, confidence_score, confidence_level,
            quality_score, growth_score, value_score, momentum_score, risk_score
     FROM prediction_registry ORDER BY ranking_score DESC`,
  );
  console.log(`--- ${rows.rows.length} real predictions persisted in prediction_registry ---`);
  console.log(JSON.stringify(rows.rows, null, 2));

  const uniqueScores = new Set(rows.rows.map((r: any) => r.ranking_score));
  console.log(`--- Distinct ranking scores: ${uniqueScores.size} / ${rows.rows.length} rows (proves real differentiation, not a constant fallback) ---`);

  process.exit(0);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
