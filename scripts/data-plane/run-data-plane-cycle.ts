/**
 * run-data-plane-cycle.ts — CLI entrypoint for running the full data-plane cycle.
 *
 * Orchestrates: EOD refresh → precompute snapshots → cache cleanup → quota report.
 * Each stage is optional — a failure in one stage does not prevent subsequent stages.
 *
 * Usage:
 *   npx tsx scripts/data-plane/run-data-plane-cycle.ts \
 *     [--budget 150] [--symbols "RELIANCE,TCS,INFY"] [--cleanup] [--dry-run]
 *
 * When --symbols is omitted, the active universe is auto-detected.
 * With --cleanup, expired cache entries are purged after the refresh cycle.
 * With --dry-run, no destructive operations are performed.
 */

import { EodRefreshScheduler, type EodRefreshConfig } from '../../src/services/scheduler/EodRefreshScheduler';
import { PrecomputeScheduler } from '../../src/services/scheduler/PrecomputeScheduler';
import { ProviderQuotaMonitor } from '../../src/services/scheduler/ProviderQuotaMonitor';
import { JobLock } from '../../src/services/scheduler/JobLock';
import { EodDataCacheService } from '../../src/services/marketData/EodDataCacheService';

interface CycleResult {
  eodRefresh: { ok: boolean; error?: string };
  precompute: { ok: boolean; error?: string };
  cacheCleanup: { ok: boolean; error?: string };
  quotaReport: unknown;
}

function parseArgs(): { budget: number; symbols: string[]; cleanup: boolean; dryRun: boolean } {
  const args = process.argv.slice(2);
  let budget = 150;
  let symbols: string[] = [];
  let cleanup = false;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--budget' && args[i + 1]) {
      budget = parseInt(args[++i], 10);
      if (Number.isNaN(budget) || budget < 1) budget = 150;
    } else if (args[i] === '--symbols' && args[i + 1]) {
      symbols = args[++i].split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
    } else if (args[i] === '--cleanup') {
      cleanup = true;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    }
  }
  return { budget, symbols, cleanup, dryRun };
}

async function main(): Promise<void> {
  const { budget, symbols, cleanup, dryRun } = parseArgs();
  const result: CycleResult = {
    eodRefresh: { ok: false },
    precompute: { ok: false },
    cacheCleanup: { ok: false },
    quotaReport: null,
  };

  if (dryRun) {
    console.log('[dry-run] Would run full data-plane cycle with:');
    console.log(`  budget=${budget}, symbols=${symbols.length > 0 ? symbols.join(',') : '(universe auto-detect)'}, cleanup=${cleanup}`);
    return;
  }

  // ── Stage 1: EOD refresh ────────────────────────────────────────────
  const eodLocked = await JobLock.acquire('eod-refresh', 600_000);
  if (eodLocked) {
    try {
      const config: EodRefreshConfig = {
        budgetPerCycle: budget,
        symbols,
        namespaces: ['quote', 'profile', 'financials'],
        cooldownMs: 86_400_000,
      };
      await EodRefreshScheduler.runCycle(config);
      result.eodRefresh.ok = true;
    } catch (err: unknown) {
      result.eodRefresh.error = err instanceof Error ? err.message : String(err);
    } finally {
      await JobLock.release('eod-refresh');
    }
  }

  // ── Stage 2: Precompute snapshots ────────────────────────────────────
  const preLocked = await JobLock.acquire('precompute-snapshots', 600_000);
  if (preLocked) {
    try {
      await PrecomputeScheduler.runAll();
      result.precompute.ok = true;
    } catch (err: unknown) {
      result.precompute.error = err instanceof Error ? err.message : String(err);
    } finally {
      await JobLock.release('precompute-snapshots');
    }
  }

  // ── Stage 3: Cache cleanup (optional) ────────────────────────────────
  if (cleanup) {
    const clLocked = await JobLock.acquire('cache-cleanup', 120_000);
    if (clLocked) {
      try {
        await EodDataCacheService.cleanupExpired();
        result.cacheCleanup.ok = true;
      } catch (err: unknown) {
        result.cacheCleanup.error = err instanceof Error ? err.message : String(err);
      } finally {
        await JobLock.release('cache-cleanup');
      }
    }
  }

  // ── Stage 4: Quota report ────────────────────────────────────────────
  try {
    result.quotaReport = await ProviderQuotaMonitor.getReport();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`Quota report unavailable: ${msg}`);
  }

  // ── Summary ──────────────────────────────────────────────────────────
  console.log(JSON.stringify(result, null, 2));

  if (!result.eodRefresh.ok || !result.precompute.ok) {
    process.exitCode = 1;
  }
}

main();
