/**
 * TRACK-P4B-P4 — CI Fixture Seeder
 *
 * Seeds the database with deterministic fixture data for CI tests.
 * Safe to re-run — uses upserts via ON CONFLICT DO NOTHING.
 * Never calls live market APIs.
 *
 * Usage:
 *   npm run seed:ci
 *   DB_ADAPTER=postgres DATABASE_URL=... npm run seed:ci
 */
import { dbAdapter } from '../src/db/DatabaseAdapter';

const SEED_SYMBOL = 'TESTIT';
const SEED_DATE = '2025-06-09';

async function seed(): Promise<void> {
  await dbAdapter.initialize();

  const kind = dbAdapter.kind;
  console.log(`[seed:ci] Seeding fixtures for adapter: ${kind}`);

  // ── 1. Symbols row ──────────────────────────────────────────────
  console.log('[seed:ci] Seeding symbols row...');
  await dbAdapter.query(
    `INSERT INTO symbols (symbol, exchange, isin, company_name, sector, industry, listing_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (symbol) DO NOTHING`,
    [SEED_SYMBOL, 'NSE', 'INE123A01010', 'Test Integration Corp', 'Technology', 'Software', 'Active']
  );

  // ── 2. Daily price fixture ──────────────────────────────────────
  console.log('[seed:ci] Seeding daily price fixture...');
  await dbAdapter.query(
    `INSERT INTO daily_prices (symbol, trade_date, open, high, low, close, adjusted_close, volume)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (symbol, trade_date) DO NOTHING`,
    [SEED_SYMBOL, SEED_DATE, 100.0, 105.0, 98.0, 102.5, 102.5, 1000000]
  );

  // ── 3. Financial snapshot fixture ───────────────────────────────
  console.log('[seed:ci] Seeding financial snapshot fixture...');
  await dbAdapter.query(
    `INSERT INTO financial_snapshots
     (symbol, period_end, market_cap, pe_ratio, eps, dividend_yield, beta, free_float,
      fcf_yield, ev_ebitda, roa, roe, roic, debt_to_equity, current_ratio,
      revenue_growth, profit_growth, eps_growth, fcf_growth,
      gross_margin, operating_margin, pb_ratio)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
             $14, $15, $16, $17, $18, $19, $20, $21, $22)
     ON CONFLICT (symbol, period_end) DO NOTHING`,
    [SEED_SYMBOL, SEED_DATE,
     1e12, 25.5, 45.2, 1.5, 0.95, 0.65,
     3.2, 12.5, 8.5, 15.2, 12.8,
     0.5, 2.1,
     12.5, 15.3, 10.2, 8.5,
     55.0, 28.0, 5.5]
  );

  // ── 4. Feature snapshot fixture ─────────────────────────────────
  console.log('[seed:ci] Seeding feature snapshot fixture...');
  await dbAdapter.query(
    `INSERT INTO feature_snapshots
     (symbol, trade_date, rsi, macd, macd_signal, macd_histogram,
      adx, atr, bollinger_width, momentum, volatility, relative_strength,
      moving_average_distance, trend_strength)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     ON CONFLICT (symbol, trade_date) DO NOTHING`,
    [SEED_SYMBOL, SEED_DATE,
     65.0, 2.5, 2.0, 0.5,
     25.0, 3.5, 0.12, 8.5, 18.0, 105.0,
     3.5, 0.75]
  );

  // ── 5. Factor snapshot fixture ──────────────────────────────────
  console.log('[seed:ci] Seeding factor snapshot fixture...');
  await dbAdapter.query(
    `INSERT INTO factor_snapshots
     (symbol, trade_date, quality_factor, value_factor, growth_factor,
      momentum_factor, risk_factor, sector_strength_factor,
      factor_score, explanations)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (symbol, trade_date) DO NOTHING`,
    [SEED_SYMBOL, SEED_DATE,
     82.0, 75.0, 88.0,
     78.0, 15.0, 70.0,
     68.0, '{"summary":"Test factor attribution"}']
  );

  // ── 6. Prediction registry fixture ──────────────────────────────
  console.log('[seed:ci] Seeding prediction registry fixture...');
  await dbAdapter.query(
    `INSERT INTO prediction_registry
     (symbol, prediction_date, ranking_score, classification,
      confidence_score, confidence_level, quality_score, growth_score,
      value_score, momentum_score, risk_score, sector_score,
      price_at_prediction, benchmark_level, prediction_horizon,
      created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     ON CONFLICT (symbol, prediction_date, prediction_horizon) DO NOTHING`,
    [SEED_SYMBOL, SEED_DATE,
     85, 'Excellent',
     90, 'Very High', 80, 82,
     75, 78, 12, 70,
     102.5, 18500, 30,
      'DailyPredictionCapture']
  );

  // ── 7. Benchmark observation fixture ────────────────────────────
  console.log('[seed:ci] Seeding benchmark observation...');
  await dbAdapter.query(
    `INSERT INTO benchmark_observations (date, nifty50, nifty100, nifty500, equal_weight, source)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (date) DO NOTHING`,
    [SEED_DATE, 18500, 18600, 18700, 18550, 'ci-fixture']
  );

  // ── 8. Daily prediction snapshot fixture ────────────────────────
  console.log('[seed:ci] Seeding daily prediction snapshot...');
  await dbAdapter.query(
    `INSERT INTO daily_prediction_snapshots (date, horizon, top10, top25, top50, bottom10, bottom25)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (date, horizon) DO NOTHING`,
    [SEED_DATE, 30,
     '["TESTIT","RELIANCE","TCS","HDFC","INFY","ICICIBANK","BHARTIARTL","KOTAKBANK","ITC","LT"]',
     '["TESTIT","RELIANCE","TCS","HDFC","INFY","ICICIBANK","BHARTIARTL","KOTAKBANK","ITC","LT","AXISBANK","WIPRO","SUNPHARMA","NTPC","MARUTI","HCLTECH","TITAN","BAJFINANCE","ADANIPORTS","POWERGRID","HINDUNILVR","ULTRACEMCO","NESTLE","DIVISLAB","GRASIM"]',
     '["TESTIT","RELIANCE","TCS","HDFC","INFY","ICICIBANK","BHARTIARTL","KOTAKBANK","ITC","LT","AXISBANK","WIPRO","SUNPHARMA","NTPC","MARUTI","HCLTECH","TITAN","BAJFINANCE","ADANIPORTS","POWERGRID","HINDUNILVR","ULTRACEMCO","NESTLE","DIVISLAB","GRASIM","ONGC","IOC","SBI","BPCL","COALINDIA","HEROMOTOCO","TECHM","EICHERMOT","ASIANPAINT","TATASTEEL","UPL","JSWSTEEL","SHREECEM","CIPLA","GAIL","HINDALCO","BRITANNIA","BAJAJ-AUTO","DRREDDY","TATAMOTORS","INDUSINDBANK","PIDILITIND","BEL","SBILIFE"]',
     '["TESTIT"]',
     '["TESTIT"]']
  );

  console.log('[seed:ci] Fixture seeding complete.');
  await dbAdapter.shutdown();
}

seed().catch((err) => {
  console.error('[seed:ci] FAILED:', err.message);
  process.exitCode = 1;
});
