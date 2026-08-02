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
console.log('tables ready');

process.argv = [process.argv[0], process.argv[1], '--limit', '8'];
await import('./schedule-prediction-refresh.ts');
