/**
 * Deterministic CI Fixture Seeding (PostgreSQL-first).
 * Seeds a known fixture symbol (TESTIT) into the database for CI tests.
 *
 * Rules:
 * - Uses upserts; safe to rerun.
 * - PostgreSQL-first; uses $1-style parameterization.
 * - No live provider calls.
 * - No random values.
 * - Fixed timestamps (2025-06-09) — no current-time dependence.
 * - Requires explicit opt-in: CI_FIXTURE_SEED=true.
 * - Never seeds production unintentionally.
 *
 * Usage: CI_FIXTURE_SEED=true npm run seed:ci
 */

import { dbAdapter } from '../src/db/DatabaseAdapter';

const FIXED_DATE = '2025-06-09';
const FIXED_TIMESTAMP = '2025-06-09T00:00:00.000Z';
const FIXTURE_SYMBOL = 'TESTIT';

async function seed(): Promise<void> {
  if (process.env.CI_FIXTURE_SEED !== 'true') {
    throw new Error(
      'CI_FIXTURE_SEED must be set to "true" to seed fixtures. ' +
      'This is to prevent accidental seeding of production databases.'
    );
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed fixtures in production environment.');
  }

  await dbAdapter.initialize();

  console.log(`[seed:ci] Seeding fixture symbol: ${FIXTURE_SYMBOL}`);

  // 1. Symbol metadata
  await dbAdapter.query(
    `INSERT INTO symbols (symbol, exchange, company_name, sector, industry, listing_status)
     VALUES ($1, 'NSE', 'Test Integration Inc.', 'Technology', 'Software', 'Active')
     ON CONFLICT (symbol) DO UPDATE SET
       company_name = EXCLUDED.company_name,
       sector = EXCLUDED.sector,
       industry = EXCLUDED.industry`,
    [FIXTURE_SYMBOL]
  );
  console.log('  [ok] symbols');

  // 2. Daily price row (fixed date)
  await dbAdapter.query(
    `INSERT INTO daily_prices (symbol, trade_date, open, high, low, close, adjusted_close, volume)
     VALUES ($1, $2, 100.0, 105.0, 98.0, 102.5, 102.5, 1000000)
     ON CONFLICT (symbol, trade_date) DO UPDATE SET
       close = EXCLUDED.close,
       adjusted_close = EXCLUDED.adjusted_close`,
    [FIXTURE_SYMBOL, FIXED_DATE]
  );
  console.log('  [ok] daily_prices');

  // 3. Financial snapshot row
  await dbAdapter.query(
    `INSERT INTO financial_snapshots
      (symbol, period_end, market_cap, pe_ratio, eps, dividend_yield, beta, free_float,
       fcf_yield, ev_ebitda, roa, roe, roic, debt_to_equity, current_ratio,
       revenue_growth, profit_growth, eps_growth, fcf_growth,
       gross_margin, operating_margin, pb_ratio)
     VALUES ($1, $2, 500000000000, 25.5, 45.0, 1.2, 0.95, 0.75,
             3.5, 18.0, 12.0, 22.0, 18.0, 0.3, 2.1,
             15.0, 12.0, 10.0, 8.0, 55.0, 28.0, 4.5)
     ON CONFLICT (symbol, period_end) DO NOTHING`,
    [FIXTURE_SYMBOL, FIXED_DATE]
  );
  console.log('  [ok] financial_snapshots');

  // 4. Feature snapshot row
  await dbAdapter.query(
    `INSERT INTO feature_snapshots
      (symbol, trade_date, rsi, macd, macd_signal, macd_histogram,
       adx, atr, bollinger_width, momentum, volatility, relative_strength,
       moving_average_distance, trend_strength)
     VALUES ($1, $2, 55.0, 1.5, 1.2, 0.3, 25.0, 2.5, 4.0, 5.0, 18.0, 0.85, 3.0, 0.6)
     ON CONFLICT (symbol, trade_date) DO NOTHING`,
    [FIXTURE_SYMBOL, FIXED_DATE]
  );
  console.log('  [ok] feature_snapshots');

  // 5. Factor snapshot row
  await dbAdapter.query(
    `INSERT INTO factor_snapshots
      (symbol, trade_date, quality_factor, value_factor, growth_factor,
       momentum_factor, risk_factor, sector_strength_factor, factor_score, explanations)
     VALUES ($1, $2, 0.85, 0.72, 0.78, 0.80, 0.15, 0.68, 0.75, '{"test":"fixture"}')
     ON CONFLICT (symbol, trade_date) DO NOTHING`,
    [FIXTURE_SYMBOL, FIXED_DATE]
  );
  console.log('  [ok] factor_snapshots');

  // 6. Prediction registry row
  await dbAdapter.query(
    `INSERT INTO prediction_registry
      (symbol, prediction_date, ranking_score, classification, confidence_score,
       confidence_level, quality_score, growth_score, value_score,
       momentum_score, risk_score, sector_score, prediction_horizon, created_by)
     VALUES ($1, $2, 85.0, 'Excellent', 90.0, 'Very High',
             82.0, 78.0, 72.0, 80.0, 12.0, 68.0, 30, 'ManualSnapshot')
     ON CONFLICT (symbol, prediction_date, prediction_horizon) DO NOTHING`,
    [FIXTURE_SYMBOL, FIXED_DATE]
  );
  console.log('  [ok] prediction_registry');

  // 7. Benchmark observation (if table exists)
  try {
    await dbAdapter.query(
      `INSERT INTO benchmark_observations (date, nifty50, nifty100, nifty500, equal_weight, source)
       VALUES ($1, 18500.0, 19200.0, 19800.0, 19000.0, 'test-fixture')
       ON CONFLICT (date) DO NOTHING`,
      [FIXED_DATE]
    );
    console.log('  [ok] benchmark_observations');
  } catch {
    console.log('  [skip] benchmark_observations (table may not exist)');
  }

  // 8. Verify fixture was seeded
  const result = await dbAdapter.query(
    'SELECT symbol FROM symbols WHERE symbol = $1',
    [FIXTURE_SYMBOL]
  );
  if (result.rows.length === 0) {
    throw new Error(`Fixture symbol ${FIXTURE_SYMBOL} was not seeded successfully.`);
  }

  console.log(`[seed:ci] Fixture seeding complete. Symbol: ${FIXTURE_SYMBOL}, Date: ${FIXED_DATE}`);
}

(async () => {
  try {
    await seed();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[seed:ci] FAILED: ${msg}`);
    process.exitCode = 1;
  } finally {
    await dbAdapter.shutdown();
  }
})();
