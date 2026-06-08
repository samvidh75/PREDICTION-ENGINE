/**
 * TRACK-96A — Data Freshness Engine
 * 
 * Tracks the age of every dataset the platform displays.
 * Provides a single source of truth for freshness visibility.
 * 
 * Outputs: { source, lastUpdated, ageHours, status: "fresh" | "stale" | "critical" }
 */
import pool from '../db/index';

export interface FreshnessStatus {
  source: string;
  lastUpdated: string | null;
  ageHours: number | null;
  status: 'fresh' | 'stale' | 'critical' | 'unavailable';
}

const FRESH_THRESHOLD_HOURS = 6;
const STALE_THRESHOLD_HOURS = 24;

export class DataFreshnessEngine {
  async getAllStatuses(): Promise<FreshnessStatus[]> {
    const results = await Promise.allSettled([
      this.getPredictionRegistryFreshness(),
      this.getFactorSnapshotsFreshness(),
      this.getDailyPricesFreshness(),
      this.getFinancialSnapshotsFreshness(),
    ]);

    return results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      return {
        source: ['prediction_registry', 'factor_snapshots', 'daily_prices', 'financial_snapshots'][i],
        lastUpdated: null,
        ageHours: null,
        status: 'unavailable' as const,
      };
    });
  }

  private async getDailyPricesFreshness(): Promise<FreshnessStatus> {
    try {
      const res = await pool.query(
        `SELECT MAX(trade_date) as latest FROM daily_prices`
      );
      return this.buildStatus('Daily Prices', res.rows[0]?.latest);
    } catch {
      return { source: 'Daily Prices', lastUpdated: null, ageHours: null, status: 'unavailable' };
    }
  }

  private async getFinancialSnapshotsFreshness(): Promise<FreshnessStatus> {
    try {
      const res = await pool.query(
        `SELECT MAX(period_end) as latest FROM financial_snapshots`
      );
      return this.buildStatus('Financial Data', res.rows[0]?.latest);
    } catch {
      return { source: 'Financial Data', lastUpdated: null, ageHours: null, status: 'unavailable' };
    }
  }

  private async getFactorSnapshotsFreshness(): Promise<FreshnessStatus> {
    try {
      const res = await pool.query(
        `SELECT MAX(trade_date) as latest FROM factor_snapshots`
      );
      return this.buildStatus('Factor Snapshots', res.rows[0]?.latest);
    } catch {
      return { source: 'Factor Snapshots', lastUpdated: null, ageHours: null, status: 'unavailable' };
    }
  }

  private async getPredictionRegistryFreshness(): Promise<FreshnessStatus> {
    try {
      const res = await pool.query(
        `SELECT MAX(prediction_date) as latest FROM prediction_registry`
      );
      return this.buildStatus('Predictions', res.rows[0]?.latest);
    } catch {
      return { source: 'Predictions', lastUpdated: null, ageHours: null, status: 'unavailable' };
    }
  }

  private buildStatus(source: string, latest: unknown): FreshnessStatus {
    if (latest === null || latest === undefined) {
      return { source, lastUpdated: null, ageHours: null, status: 'unavailable' };
    }

    const lastUpdated = latest instanceof Date
      ? latest.toISOString().split('T')[0]
      : String(latest).split('T')[0];

    const lastDate = new Date(lastUpdated);
    const ageMs = Date.now() - lastDate.getTime();
    const ageHours = Math.max(0, Math.round(ageMs / 3600000));

    let status: FreshnessStatus['status'] = 'fresh';
    if (ageHours > STALE_THRESHOLD_HOURS) status = 'critical';
    else if (ageHours > FRESH_THRESHOLD_HOURS) status = 'stale';

    return { source, lastUpdated, ageHours, status };
  }
}

export const dataFreshnessEngine = new DataFreshnessEngine();
export default DataFreshnessEngine;
