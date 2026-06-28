/**
 * Derivatives Context Engine
 *
 * Provides access to derivatives market data for equity research context.
 * Designed to be optional — missing data never blocks research.
 * All methods may return undefined if data is not available.
 */

import type { FOEligibility, OpenInterest, OptionActivity, FuturesContext } from './DerivativesTypes';

export class DerivativesContextEngine {
  private foEligibility: Map<string, FOEligibility> = new Map();
  private oiRecords: OpenInterest[] = [];
  private futuresRecords: Map<string, FuturesContext> = new Map();
  private optionActivity: Map<string, OptionActivity> = new Map();

  /** Set or update F&O eligibility for a symbol */
  setFOEligibility(eligibility: FOEligibility): void {
    this.foEligibility.set(eligibility.symbol, eligibility);
  }

  /** Get F&O eligibility for a symbol */
  getFOEligibility(symbol: string): FOEligibility | undefined {
    return this.foEligibility.get(symbol);
  }

  /** Record an open interest data point */
  addOi(oi: OpenInterest): void {
    this.oiRecords.push(oi);
  }

  /** Get OI data points for a symbol, optionally filtered by type */
  getOiData(symbol: string, type?: 'futures' | 'call' | 'put'): OpenInterest[] {
    return this.oiRecords.filter(r => r.symbol === symbol && (!type || r.type === type));
  }

  /**
   * Get open interest trend for a symbol based on recent data.
   * Returns 'rising', 'falling', or 'stable' if data is sufficient,
   * undefined otherwise.
   */
  getOiTrend(symbol: string): 'rising' | 'falling' | 'stable' | undefined {
    const records = this.getOiData(symbol)
      .filter(r => r.type === 'futures')
      .sort((a, b) => a.asOf.localeCompare(b.asOf));

    if (records.length < 2) return undefined;

    // Compare last two data points
    const latest = records[records.length - 1];
    const previous = records[records.length - 2];

    if (latest.changePct > 5) return 'rising';
    if (latest.changePct < -5) return 'falling';
    return 'stable';
  }

  /** Set futures context for a symbol */
  setFuturesContext(ctx: FuturesContext): void {
    this.futuresRecords.set(ctx.symbol, ctx);
  }

  /** Get futures context for a symbol */
  getFuturesContext(symbol: string): FuturesContext | undefined {
    return this.futuresRecords.get(symbol);
  }

  /** Set option activity for a symbol */
  setOptionActivity(activity: OptionActivity): void {
    this.optionActivity.set(activity.symbol, activity);
  }

  /** Get option activity for a symbol */
  getOptionActivity(symbol: string): OptionActivity | undefined {
    return this.optionActivity.get(symbol);
  }

  /** Clear all data */
  reset(): void {
    this.foEligibility.clear();
    this.oiRecords = [];
    this.futuresRecords.clear();
    this.optionActivity.clear();
  }
}

export const derivativesContextEngine = new DerivativesContextEngine();