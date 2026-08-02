/**
 * TRACK-60 AGENT C — Data Freshness Monitor
 * 
 * Monitors: daily_prices, financial_snapshots, factor_snapshots, prediction_registry.
 * Generates alerts if data is stale. Configurable thresholds.
 */
import pool from '../db/index';

export interface FreshnessResult {
  table: string;
  latestDate: string | null;
  daysStale: number | null;
  status: 'fresh' | 'stale' | 'critical' | 'empty';
  thresholdDays: number;
}

export interface FreshnessReport {
  checks: FreshnessResult[];
  overallStatus: 'healthy' | 'degraded' | 'critical';
  timestamp: string;
}

export class DataFreshnessMonitor {
  private thresholds = {
    dailyPrices: { stale: 2, critical: 7 },
    financialSnapshots: { stale: 45, critical: 90 }, // quarterly data
    factorSnapshots: { stale: 2, critical: 7 },
    predictionRegistry: { stale: 2, critical: 7 },
  };

  async checkAll(): Promise<FreshnessReport> {
    const checks: FreshnessResult[] = [
      await this.checkTable('daily_prices', 'trade_date', this.thresholds.dailyPrices),
      await this.checkTable('financial_snapshots', 'period_end', this.thresholds.financialSnapshots),
      await this.checkTable('factor_snapshots', 'trade_date', this.thresholds.factorSnapshots),
      await this.checkTable('prediction_registry', 'prediction_date', this.thresholds.predictionRegistry),
    ];

    const criticalCount = checks.filter(c => c.status === 'critical' || c.status === 'empty').length;
    const staleCount = checks.filter(c => c.status === 'stale').length;
    const overallStatus = criticalCount > 0 ? 'critical' : staleCount > 1 ? 'degraded' : 'healthy';

    return { checks, overallStatus, timestamp: new Date().toISOString() };
  }

  private async checkTable(
    table: string,
    dateColumn: string,
    thresholds: { stale: number; critical: number },
  ): Promise<FreshnessResult> {
    try {
      const res = await pool.query(`SELECT MAX(${dateColumn}) as latest FROM ${table}`);
      const latestDate = res.rows[0]?.latest;

      if (!latestDate) {
        return { table, latestDate: null, daysStale: null, status: 'empty', thresholdDays: thresholds.stale };
      }

      const daysAgo = Math.floor((Date.now() - new Date(latestDate).getTime()) / 86400000);

      let status: FreshnessResult['status'];
      if (daysAgo > thresholds.critical) status = 'critical';
      else if (daysAgo > thresholds.stale) status = 'stale';
      else status = 'fresh';

      return { table, latestDate, daysStale: daysAgo, status, thresholdDays: thresholds.stale };
    } catch {
      return { table, latestDate: null, daysStale: null, status: 'empty', thresholdDays: thresholds.stale };
    }
  }

  /**
   * Generate human-readable alerts from a freshness report.
   */
  generateAlerts(report: FreshnessReport): string[] {
    const alerts: string[] = [];

    for (const check of report.checks) {
      if (check.status === 'critical') {
        alerts.push(`CRITICAL: ${check.table} is ${check.daysStale} days stale (threshold: ${check.thresholdDays}d)`);
      } else if (check.status === 'stale') {
        alerts.push(`WARNING: ${check.table} is ${check.daysStale} days stale`);
      } else if (check.status === 'empty') {
        alerts.push(`INFO: ${check.table} has no data`);
      }
    }

    if (alerts.length === 0) {
      alerts.push('INFO: All data sources are fresh');
    }

    return alerts;
  }

  /**
   * Check if SSI is safe to generate predictions (requires fresh factor + price data).
   */
  async isReadyForPredictionGeneration(): Promise<{ ready: boolean; reason: string }> {
    const report = await this.checkAll();
    const factorCheck = report.checks.find(c => c.table === 'factor_snapshots');
    const priceCheck = report.checks.find(c => c.table === 'daily_prices');

    if (!factorCheck || factorCheck.status === 'empty' || factorCheck.status === 'critical') {
      return { ready: false, reason: 'Factor snapshots are stale or empty — cannot generate predictions' };
    }

    if (!priceCheck || priceCheck.status === 'empty' || priceCheck.status === 'critical') {
      return { ready: false, reason: 'Daily prices are stale or empty — cannot generate predictions' };
    }

    return { ready: true, reason: 'Data sources are fresh — ready for prediction generation' };
  }
}

export const freshnessMonitor = new DataFreshnessMonitor();
export default DataFreshnessMonitor;
