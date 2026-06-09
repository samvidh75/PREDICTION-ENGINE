/**
 * TRACK-P4B-P4A — Deterministic CI Fixture Seeding
 *
 * Seeds a minimal set of deterministic data for integration testing.
 * Requires explicit opt-in: CI_FIXTURE_SEED=true
 * PostgreSQL-first. Never seeds production unintentionally.
 * Safe to rerun — uses upserts and fixed timestamps.
 */
import { dbAdapter } from '../src/db/DatabaseAdapter.js';

// ---------------------------------------------------------------------------
// Guard: only seed in explicit CI context
// ---------------------------------------------------------------------------

if (process.env.CI_FIXTURE_SEED !== 'true') {
  throw new Error(
    'CI_FIXTURE_SEED must be "true" to seed fixtures. ' +
    'This guard prevents accidental production seeding.'
  );
}

// ---------------------------------------------------------------------------
// Fixed timestamps (deterministic, no current-time dependence)
// ---------------------------------------------------------------------------

const FIXED_DATE = '2025-06-09';
const FIXED_TIMESTAMP = '2025-06-09T12:00:00.000Z';
const FIXTURE_SYMBOL = 'TESTIT';

// ---------------------------------------------------------------------------
// Main seeding function
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('=== CI Fixture Seeding ===');
  console.log(`Symbol: ${FIXTURE_SYMBOL}`);
  console.log(`Date: ${FIXED_DATE}`);

  // Initialize adapter — respects NODE_ENV and DB_ADAPTER
  await dbAdapter.initialize();
  console.log(`Adapter: ${dbAdapter.kind}`);

  // ---- 1. Symbol metadata ----
  console.log('\n1. Symbol metadata...');
  await dbAdapter.query(
    `INSERT INTO symbols (symbol, exchange, isin, company_name, sector, industry, listing_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (symbol) DO NOTHING`,
    [
      FIXTURE_SYMBOL,
      'NSE',
      'INE_TESTIT_001',
      'Test Integration Corp',
      'Technology',
      'Software',
      'Active',
    ]
  );

  // Master security registry
  await dbAdapter.query(
    `INSERT INTO master_security_registry (symbol, isin, company_name, nse_symbol, sector, industry, listing_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (symbol) DO NOTHING`,
    [
      FIXTURE_SYMBOL,
      'INE_TESTIT_001',
      'Test Integration Corp',
      FIXTURE_SYMBOL,
      'Technology',
      'Software',
      'Active',
    ]
  );
  console.log('   PASS');

  // ---- 2. Daily price ----
  console.log('2. Daily price...');
  await dbAdapter.query(
    `INSERT INTO daily_prices (symbol, trade_date, open, high, low, close, adjusted_close, volume)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (symbol, trade_date) DO NOTHING`,
    [
      FIXTURE_SYMBOL,
      FIXED_DATE,
      100.00,
      105.00,
      98.00,
      103.50,
      103.50,
      1000000,
    ]
  );
  console.log('   PASS');

  // ---- 3. Financial snapshot ----
  console.log('3. Financial snapshot...');
  await dbAdapter.query(
    `INSERT INTO financial_snapshots
     (symbol, period_end, market_cap, pe_ratio, eps, dividend_yield, beta, free_float,
      fcf_yield, ev_ebitda, roa, roe, roic, debt_to_equity, current_ratio,
      revenue_growth, profit_growth, eps_growth, fcf_growth, gross_margin, operating_margin, pb_ratio)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
     ON CONFLICT (symbol, period_end) DO NOTHING`,
    [
      FIXTURE_SYMBOL,
      FIXED_DATE,
      500000000000,
      22.5,
      45.2,
      1.2,
      0.95,
      0.85,
      3.5,
      12.0,
      12.5,
      18.0,
      22.0,
      0.3,
      2.5,
      15.0,
      12.0,
      10.0,
      8.0,
      55.0,
      28.0,
      4.5,
    ]
  );
  console.log('   PASS');

  // ---- 4. Feature snapshot ----
  console.log('4. Feature snapshot...');
  await dbAdapter.query(
    `INSERT INTO feature_snapshots
     (symbol, trade_date, rsi, macd, macd_signal, macd_histogram,
      adx, atr, bollinger_width, momentum, volatility,
      relative_strength, moving_average_distance, trend_strength)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     ON CONFLICT (symbol, trade_date) DO NOTHING`,
    [
      FIXTURE_SYMBOL,
      FIXED_DATE,
      55.0,
      2.5,
      1.8,
      0.7,
      25.0,
      3.2,
      12.0,
      3.5,
      18.0,
      1.05,
      5.0,
      65.0,
    ]
  );
  console.log('   PASS');

  // ---- 5. Factor snapshot ----
  console.log('5. Factor snapshot...');
  await dbAdapter.query(
    `INSERT INTO factor_snapshots
     (symbol, trade_date, quality_factor, value_factor, growth_factor,
      momentum_factor, risk_factor, sector_strength_factor, factor_score, explanations)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (symbol, trade_date) DO NOTHING`,
    [
      FIXTURE_SYMBOL,
      FIXED_DATE,
      80.0,
      70.0,
      75.0,
      65.0,
      15.0,
      72.0,
      72.0,
      JSON.stringify({ test: 'ci fixture' }),
    ]
  );
  console.log('   PASS');

  // ---- 6. Prediction registry ----
  console.log('6. Prediction registry...');
  await dbAdapter.query(
    `INSERT INTO prediction_registry
     (symbol, prediction_date, ranking_score, classification,
      confidence_score, confidence_level, quality_score, growth_score,
      value_score, momentum_score, risk_score, sector_score,
      price_at_prediction, benchmark_level, prediction_horizon)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     ON CONFLICT (symbol, prediction_date, prediction_horizon) DO NOTHING`,
    [
      FIXTURE_SYMBOL,
      FIXED_DATE,
      85.0,
      'Excellent',
      90.0,
      'Very High',
      80.0,
      75.0,
      70.0,
      85.0,
      15.0,
      65.0,
      103.50,
      22500.0,
      30,
    ]
  );
  console.log('   PASS');

  // ---- 7. Benchmark observation ----
  console.log('7. Benchmark observation...');
  await dbAdapter.query(
    `INSERT INTO benchmark_observations (date, nifty50, nifty100, nifty500, equal_weight, source)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (date) DO NOTHING`,
    [
      FIXED_DATE,
      22500.0,
      22550.0,
      22600.0,
      1.0,
      'ci-fixture',
    ]
  );
  console.log('   PASS');

  // ---- Summary ----
  console.log('\n=== Seeding Complete ===');
  console.log(`Symbol: ${FIXTURE_SYMBOL}`);
  console.log(`Adapter: ${dbAdapter.kind}`);
  console.log('Status: PASS');

  await dbAdapter.shutdown();
  process.exitCode = 0;
}

main().catch((err) => {
  console.error('CI fixture seeding failed:', err);
  process.exitCode = 1;
});
