/**
 * Deterministic CI Fixture Seeding.
 * Seeds a known fixture symbol (TESTIT) into PostgreSQL or SQLite for CI tests.
 *
 * Rules:
 * - Uses dialect-aware upserts; safe to rerun.
 * - Uses $1-style parameterization through the canonical adapter.
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
const FIXTURE_SYMBOL = 'TESTIT';

async function dialectQuery(postgresSql: string, sqliteSql: string, params: unknown[]): Promise<void> {
  await dbAdapter.query(dbAdapter.kind === 'sqlite' ? sqliteSql : postgresSql, params);
}

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

  console.log(`[seed:ci] Seeding fixture symbol: ${FIXTURE_SYMBOL} via ${dbAdapter.kind}`);

  await dialectQuery(
    `INSERT INTO symbols (symbol, exchange, company_name, sector, industry, listing_status)
     VALUES ($1, 'NSE', 'Test Integration Inc.', 'Technology', 'Software', 'Active')
     ON CONFLICT (symbol) DO UPDATE SET
       company_name = EXCLUDED.company_name,
       sector = EXCLUDED.sector,
       industry = EXCLUDED.industry`,
    `INSERT OR REPLACE INTO symbols (symbol, exchange, company_name, sector, industry, listing_status)
     VALUES ($1, 'NSE', 'Test Integration Inc.', 'Technology', 'Software', 'Active')`,
    [FIXTURE_SYMBOL],
  );
  console.log('  [ok] symbols');

  await dialectQuery(
    `INSERT INTO daily_prices (symbol, trade_date, open, high, low, close, adjusted_close, volume)
     VALUES ($1, $2, 100.0, 105.0, 98.0, 102.5, 102.5, 1000000)
     ON CONFLICT (symbol, trade_date) DO UPDATE SET
       close = EXCLUDED.close,
       adjusted_close = EXCLUDED.adjusted_close`,
    `INSERT OR REPLACE INTO daily_prices (symbol, trade_date, open, high, low, close, adjusted_close, volume)
     VALUES ($1, $2, 100.0, 105.0, 98.0, 102.5, 102.5, 1000000)`,
    [FIXTURE_SYMBOL, FIXED_DATE],
  );
  console.log('  [ok] daily_prices');

  await dialectQuery(
    `INSERT INTO financial_snapshots
      (symbol, period_end, market_cap, pe_ratio, pb_ratio, eps, dividend_yield, beta,
       fcf_yield, ev_ebitda, roa, roe, debt_to_equity, current_ratio,
       revenue_growth, profit_growth, operating_margin)
     VALUES ($1, $2, 500000000000, 25.5, 4.5, 45.0, 1.2, 0.95,
             3.5, 18.0, 12.0, 22.0, 0.3, 2.1,
             15.0, 12.0, 28.0)
     ON CONFLICT (symbol, period_end) DO NOTHING`,
    `INSERT OR IGNORE INTO financial_snapshots
      (symbol, period_end, market_cap, pe_ratio, pb_ratio, eps, dividend_yield, beta,
       fcf_yield, ev_ebitda, roa, roe, debt_to_equity, current_ratio,
       revenue_growth, profit_growth, operating_margin)
     VALUES ($1, $2, 500000000000, 25.5, 4.5, 45.0, 1.2, 0.95,
             3.5, 18.0, 12.0, 22.0, 0.3, 2.1,
             15.0, 12.0, 28.0)`,
    [FIXTURE_SYMBOL, FIXED_DATE],
  );
  console.log('  [ok] financial_snapshots');

  try {
    await dialectQuery(
      `INSERT INTO feature_snapshots
        (symbol, trade_date, rsi, macd, macd_signal, macd_histogram,
         adx, atr, bollinger_width, momentum, volatility, relative_strength,
         moving_average_distance, trend_strength)
       VALUES ($1, $2, 55.0, 1.5, 1.2, 0.3, 25.0, 2.5, 4.0, 5.0, 18.0, 0.85, 3.0, 0.6)
       ON CONFLICT (symbol, trade_date) DO NOTHING`,
      `INSERT OR IGNORE INTO feature_snapshots
        (symbol, trade_date, rsi, macd, macd_signal, macd_histogram,
         adx, atr, bollinger_width, momentum, volatility, relative_strength,
         moving_average_distance, trend_strength)
       VALUES ($1, $2, 55.0, 1.5, 1.2, 0.3, 25.0, 2.5, 4.0, 5.0, 18.0, 0.85, 3.0, 0.6)`,
      [FIXTURE_SYMBOL, FIXED_DATE],
    );
    console.log('  [ok] feature_snapshots');
  } catch {
    try {
      await dbAdapter.query(
        `INSERT OR REPLACE INTO feature_snapshots
          (symbol, trade_date, rsi_14, macd, macd_signal, macd_histogram,
           momentum_20, momentum_50, volatility_20, drawdown_20, relative_strength_20,
           volume_trend_20, price_strength_20, sma_20, sma_50, sma_200)
         VALUES ($1, $2, 55.0, 1.5, 1.2, 0.3, 5.0, 7.0, 18.0, -4.0, 0.85, 1.1, 3.0, 100.0, 98.0, 95.0)`,
        [FIXTURE_SYMBOL, FIXED_DATE],
      );
      console.log('  [ok] feature_snapshots (legacy shape)');
    } catch {
      console.log('  [skip] feature_snapshots (table shape may differ)');
    }
  }

  try {
    await dialectQuery(
      `INSERT INTO factor_snapshots
        (symbol, trade_date, quality_factor, value_factor, growth_factor,
         momentum_factor, risk_factor, sector_strength_factor, factor_score, explanations)
       VALUES ($1, $2, 0.85, 0.72, 0.78, 0.80, 0.15, 0.68, 0.75, '{"test":"fixture"}')
       ON CONFLICT (symbol, trade_date) DO NOTHING`,
      `INSERT OR IGNORE INTO factor_snapshots
        (symbol, trade_date, quality_factor, value_factor, growth_factor,
         momentum_factor, risk_factor, sector_strength_factor, factor_score, explanations)
       VALUES ($1, $2, 0.85, 0.72, 0.78, 0.80, 0.15, 0.68, 0.75, '{"test":"fixture"}')`,
      [FIXTURE_SYMBOL, FIXED_DATE],
    );
    console.log('  [ok] factor_snapshots');
  } catch {
    try {
      await dbAdapter.query(
        `INSERT OR REPLACE INTO factor_snapshots
          (symbol, trade_date, quality_factor, value_factor, growth_factor,
           momentum_factor, risk_factor, sector_strength_factor, factor_score)
         VALUES ($1, $2, 0.85, 0.72, 0.78, 0.80, 0.15, 0.68, 0.75)`,
        [FIXTURE_SYMBOL, FIXED_DATE],
      );
      console.log('  [ok] factor_snapshots (legacy shape)');
    } catch {
      console.log('  [skip] factor_snapshots (table shape may differ)');
    }
  }

  await dialectQuery(
    `INSERT INTO prediction_registry
      (symbol, prediction_date, ranking_score, classification, confidence_score,
       confidence_level, quality_score, growth_score, value_score,
       momentum_score, risk_score, sector_score, price_at_prediction, prediction_horizon, created_by)
     VALUES ($1, $2, 85.0, 'Excellent', 90.0, 'Very High',
             82.0, 78.0, 72.0, 80.0, 12.0, 68.0, 102.5, 30, 'ManualSnapshot')
     ON CONFLICT (symbol, prediction_date, prediction_horizon) DO UPDATE SET
       ranking_score = EXCLUDED.ranking_score,
       classification = EXCLUDED.classification,
       confidence_score = EXCLUDED.confidence_score,
       confidence_level = EXCLUDED.confidence_level,
       quality_score = EXCLUDED.quality_score,
       growth_score = EXCLUDED.growth_score,
       value_score = EXCLUDED.value_score,
       momentum_score = EXCLUDED.momentum_score,
       risk_score = EXCLUDED.risk_score,
       sector_score = EXCLUDED.sector_score,
       price_at_prediction = EXCLUDED.price_at_prediction,
       created_by = EXCLUDED.created_by`,
    `INSERT OR REPLACE INTO prediction_registry
      (symbol, prediction_date, ranking_score, classification, confidence_score,
       confidence_level, quality_score, growth_score, value_score,
       momentum_score, risk_score, sector_score, price_at_prediction, prediction_horizon, created_by)
     VALUES ($1, $2, 85.0, 'Excellent', 90.0, 'Very High',
             82.0, 78.0, 72.0, 80.0, 12.0, 68.0, 102.5, 30, 'ManualSnapshot')`,
    [FIXTURE_SYMBOL, FIXED_DATE],
  );
  console.log('  [ok] prediction_registry');

  try {
    await dialectQuery(
      `INSERT INTO benchmark_observations (date, nifty50, nifty100, nifty500, equal_weight, source)
       VALUES ($1, 18500.0, 19200.0, 19800.0, 19000.0, 'test-fixture')
       ON CONFLICT (date) DO NOTHING`,
      `INSERT OR IGNORE INTO benchmark_observations (date, nifty50, nifty100, nifty500, equal_weight, source)
       VALUES ($1, 18500.0, 19200.0, 19800.0, 19000.0, 'test-fixture')`,
      [FIXED_DATE],
    );
    console.log('  [ok] benchmark_observations');
  } catch {
    console.log('  [skip] benchmark_observations (table may not exist)');
  }

  const result = await dbAdapter.query('SELECT symbol FROM symbols WHERE symbol = $1', [FIXTURE_SYMBOL]);
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
