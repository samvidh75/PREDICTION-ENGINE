/**
 * schedule-prediction-refresh.ts — CLI entry point for the scheduled real
 * prediction pipeline. Invoked by cron, a Render cron job, or manually.
 *
 * This is the production wiring for the pipeline proven out in
 * scripts/verify-real-prediction-pipeline.ts:
 *
 *   EODHD candles -> daily_prices -> FeatureEngine -> feature_snapshots
 *   -> FactorEngine -> factor_snapshots -> PredictionFactory.generateDaily()
 *   -> prediction_registry
 *
 * Follows the same lock/lifecycle pattern as schedule-eod-refresh.ts:
 *   1. Acquire a distributed lock so only one instance runs
 *   2. Backfill real daily_prices from EODHD for the verified PSE universe
 *   3. Recompute real features/factors for each symbol
 *   4. Generate today's predictions
 *   5. Release the lock
 *
 * Usage:
 *   npx tsx scripts/schedule-prediction-refresh.ts [--limit 60]
 *
 * Suggested cron: once daily, after PSE market close (PSE trades
 * 09:30-15:30 PHT / UTC+8, so ~16:00 PHT / 08:00 UTC is a safe window).
 */
import 'dotenv/config';
import { dbAdapter } from '../src/db/DatabaseAdapter';
import { JobLock } from '../src/services/scheduler/JobLock';
import MasterCompanyRegistry from '../src/services/data/MasterCompanyRegistry';
import { eodhdCandleProvider } from '../src/services/providers/EodhdCandleProvider';
import { featureEngine } from '../src/services/FeatureEngine';
import { factorEngine } from '../src/services/FactorEngine';
import { PredictionFactory } from '../src/predictions/PredictionFactory';

const JOB_NAME = 'prediction-refresh';
const JOB_TTL_MS = 30 * 60 * 1000; // 30 minutes — generous for a full-universe run

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find((a) => a.startsWith('--limit'));
  const limit = limitArg ? Number(limitArg.split(/[= ]/)[1] ?? args[args.indexOf(limitArg) + 1]) : undefined;

  await dbAdapter.initialize();
  if (dbAdapter.kind === 'unavailable') {
    console.error('[prediction-refresh] Database unavailable — aborting');
    process.exitCode = 1;
    return;
  }

  if (!eodhdCandleProvider.available()) {
    console.error('[prediction-refresh] EODHD_KEY not set — aborting');
    process.exitCode = 1;
    return;
  }

  const locked = await JobLock.acquire(JOB_NAME, JOB_TTL_MS);
  if (!locked) {
    console.log('[prediction-refresh] Another instance holds the lock — skipping this run.');
    return;
  }

  const startedAt = Date.now();
  try {
    const companies = MasterCompanyRegistry.getInstance().getAll();
    const targets = limit ? companies.slice(0, limit) : companies;

    console.log(`[prediction-refresh] Backfilling real EODHD data for ${targets.length} symbols...`);
    let priceOk = 0;
    let priceFailed = 0;
    for (const c of targets) {
      const candles = await eodhdCandleProvider.fetchPrices(c.symbol, dateNDaysAgo(380), today());
      if (candles.length === 0) {
        priceFailed++;
        continue;
      }
      for (const cd of candles) {
        await dbAdapter.query(
          `INSERT INTO daily_prices (symbol, trade_date, open, high, low, close, volume) VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (symbol, trade_date) DO UPDATE SET close=EXCLUDED.close, high=EXCLUDED.high, low=EXCLUDED.low, open=EXCLUDED.open, volume=EXCLUDED.volume`,
          [c.symbol, cd.date, cd.open, cd.high, cd.low, cd.close, cd.volume],
        );
      }
      await dbAdapter.query(
        `INSERT INTO symbols (symbol, sector, industry) VALUES ($1,$2,$3)
         ON CONFLICT (symbol) DO UPDATE SET sector=EXCLUDED.sector, industry=EXCLUDED.industry`,
        [c.symbol, c.sector, c.industry],
      );

      // Real trailing dividend yield from EODHD's /div/ endpoint (works on
      // the free tier, unlike /fundamentals/). This is the one real
      // fundamentals-adjacent signal available today — everything else
      // (P/E, ROE, debt/equity, etc.) still has no free data source and
      // stays null rather than guessed at.
      const latestClose = candles[candles.length - 1]?.close;
      const dividendYield = latestClose
        ? await eodhdCandleProvider.computeTrailingDividendYield(c.symbol, latestClose)
        : null;
      if (dividendYield !== null) {
        await dbAdapter.query(
          `INSERT INTO financial_snapshots (symbol, period_end, dividend_yield) VALUES ($1,$2,$3)
           ON CONFLICT (symbol, period_end) DO UPDATE SET dividend_yield=EXCLUDED.dividend_yield`,
          [c.symbol, today(), dividendYield],
        );
      }

      await featureEngine.calculateAndStoreFeatures(c.symbol);
      await factorEngine.calculateAndStoreFactors(c.symbol);
      priceOk++;
    }
    console.log(`[prediction-refresh] Real price/feature/factor data: ${priceOk} ok, ${priceFailed} unavailable (no EODHD coverage).`);

    // Also refresh the PSEi benchmark itself, used by BenchmarkTracker /
    // OutcomeValidationEngine / HistoricalRankingRebuilder.
    const benchmarkCandles = await eodhdCandleProvider.fetchPrices('PSEI', dateNDaysAgo(380), today());
    for (const cd of benchmarkCandles) {
      await dbAdapter.query(
        `INSERT INTO daily_prices (symbol, trade_date, open, high, low, close, volume) VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (symbol, trade_date) DO UPDATE SET close=EXCLUDED.close`,
        ['PSEI', cd.date, cd.open, cd.high, cd.low, cd.close, cd.volume],
      );
    }
    console.log(`[prediction-refresh] PSEi benchmark: ${benchmarkCandles.length} bars refreshed.`);

    console.log('[prediction-refresh] Generating today\'s predictions...');
    const factory = new PredictionFactory();
    const summary = await factory.generateDaily([30, 90]);
    console.log('[prediction-refresh] Generation summary:', JSON.stringify(summary));

    const durationMs = Date.now() - startedAt;
    console.log(`[prediction-refresh] Cycle complete in ${Math.round(durationMs / 1000)}s.`);
  } catch (err) {
    console.error('[prediction-refresh] Fatal error during cycle:', err);
    process.exitCode = 1;
  } finally {
    await JobLock.release(JOB_NAME);
  }
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function dateNDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
}

main().catch((err) => {
  console.error('[prediction-refresh] Unhandled error:', err);
  process.exitCode = 1;
});
