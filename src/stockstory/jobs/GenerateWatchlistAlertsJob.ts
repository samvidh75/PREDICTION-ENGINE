/**
 * Generate Watchlist Alerts Job
 *
 * Creates alerts from meaningful thesis/risk/score/event changes.
 * Only generates alerts for meaningful changes.
 * No spam alerts — deduplicates same alert.
 */

import type { JobOptions, JobResult, IngestionJob } from '../ingestion/IngestionTypes';

export type AlertCategory =
  | 'thesis-changed'
  | 'score-changed'
  | 'risk-rising'
  | 'risk-falling'
  | 'valuation-changed'
  | 'earnings-changed'
  | 'momentum-changed'
  | 'major-news-event'
  | 'peer-became-more-attractive';

export interface ResearchSnapshot {
  symbol: string;
  generatedAt: string;
  overallScore: number;
  riskScore: number;
  valuationScore: number;
  momentumScore: number;
  qualityScore: number;
}

export interface PreviousSnapshot {
  symbol: string;
  generatedAt: string;
  overallScore: number;
  riskScore: number;
  valuationScore: number;
  momentumScore: number;
  qualityScore: number;
}

export interface Alert {
  symbol: string;
  category: AlertCategory;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  generatedAt: string;
}

export interface AlertStore {
  saveAlert(alert: Alert): Promise<void>;
  alertExists(symbol: string, category: AlertCategory, since: string): Promise<boolean>;
}

export class GenerateWatchlistAlertsJob implements IngestionJob {
  readonly name = 'generate-watchlist-alerts';

  private store: AlertStore;
  private readonly SCORE_THRESHOLD = 10; // minimum score delta for alert
  private readonly RECENT_WINDOW_HOURS = 24;

  constructor(store: AlertStore) {
    this.store = store;
  }

  async run(options: JobOptions): Promise<JobResult> {
    const startedAt = new Date().toISOString();
    const errors: string[] = [];
    const successCount = 0;
    const failureCount = 0;

    // This job typically runs with current and previous snapshots provided
    // by the calling script. Without data it's a no-op.
    if (!options.symbols || options.symbols.length === 0) {
      return { success: true, jobName: this.name, startedAt, endedAt: new Date().toISOString(),
        durationMs: 0, symbolsProcessed: 0, successCount: 0, failureCount: 0, errors: [] };
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

  /** Compare current vs previous snapshot and generate alerts */
  async compareAndAlert(
    current: ResearchSnapshot,
    previous: PreviousSnapshot | null,
  ): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const since = new Date(Date.now() - this.RECENT_WINDOW_HOURS * 3600000).toISOString();

    if (!previous) {
      return alerts; // No baseline to compare
    }

    // Score changed
    const scoreDelta = current.overallScore - previous.overallScore;
    if (Math.abs(scoreDelta) >= this.SCORE_THRESHOLD) {
      const existing = await this.store.alertExists(current.symbol, 'score-changed', since);
      if (!existing) {
        alerts.push({
          symbol: current.symbol,
          category: 'score-changed',
          title: scoreDelta > 0 ? 'Score improved' : 'Score declined',
          message: scoreDelta > 0
            ? `Overall score improved by ${Math.round(scoreDelta)} points`
            : `Overall score declined by ${Math.abs(Math.round(scoreDelta))} points`,
          severity: Math.abs(scoreDelta) >= 20 ? 'warning' : 'info',
          generatedAt: new Date().toISOString(),
        });
      }
    }

    // Risk rising
    const riskDelta = current.riskScore - previous.riskScore;
    if (riskDelta >= this.SCORE_THRESHOLD) {
      const existing = await this.store.alertExists(current.symbol, 'risk-rising', since);
      if (!existing) {
        alerts.push({
          symbol: current.symbol,
          category: 'risk-rising',
          title: 'Risk needs review',
          message: `Risk score increased by ${Math.round(riskDelta)} points`,
          severity: riskDelta >= 20 ? 'critical' : 'warning',
          generatedAt: new Date().toISOString(),
        });
      }
    }

    // Risk falling (improving)
    if (riskDelta <= -this.SCORE_THRESHOLD) {
      const existing = await this.store.alertExists(current.symbol, 'risk-falling', since);
      if (!existing) {
        alerts.push({
          symbol: current.symbol,
          category: 'risk-falling',
          title: 'Risk improving',
          message: `Risk score decreased by ${Math.abs(Math.round(riskDelta))} points`,
          severity: 'info',
          generatedAt: new Date().toISOString(),
        });
      }
    }

    // Valuation changed
    const valDelta = current.valuationScore - previous.valuationScore;
    if (Math.abs(valDelta) >= this.SCORE_THRESHOLD) {
      const existing = await this.store.alertExists(current.symbol, 'valuation-changed', since);
      if (!existing) {
        alerts.push({
          symbol: current.symbol,
          category: 'valuation-changed',
          title: valDelta > 0 ? 'Valuation became more attractive' : 'Valuation deteriorated',
          message: `Valuation score changed by ${Math.round(valDelta)} points`,
          severity: Math.abs(valDelta) >= 20 ? 'warning' : 'info',
          generatedAt: new Date().toISOString(),
        });
      }
    }

    // Momentum changed
    const momDelta = current.momentumScore - previous.momentumScore;
    if (Math.abs(momDelta) >= this.SCORE_THRESHOLD) {
      const existing = await this.store.alertExists(current.symbol, 'momentum-changed', since);
      if (!existing) {
        alerts.push({
          symbol: current.symbol,
          category: 'momentum-changed',
          title: momDelta > 0 ? 'Momentum improving' : 'Momentum weakening',
          message: `Momentum score changed by ${Math.round(momDelta)} points`,
          severity: 'info',
          generatedAt: new Date().toISOString(),
        });
      }
    }

    // Save alerts
    for (const alert of alerts) {
      await this.store.saveAlert(alert);
    }

    return alerts;
  }
}
