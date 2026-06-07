import pool from '../db/index';
import { AnomalyDetectionEngine } from '../quality/AnomalyDetectionEngine';

export interface WatchlistAlert {
  symbol: string;
  alert_type: 'RANK_CHANGE' | 'CONFIDENCE_CHANGE' | 'FACTOR_CHANGE' | 'ANOMALY_DETECTED';
  change_description: string;
  severity: 'info' | 'warning' | 'critical';
}

export class WatchlistMonitoringEngine {
  private anomalyEngine: AnomalyDetectionEngine;

  constructor() {
    this.anomalyEngine = new AnomalyDetectionEngine();
  }

  async monitor(symbols: string[]): Promise<WatchlistAlert[]> {
    if (!symbols.length) return [];
    const alerts: WatchlistAlert[] = [];

    const { rows } = await pool.query(
      `WITH Ranked AS (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY trade_date DESC) AS rn
        FROM factor_snapshots
        WHERE symbol = ANY($1)
      )
      SELECT * FROM Ranked WHERE rn <= 2`,
      [symbols]
    );

    const latest: Record<string, any> = {};
    const prev: Record<string, any> = {};

    for (const row of rows) {
      if (row.rn === 1) latest[row.symbol] = row;
      else prev[row.symbol] = row;
    }

    for (const sym of symbols) {
      const cur = latest[sym];
      const pr = prev[sym];
      if (!cur) continue;

      // Rank change (>5 pts delta)
      if (pr && Math.abs(Number(cur.factor_score || 0) - Number(pr.factor_score || 0)) > 5) {
        alerts.push({
          symbol: sym,
          alert_type: 'RANK_CHANGE',
          change_description: `Score changed from ${Number(pr.factor_score || 0).toFixed(0)} to ${Number(cur.factor_score || 0).toFixed(0)} (${Number(cur.factor_score - pr.factor_score) > 0 ? '+' : ''}${(Number(cur.factor_score - pr.factor_score)).toFixed(0)} pts)`,
          severity: Math.abs(Number(cur.factor_score - pr.factor_score)) > 15 ? 'warning' : 'info',
        });
      }

      // Confidence change (level change)
      if (pr && cur.confidence_level && pr.confidence_level && cur.confidence_level !== pr.confidence_level) {
        alerts.push({
          symbol: sym,
          alert_type: 'CONFIDENCE_CHANGE',
          change_description: `Confidence changed from ${pr.confidence_level} to ${cur.confidence_level}`,
          severity: cur.confidence_level === 'Low' ? 'warning' : 'info',
        });
      }

      // Factor changes (>10 pts in any factor)
      const factors = ['quality_factor', 'value_factor', 'growth_factor', 'momentum_factor', 'risk_factor'] as const;
      if (pr) {
        for (const f of factors) {
          const delta = Number(cur[f] || 0) - Number(pr[f] || 0);
          if (Math.abs(delta) > 10) {
            alerts.push({
              symbol: sym,
              alert_type: 'FACTOR_CHANGE',
              change_description: `${f.replace('_factor', '')} ${delta > 0 ? 'increased' : 'decreased'} by ${Math.abs(delta).toFixed(0)} pts`,
              severity: 'info',
            });
          }
        }
      }

      // Anomaly check — use getAnomalyScore to detect existing anomalies for this symbol
      try {
        const anomalyScore = this.anomalyEngine.getAnomalyScore(sym);
        if (anomalyScore >= 3) {
          alerts.push({
            symbol: sym,
            alert_type: 'ANOMALY_DETECTED',
            change_description: `Anomaly score of ${anomalyScore} detected — data quality or fundamental change may be occurring. Run full anomaly scan for details.`,
            severity: anomalyScore >= 10 ? 'critical' : 'warning',
          });
        }
      } catch {
        // Anomaly engine may not have data — skip
      }
    }

    return alerts;
  }
}

export const watchlistMonitoringEngine = new WatchlistMonitoringEngine();
export default WatchlistMonitoringEngine;
