/**
 * dataPlaneHealthBuilder.ts — Internal data-plane health report builder.
 *
 * Aggregates health from all data-plane subsystems into a single report.
 * Designed for admin CLI / internal use — never exposed on public routes.
 */

import { EodDataCacheService } from '../../services/marketData/EodDataCacheService';
import { ProviderQuotaMonitor } from '../../services/scheduler/ProviderQuotaMonitor';
import { DataPlaneHealthReport } from './dataPlaneHealthContracts';
import { getSnapshotReadiness } from './snapshotReadiness';

/**
 * Build a comprehensive health report for the internal data plane.
 */
export async function buildDataPlaneHealthReport(): Promise<DataPlaneHealthReport> {
  const now = new Date().toISOString();

  // EOD refresh status
  const eodOk: boolean = true; // TODO: check persistent last-run metadata
  const eodLastRun: string | null = null;

  // Precompute status
  const precomputeOk: boolean = true;
  const precomputeLastRun: string | null = null;

  // Cache cleanup status
  const cleanupOk: boolean = true;
  const cleanupLastRun: string | null = null;

  // Cache health and quota health (share a single ProviderQuotaMonitor.getReport call)
  let cacheHitRate = 0;
  const staleEntries = 0;
  const totalEntries = 0;
  let cacheOk = false;
  let totalCallsToday = 0;
  let totalCallsThisHour = 0;
  let budgetExhausted = false;
  let quotaOk = false;

  try {
    const report = await ProviderQuotaMonitor.getReport();
    cacheHitRate = report.summary.cacheHitRate;
    totalCallsToday = report.summary.totalCallsToday;
    totalCallsThisHour = report.summary.totalCallsThisHour;
    budgetExhausted = report.summary.budgetExhausted;
    cacheOk = true;
    quotaOk = !budgetExhausted;
  } catch {
    // report unavailable — defaults remain (false / 0)
  }

  // Snapshot readiness — use stored last-run timestamps (TODO: from JobRunStore)
  const lastRunTimestamps: Record<string, string | null> = {};
  const readinessMap = await getSnapshotReadiness(lastRunTimestamps);
  const snapshotSummary = Object.values(readinessMap);
  const available = snapshotSummary.filter((s) => s.ok).length;
  const total = snapshotSummary.length;
  const snapshotsOk = available > 0;

  // Circuit breaker health
  const circuitBreakersActive: string[] = []; // TODO: query circuit breaker service
  const circuitBreakersOk = circuitBreakersActive.length === 0;

  // Overall assessment
  const checks = [eodOk, precomputeOk, cleanupOk, cacheOk, quotaOk, snapshotsOk, circuitBreakersOk];
  const okCount = checks.filter(Boolean).length;
  const overallOk = okCount === checks.length;
  const degraded = okCount < checks.length && okCount > 0;

  return {
    generatedAt: now,
    eodRefreshRun: { lastRun: eodLastRun, ok: eodOk },
    precomputeRun: { lastRun: precomputeLastRun, ok: precomputeOk },
    cacheCleanupRun: { lastRun: cleanupLastRun, ok: cleanupOk },
    cache: { hitRate: cacheHitRate, staleEntries, totalEntries, ok: cacheOk },
    quota: { totalCallsToday, totalCallsThisHour, budgetExhausted, ok: quotaOk },
    snapshots: { available, total, ok: snapshotsOk },
    circuitBreakers: { active: circuitBreakersActive, ok: circuitBreakersOk },
    overall: { ok: overallOk, degraded },
  };
}
