/**
 * Orchestrator — Top-level coordination for Phase 20B scheduled jobs.
 *
 * Wires together EOD refresh, precomputed analytics, and quota monitoring
 * with safe job locking to prevent stampede.
 *
 * This is the entry point called from server start, cron, or manual trigger.
 * It never blocks on a locked job — if another instance is already running
 * the same job, it skips gracefully.
 */

import { EodRefreshScheduler, type EodRefreshConfig } from './EodRefreshScheduler';
import { PrecomputeScheduler } from './PrecomputeScheduler';
import { ProviderQuotaMonitor } from './ProviderQuotaMonitor';
import { JobLock } from './JobLock';

export interface OrchestrationResult {
  eodRefresh: { skipped: boolean; result?: unknown; error?: string };
  precompute: { skipped: boolean; result?: unknown; error?: string };
  quotaReport: unknown;
}

export class Orchestrator {
  /**
   * Run the full scheduled refresh pipeline.
   *
   * @param symbols  Active universe to refresh.
   */
  static async runFullCycle(symbols: string[]): Promise<OrchestrationResult> {
    // -----------------------------------------------------------------------
    // 1. EOD refresh with job lock
    // -----------------------------------------------------------------------
    let eodRefresh: OrchestrationResult['eodRefresh'] = { skipped: false };

    const eodLocked = await JobLock.acquire('eod-refresh', 600_000);
    if (eodLocked) {
      try {
        const config: EodRefreshConfig = {
          budgetPerCycle: 150,
          symbols,
          namespaces: ['quote', 'profile', 'financials'],
          cooldownMs: 86_400_000,
        };
        eodRefresh.result = await EodRefreshScheduler.runCycle(config);
      } catch (err: unknown) {
        eodRefresh.error = err instanceof Error ? err.message : String(err);
      } finally {
        await JobLock.release('eod-refresh');
      }
    } else {
      eodRefresh = { skipped: true };
    }

    // -----------------------------------------------------------------------
    // 2. Precompute snapshots with job lock
    // -----------------------------------------------------------------------
    let precompute: OrchestrationResult['precompute'] = { skipped: false };

    const preLocked = await JobLock.acquire('precompute-snapshots', 600_000);
    if (preLocked) {
      try {
        precompute.result = await PrecomputeScheduler.runAll();
      } catch (err: unknown) {
        precompute.error = err instanceof Error ? err.message : String(err);
      } finally {
        await JobLock.release('precompute-snapshots');
      }
    } else {
      precompute = { skipped: true };
    }

    // -----------------------------------------------------------------------
    // 3. Quota report
    // -----------------------------------------------------------------------
    const quotaReport = await ProviderQuotaMonitor.getReport();

    return { eodRefresh, precompute, quotaReport };
  }
}
