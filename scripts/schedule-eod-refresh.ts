/**
 * schedule-eod-refresh.ts — CLI entry point for running the scheduled EOD refresh.
 *
 * Invoked by cron, systemd timer, or manual execution.
 *
 * Usage:
 *   npx tsx scripts/schedule-eod-refresh.ts [--budget 150] [--symbols "RELIANCE,TCS,INFY"]
 *
 * When --symbols is omitted, the active universe is inferred from the
 * `stocks` table (stocks with recent activity).
 *
 * This script:
 *   1. Acquires a distributed lock so only one instance runs
 *   2. Runs the EOD refresh cycle
 *   3. Runs the precompute snapshot cycle
 *   4. Logs the quota report at the end
 *   5. Releases the lock
 */

import { dbAdapter } from '../src/db/DatabaseAdapter';
import { JobLock } from '../src/services/scheduler/JobLock';
import { EodRefreshScheduler, type EodRefreshConfig } from '../src/services/scheduler/EodRefreshScheduler';
import { PrecomputeScheduler } from '../src/services/scheduler/PrecomputeScheduler';
import { ProviderQuotaMonitor } from '../src/services/scheduler/ProviderQuotaMonitor';

async function main() {
  // Parse args
  const args = process.argv.slice(2);
  const budgetIdx = args.indexOf('--budget');
  const budget = budgetIdx >= 0 ? parseInt(args[budgetIdx + 1], 10) : 150;

  const symbolsIdx = args.indexOf('--symbols');
  let symbols: string[] = [];
  if (symbolsIdx >= 0 && args[symbolsIdx + 1]) {
    symbols = args[symbolsIdx + 1].split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
  }

  // Ensure DB initialized
  await dbAdapter.initialize();
  if (dbAdapter.kind === 'unavailable') {
    console.error('[eod-refresh] Database unavailable — aborting');
    process.exit(1);
  }

  // Resolve active universe from DB if not provided
  if (symbols.length === 0) {
    try {
      const res = await dbAdapter.query(
        `SELECT DISTINCT symbol FROM stocks WHERE symbol IS NOT NULL ORDER BY symbol LIMIT 500`,
      );
      symbols = res.rows.map((r: { symbol: string }) => r.symbol).filter(Boolean);
    } catch {
      console.warn('[eod-refresh] Could not read stocks table, using empty universe');
    }
  }

  console.log(`[eod-refresh] Starting cycle for ${symbols.length} symbols (budget: ${budget})`);

  // Acquire lock
  const locked = await JobLock.acquire('eod-full-cycle', 600_000);
  if (!locked) {
    console.log('[eod-refresh] Another instance holds the lock — skipping');
    await dbAdapter.shutdown();
    return;
  }

  try {
    // 1. Run EOD refresh
    const config: EodRefreshConfig = {
      budgetPerCycle: budget,
      symbols,
      namespaces: ['quote', 'profile', 'financials'],
      cooldownMs: 86_400_000,
    };

    console.time('eod-refresh');
    const refreshResult = await EodRefreshScheduler.runCycle(config);
    console.timeEnd('eod-refresh');

    console.log(`[eod-refresh] Attempted: ${refreshResult.attempted}`);
    console.log(`[eod-refresh] Cache hits: ${refreshResult.cacheHit}`);
    console.log(`[eod-refresh] Provider calls: ${refreshResult.providerCalled}`);
    console.log(`[eod-refresh] Succeeded: ${refreshResult.succeeded}`);
    console.log(`[eod-refresh] Failed: ${refreshResult.failed}`);
    console.log(`[eod-refresh] Budget exhausted: ${refreshResult.budgetExhausted}`);
    console.log(`[eod-refresh] Elapsed: ${refreshResult.elapsedMs}ms`);

    // 2. Run precompute snapshots
    console.time('precompute');
    const preResult = await PrecomputeScheduler.runAll();
    console.timeEnd('precompute');
    console.log(`[eod-refresh] Precompute results:`, preResult);

    // 3. Quota report
    const quota = await ProviderQuotaMonitor.getReport();
    console.log(`[eod-refresh] Quota report:`, JSON.stringify(quota.summary, null, 2));
  } finally {
    await JobLock.release('eod-full-cycle');
  }

  await dbAdapter.shutdown();
  console.log('[eod-refresh] Cycle complete');
}

main().catch((err) => {
  console.error('[eod-refresh] Fatal error:', err);
  process.exit(1);
});
