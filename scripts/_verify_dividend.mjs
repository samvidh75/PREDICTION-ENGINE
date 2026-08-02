import 'dotenv/config';
const dbMod = await import('../src/db/DatabaseAdapter.ts');
const { dbAdapter } = dbMod;
await dbAdapter.initialize();

const tables = [
  `CREATE TABLE IF NOT EXISTS cache (key VARCHAR(255) PRIMARY KEY, value TEXT, expires_at TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS daily_prices (symbol VARCHAR(20), trade_date DATE, open DECIMAL(14,4), high DECIMAL(14,4), low DECIMAL(14,4), close DECIMAL(14,4), volume BIGINT, PRIMARY KEY (symbol, trade_date))`,
  `CREATE TABLE IF NOT EXISTS feature_snapshots (symbol VARCHAR(20), trade_date DATE, rsi DECIMAL(8,4), macd DECIMAL(12,6), macd_signal DECIMAL(12,6), macd_histogram DECIMAL(12,6), adx DECIMAL(8,4), atr DECIMAL(12,6), bollinger_width DECIMAL(12,6), momentum DECIMAL(10,4), volatility DECIMAL(10,4), relative_strength DECIMAL(10,4), moving_average_distance DECIMAL(10,4), trend_strength DECIMAL(10,4), PRIMARY KEY (symbol, trade_date))`,
  `CREATE TABLE IF NOT EXISTS factor_snapshots (symbol VARCHAR(20), trade_date DATE, quality_factor DECIMAL(5,2), value_factor DECIMAL(5,2), growth_factor DECIMAL(5,2), momentum_factor DECIMAL(5,2), risk_factor DECIMAL(5,2), sector_strength_factor DECIMAL(5,2), factor_score DECIMAL(5,2), explanations TEXT, PRIMARY KEY (symbol, trade_date))`,
  `CREATE TABLE IF NOT EXISTS symbols (symbol VARCHAR(20) PRIMARY KEY, sector TEXT, industry TEXT)`,
  `CREATE TABLE IF NOT EXISTS financial_snapshots (symbol VARCHAR(20), period_end DATE, pe_ratio DECIMAL, dividend_yield DECIMAL, beta DECIMAL, eps DECIMAL, PRIMARY KEY (symbol, period_end))`,
  `CREATE TABLE IF NOT EXISTS prediction_registry (id VARCHAR(40) PRIMARY KEY, symbol VARCHAR(20), prediction_date DATE, ranking_score DECIMAL(5,2), classification VARCHAR(20), confidence_score DECIMAL(5,2), confidence_level VARCHAR(20), quality_score DECIMAL(5,2), growth_score DECIMAL(5,2), value_score DECIMAL(5,2), momentum_score DECIMAL(5,2), risk_score DECIMAL(5,2), sector_score DECIMAL(5,2), price_at_prediction DECIMAL(15,2), benchmark_level DECIMAL(10,2), prediction_horizon INT DEFAULT 30, validation_status VARCHAR(20) DEFAULT 'pending', validated_at TIMESTAMP, future_return DECIMAL(10,4), benchmark_return DECIMAL(10,4), alpha DECIMAL(10,4), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, created_by VARCHAR(50) DEFAULT 'DailyPredictionCapture')`,
];
for (const t of tables) await dbAdapter.query(t);

const providerMod = await import('../src/services/providers/EodhdCandleProvider.ts');
const featureMod = await import('../src/services/FeatureEngine.ts');
const factorMod = await import('../src/services/FactorEngine.ts');
const registryMod = await import('../src/services/data/MasterCompanyRegistry.ts');

const companies = registryMod.default.getInstance().getAll().slice(0, 3);
for (const c of companies) {
  const candles = await providerMod.eodhdCandleProvider.fetchPrices(c.symbol, '2025-07-28', '2026-07-24');
  if (candles.length === 0) continue;
  for (const cd of candles) {
    await dbAdapter.query(
      `INSERT INTO daily_prices (symbol, trade_date, open, high, low, close, volume) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (symbol, trade_date) DO UPDATE SET close=EXCLUDED.close`,
      [c.symbol, cd.date, cd.open, cd.high, cd.low, cd.close, cd.volume],
    );
  }
  const latestClose = candles[candles.length - 1]?.close;
  const dividendYield = latestClose ? await providerMod.eodhdCandleProvider.computeTrailingDividendYield(c.symbol, latestClose) : null;
  console.log(`${c.symbol}: latestClose=${latestClose}, trailingDividendYield=${dividendYield}`);
  if (dividendYield !== null) {
    await dbAdapter.query(
      `INSERT INTO financial_snapshots (symbol, period_end, dividend_yield) VALUES ($1,$2,$3) ON CONFLICT (symbol, period_end) DO UPDATE SET dividend_yield=EXCLUDED.dividend_yield`,
      [c.symbol, new Date().toISOString().split('T')[0], dividendYield],
    );
  }
  await featureMod.featureEngine.calculateAndStoreFeatures(c.symbol);
  await factorMod.factorEngine.calculateAndStoreFactors(c.symbol);
}

const rows = await dbAdapter.query('SELECT * FROM financial_snapshots');
console.log('REAL dividend yield rows persisted:', JSON.stringify(rows.rows, null, 2));

const factorRows = await dbAdapter.query('SELECT symbol, value_factor, quality_factor FROM factor_snapshots ORDER BY symbol');
console.log('Real factor scores now reflecting real dividend data:', JSON.stringify(factorRows.rows, null, 2));
