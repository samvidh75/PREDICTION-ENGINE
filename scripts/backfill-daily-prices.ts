/**
 * backfill-daily-prices.ts
 *
 * Real replacement for the deleted backfill-public-market-history.ts, which
 * imported a non-existent module and pulled in KSE100_SYMBOLS (Karachi
 * Stock Exchange — Pakistan) with usage examples referencing Pakistani
 * tickers (HBL, ENGRO). This script does the same job for real: backfills
 * daily_prices with genuine PSE OHLCV from EODHD.
 *
 * This unlocks the ALREADY-BUILT, previously-starved pipeline:
 *   daily_prices -> FeatureEngine (real RSI/MACD/ADX/ATR from real OHLCV)
 *   -> feature_snapshots -> PredictionFactory -> LensoryEngine's
 *   MomentumEngine (real momentum scoring instead of neutral defaults).
 * It also backfills the 'PSEI' benchmark row that BenchmarkTracker,
 * OutcomeValidationEngine, and HistoricalRankingRebuilder already query.
 *
 * Usage:
 *   tsx scripts/backfill-daily-prices.ts [--limit=50] [--dry-run]
 */
import 'dotenv/config';
import pool from '../src/db/index';
import MasterCompanyRegistry from '../src/services/data/MasterCompanyRegistry';
import { eodhdCandleProvider } from '../src/services/providers/EodhdCandleProvider';

const PSEI_BENCHMARK_SYMBOL = 'PSEI';

async function upsertCandles(symbol: string, candles: Array<{ date: string; open: number; high: number; low: number; close: number; volume: number }>) {
  for (const c of candles) {
    await pool.query(
      `INSERT INTO daily_prices (symbol, trade_date, open, high, low, close, volume)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (symbol, trade_date) DO UPDATE SET
         open = EXCLUDED.open, high = EXCLUDED.high, low = EXCLUDED.low,
         close = EXCLUDED.close, volume = EXCLUDED.volume`,
      [symbol, c.date, c.open, c.high, c.low, c.close, c.volume],
    );
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : undefined;

  if (!eodhdCandleProvider.available()) {
    console.error('EODHD_KEY not set — nothing to backfill.');
    process.exitCode = 1;
    return;
  }

  const toDate = new Date().toISOString().split('T')[0];
  const fromDate = new Date(Date.now() - 380 * 86400000).toISOString().split('T')[0];

  const symbols = MasterCompanyRegistry.getInstance().getAll().map((c) => c.symbol);
  const targets = [PSEI_BENCHMARK_SYMBOL, ...symbols];
  const toProcess = limit ? targets.slice(0, limit) : targets;

  let succeeded = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const symbol of toProcess) {
    try {
      const candles = await eodhdCandleProvider.fetchPrices(symbol, fromDate, toDate);
      if (candles.length === 0) {
        failed++;
        failures.push(symbol);
        continue;
      }
      if (!dryRun) {
        await upsertCandles(symbol, candles);
      }
      succeeded++;
    } catch (err) {
      failed++;
      failures.push(symbol);
      console.error(`[backfill-daily-prices] ${symbol}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(JSON.stringify({
    dryRun,
    processed: toProcess.length,
    succeeded,
    failed,
    failures,
  }, null, 2));

  if (failed > 0 && succeeded === 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('[backfill-daily-prices] Fatal error:', err);
  process.exitCode = 1;
});
