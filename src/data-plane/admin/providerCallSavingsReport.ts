/**
 * providerCallSavingsReport.ts — Internal report of provider call savings from caching.
 *
 * Estimates how many provider calls were avoided by the cache-first data plane.
 * Uses cache hit/miss counters from ProviderQuotaMonitor and EodDataCacheService
 * to produce a structured report.
 *
 * Admin-only — never exposed on public routes.
 */

import { ProviderQuotaMonitor } from '../../services/scheduler/ProviderQuotaMonitor';

export interface ProviderCallSavingsEntry {
  provider: string;
  totalCallsToday: number;
  cacheHitRate: number;
  estimatedSavings: number;
}

export interface ProviderCallSavingsReport {
  generatedAt: string;
  entries: ProviderCallSavingsEntry[];
  summary: {
    totalCallsToday: number;
    totalCacheHitsToday: number;
    totalEstimatedSavings: number;
    effectiveCallReduction: number;
  };
}

/**
 * Build a provider call savings report showing how caching reduces provider load.
 *
 * The report computes:
 *   - estimatedSavings: the number of provider calls that would have been made
 *     without caching, based on the current cache hit rate.
 *   - effectiveCallReduction: the ratio of avoided calls to theoretical total.
 */
export async function buildProviderCallSavingsReport(): Promise<ProviderCallSavingsReport> {
  const now = new Date().toISOString();

  let totalCallsToday: number;
  let cacheHitRate: number;
  const perProvider: Record<string, number> = {};
  const perProviderErrors: Record<string, number> = {};

  try {
    const report = await ProviderQuotaMonitor.getReport();
    totalCallsToday = report.summary.totalCallsToday;
    cacheHitRate = report.summary.cacheHitRate;
    Object.assign(perProvider, report.perProvider);
    Object.assign(perProviderErrors, report.providerErrors);
  } catch {
    // Report unavailable — return empty report
    return {
      generatedAt: now,
      entries: [],
      summary: {
        totalCallsToday: 0,
        totalCacheHitsToday: 0,
        totalEstimatedSavings: 0,
        effectiveCallReduction: 0,
      },
    };
  }

  const entries: ProviderCallSavingsEntry[] = Object.entries(perProvider)
    .filter(([provider]) => provider !== '__total__')
    .map(([provider, calls]) => {
      const errors = perProviderErrors[provider] ?? 0;
      const actual = calls + errors;
      // Estimate savings: if cache hit rate is H, then for every 1 actual call,
      // roughly H/(1-H) calls were avoided.
      const hitRatio = Math.min(cacheHitRate, 0.99); // cap to avoid division issues
      const estimatedSavings = hitRatio > 0 ? Math.round(actual * (hitRatio / (1 - hitRatio))) : 0;
      return {
        provider,
        totalCallsToday: actual,
        cacheHitRate,
        estimatedSavings,
      };
    });

  const totalEstimatedSavings = entries.reduce((sum, e) => sum + e.estimatedSavings, 0);
  const theoreticalTotal = totalCallsToday + totalEstimatedSavings;
  const effectiveCallReduction = theoreticalTotal > 0
    ? totalEstimatedSavings / theoreticalTotal
    : 0;

  return {
    generatedAt: now,
    entries,
    summary: {
      totalCallsToday,
      totalCacheHitsToday: Math.round(totalCallsToday * (cacheHitRate / (1 - Math.min(cacheHitRate, 0.99)))),
      totalEstimatedSavings,
      effectiveCallReduction,
    },
  };
}
