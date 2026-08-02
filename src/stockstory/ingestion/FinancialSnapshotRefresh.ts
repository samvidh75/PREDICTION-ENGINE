/**
 * Financial Snapshot Refresh
 *
 * Refreshes financial inputs used by the intelligence engines.
 * Preserves provider precedence and does not overwrite higher-quality fields.
 * Missing fields remain null — no fake fallback values.
 */

import type { JobOptions, JobResult, IngestionJob } from './IngestionTypes';
import { safeDbValue } from './IngestionTypes';

export interface FinancialDataProvider {
  name: string;
  /** Lower priority number = preferred. E.g. yfinance=10, authorized=5 */
  priority: number;
  fetchFinancials(symbol: string): Promise<Partial<FinancialSnapshotFields> | null>;
  available(): boolean;
}

export interface FinancialSnapshotFields {
  marketCap: number | null;
  peRatio: number | null;
  pbRatio: number | null;
  eps: number | null;
  dividendYield: number | null;
  beta: number | null;
  freeFloat: number | null;
  fcfYield: number | null;
  evEbitda: number | null;
  roa: number | null;
  roe: number | null;
  roic: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  revenueGrowth: number | null;
  profitGrowth: number | null;
  epsGrowth: number | null;
  fcfGrowth: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
}

export class FinancialSnapshotRefresh implements IngestionJob {
  readonly name = 'refresh-financials';

  private providers: FinancialDataProvider[];

  constructor(providers: FinancialDataProvider[]) {
    this.providers = [...providers].sort((a, b) => a.priority - b.priority);
  }

  async run(options: JobOptions): Promise<JobResult> {
    const startedAt = new Date().toISOString();
    const errors: string[] = [];
    let successCount = 0;
    let failureCount = 0;

    const symbols = options.symbols ?? [];
    const limit = options.limit ?? symbols.length;

    if (this.providers.length === 0 || !this.providers.some((p) => p.available())) {
      return { success: true, jobName: this.name, startedAt, endedAt: new Date().toISOString(),
        durationMs: 0, symbolsProcessed: 0, successCount: 0, failureCount: 0, errors: [] };
    }

    const toProcess = symbols.slice(0, limit);

    for (const symbol of toProcess) {
      try {
        const merged = await this.fetchMerged(symbol);
        if (!options.dryRun && merged) {
          await this.persistSnapshot(symbol, merged);
        }
        successCount++;
      } catch (err) {
        failureCount++;
        errors.push(`${symbol}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    const endedAt = new Date().toISOString();
    return {
      success: errors.length === 0,
      jobName: this.name,
      startedAt,
      endedAt,
      durationMs: new Date(endedAt).getTime() - new Date(startedAt).getTime(),
      symbolsProcessed: toProcess.length,
      successCount,
      failureCount,
      errors,
    };
  }

  /** Fetch from highest-priority available provider, fallback to next */
  async fetchMerged(symbol: string): Promise<FinancialSnapshotFields | null> {
    let merged: FinancialSnapshotFields | null = null;

    for (const provider of this.providers) {
      if (!provider.available()) continue;
      try {
        const data = await provider.fetchFinancials(symbol);
        if (!data) continue;
        if (!merged) {
          merged = {
            marketCap: null, peRatio: null, pbRatio: null, eps: null,
            dividendYield: null, beta: null, freeFloat: null, fcfYield: null,
            evEbitda: null, roa: null, roe: null, roic: null,
            debtToEquity: null, currentRatio: null, revenueGrowth: null,
            profitGrowth: null, epsGrowth: null, fcfGrowth: null,
            grossMargin: null, operatingMargin: null, netMargin: null,
          };
        }
        // Merge: provider fills nulls if it has data
        for (const [key, value] of Object.entries(data)) {
          if (value !== null && value !== undefined && (merged as any)[key] === null) {
            (merged as any)[key] = safeDbValue(value);
          }
        }
      } catch {
        // Provider failed — try next
        continue;
      }
    }

    return merged;
  }

  private async persistSnapshot(_symbol: string, _data: FinancialSnapshotFields): Promise<void> {
    // NOTE: Actual DB persistence handled by calling script
  }
}
