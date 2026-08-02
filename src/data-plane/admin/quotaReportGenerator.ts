/**
 * quotaReportGenerator.ts — Internal provider quota report generator.
 *
 * Produces a structured quota report for admin/ops use. Never exposed
 * on public routes.
 */

import { ProviderQuotaMonitor } from '../../services/scheduler/ProviderQuotaMonitor';

export interface QuotaReportEntry {
  totalCallsToday: number;
  totalCallsThisHour: number;
  cacheHitRate: number;
  budgetExhausted: boolean;
}

export interface QuotaReportOutput {
  generatedAt: string;
  data: QuotaReportEntry;
}

/**
 * Generate a quota report snapshot for internal use.
 */
export async function generateQuotaReport(): Promise<QuotaReportOutput> {
  const raw = await ProviderQuotaMonitor.getReport();
  return {
    generatedAt: new Date().toISOString(),
    data: {
      totalCallsToday: raw.summary.totalCallsToday,
      totalCallsThisHour: raw.summary.totalCallsThisHour,
      cacheHitRate: raw.summary.cacheHitRate,
      budgetExhausted: raw.summary.budgetExhausted,
    },
  };
}
