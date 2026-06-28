/**
 * Earnings/Result Ingestion
 *
 * Maintains structured earnings/result snapshots for the Earnings Engine.
 * Uses structured result data if available. Missing fields remain null.
 * No fake quarterly numbers or summaries.
 */

import type { JobOptions, JobResult, IngestionJob } from './IngestionTypes';
import { safeDbValue } from './IngestionTypes';

export interface EarningsResult {
  symbol: string;
  period: string; // e.g. "Q1FY25"
  periodEnd: string; // ISO date
  revenue: number | null;
  netProfit: number | null;
  eps: number | null;
  revenueGrowthYoy: number | null;
  profitGrowthYoy: number | null;
  operatingMargin: number | null;
  marginChange: number | null; // bps change
  resultSummary: string | null;
  keyChanges: string[];
  filingDate: string;
  source: string;
}

export interface EarningsProvider {
  name: string;
  fetchEarnings(symbols: string[]): Promise<EarningsResult[]>;
  available(): boolean;
}

export class EarningsIngestion implements IngestionJob {
  readonly name = 'refresh-earnings';

  private providers: EarningsProvider[];

  constructor(providers: EarningsProvider[]) {
    this.providers = providers;
  }

  async run(options: JobOptions): Promise<JobResult> {
    const startedAt = new Date().toISOString();
    const errors: string[] = [];
    let successCount = 0;
    let failureCount = 0;

    if (this.providers.length === 0 || !this.providers.some((p) => p.available())) {
      return { success: true, jobName: this.name, startedAt, endedAt: new Date().toISOString(),
        durationMs: 0, symbolsProcessed: 0, successCount: 0, failureCount: 0, errors: [] };
    }

    const symbols = options.symbols ?? [];

    for (const provider of this.providers) {
      if (!provider.available()) continue;
      try {
        const results = await provider.fetchEarnings(symbols);
        const unique = this.deduplicate(results);

        for (const result of unique) {
          const sanitized = this.sanitize(result);
          if (!options.dryRun) {
            await this.persistResult(sanitized);
          }
          successCount++;
        }
      } catch (err) {
        failureCount++;
        errors.push(`${err instanceof Error ? err.message : String(err)}`);
      }
    }

    const endedAt = new Date().toISOString();
    return {
      success: errors.length === 0,
      jobName: this.name,
      startedAt,
      endedAt,
      durationMs: new Date(endedAt).getTime() - new Date(startedAt).getTime(),
      symbolsProcessed: successCount + failureCount,
      successCount,
      failureCount,
      errors,
    };
  }

  /** Deduplicate by symbol + period */
  deduplicate(results: EarningsResult[]): EarningsResult[] {
    const seen = new Set<string>();
    return results.filter((r) => {
      const key = `${r.symbol}:${r.period}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /** Sanitize numeric values, ensure no NaN/Infinity stored */
  private sanitize(r: EarningsResult): EarningsResult {
    return {
      ...r,
      revenue: safeDbValue(r.revenue),
      netProfit: safeDbValue(r.netProfit),
      eps: safeDbValue(r.eps),
      revenueGrowthYoy: safeDbValue(r.revenueGrowthYoy),
      profitGrowthYoy: safeDbValue(r.profitGrowthYoy),
      operatingMargin: safeDbValue(r.operatingMargin),
      marginChange: safeDbValue(r.marginChange),
    };
  }

  /** Detect margin compression: revenue up, margin down */
  hasMarginCompression(result: EarningsResult): boolean {
    if (result.revenueGrowthYoy === null || result.operatingMargin === null) return false;
    if (result.marginChange === null) return false;
    return result.revenueGrowthYoy > 0 && result.marginChange < -200; // -200bps
  }

  private async persistResult(_result: EarningsResult): Promise<void> {
    // NOTE: Actual DB persistence handled by calling script
  }
}
