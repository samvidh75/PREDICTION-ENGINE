/**
 * Watchlist Intelligence Engine
 *
 * Monitors a watchlist of stocks for thesis-relevant changes:
 * signal transitions, catalyst activation, risk changes.
 *
 * No fake ranking or comparison — purely data-driven observation.
 */

import type { IntelligenceInput } from '../../types';

export interface WatchlistEntry {
  symbol: string;
  addedAt: string;
  thesisSummary: string;
  alertRules: AlertRule[];
  lastSignalCheck: string | null;
  activeAlerts: WatchlistAlert[];
}

export interface AlertRule {
  id: string;
  type: 'signal_change' | 'catalyst' | 'risk_level' | 'price_sma_cross' | 'earnings_date';
  description: string;
  threshold: string;
  enabled: boolean;
}

export interface WatchlistAlert {
  id: string;
  ruleId: string;
  symbol: string;
  triggeredAt: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  acknowledged: boolean;
}

export interface WatchlistReport {
  symbol: string;
  generatedAt: string;
  entries: WatchlistEntry[];
  activeAlertCount: number;
  summary: string;
}

export class WatchlistEngine {
  /**
   * Evaluate a single stock against its alert rules
   */
  evaluateEntry(entry: WatchlistEntry, input: IntelligenceInput): WatchlistAlert[] {
    const alerts: WatchlistAlert[] = [];
    const now = new Date().toISOString();

    for (const rule of entry.alertRules) {
      if (!rule.enabled) continue;
      const alert = this.evaluateRule(rule, input);
      if (alert) {
        alerts.push({
          ...alert,
          symbol: entry.symbol,
          triggeredAt: now,
          acknowledged: false,
        });
      }
    }

    entry.lastSignalCheck = now;
    entry.activeAlerts = alerts;
    return alerts;
  }

  /**
   * Batch evaluate all watchlist entries
   */
  evaluateWatchlist(
    entries: WatchlistEntry[],
    inputMap: Map<string, IntelligenceInput>,
  ): WatchlistReport {
    const allAlerts: WatchlistAlert[] = [];
    const updatedEntries: WatchlistEntry[] = [];

    for (const entry of entries) {
      const input = inputMap.get(entry.symbol);
      if (input) {
        const alerts = this.evaluateEntry(entry, input);
        allAlerts.push(...alerts);
      }
      updatedEntries.push(entry);
    }

    return {
      symbol: 'WATCHLIST',
      generatedAt: new Date().toISOString(),
      entries: updatedEntries,
      activeAlertCount: allAlerts.filter(a => !a.acknowledged).length,
      summary: `${allAlerts.filter(a => !a.acknowledged).length} unacknowledged alert(s) across ${updatedEntries.length} watchlist entries.`,
    };
  }

  private evaluateRule(rule: AlertRule, input: IntelligenceInput): { id: string; ruleId: string; message: string; severity: 'info' | 'warning' | 'critical' } | null {
    const f = input.financials;
    const r = input.risks;

    switch (rule.type) {
      case 'risk_level': {
        // Check for high pledged shares
        if (r?.pledgedShares !== null && r.pledgedShares > 30) {
          return {
            id: `alert_${rule.id}_${Date.now()}`,
            ruleId: rule.id,
            message: `${input.symbol}: Promoter pledge at ${r.pledgedShares}% — exceeds ${rule.threshold}.`,
            severity: 'critical',
          };
        }
        return null;
      }

      case 'signal_change': {
        // Check for negative profit growth
        if (f.profitGrowth !== null && f.profitGrowth < -10) {
          return {
            id: `alert_${rule.id}_${Date.now()}`,
            ruleId: rule.id,
            message: `${input.symbol}: Profit declining ${f.profitGrowth}% — below threshold ${rule.threshold}.`,
            severity: 'warning',
          };
        }
        return null;
      }

      case 'earnings_date': {
        const e = input.earnings;
        if (e.nextEarningsDate) {
          const days = this.daysUntil(e.nextEarningsDate);
          if (days <= 7) {
            return {
              id: `alert_${rule.id}_${Date.now()}`,
              ruleId: rule.id,
              message: `${input.symbol}: Earnings in ${days} days (${e.nextEarningsDate}).`,
              severity: 'info',
            };
          }
        }
        return null;
      }

      case 'price_sma_cross': {
        const t = input.technicals;
        if (t.sma20 !== null && t.sma50 !== null) {
          if (t.sma50 > t.sma20) {
            return {
              id: `alert_${rule.id}_${Date.now()}`,
              ruleId: rule.id,
              message: `${input.symbol}: SMA20 (${t.sma20}) below SMA50 (${t.sma50}) — bearish crossover.`,
              severity: 'warning',
            };
          }
        }
        return null;
      }

      default:
        return null;
    }
  }

  /**
   * Create default alert rules for a stock
   */
  createDefaultRules(): AlertRule[] {
    return [
      {
        id: 'rule_pledge',
        type: 'risk_level',
        description: 'Promoter pledge exceeds threshold',
        threshold: '30%',
        enabled: true,
      },
      {
        id: 'rule_profit_decline',
        type: 'signal_change',
        description: 'Profit growth drops below threshold',
        threshold: '-10%',
        enabled: true,
      },
      {
        id: 'rule_earnings_proximity',
        type: 'earnings_date',
        description: 'Earnings date approaching',
        threshold: '7 days',
        enabled: true,
      },
      {
        id: 'rule_sma_cross',
        type: 'price_sma_cross',
        description: 'SMA20 crosses below SMA50',
        threshold: 'crossover',
        enabled: false,
      },
    ];
  }

  private daysUntil(dateStr: string): number {
    const now = new Date();
    const target = new Date(dateStr);
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }
}

export const watchlistEngine = new WatchlistEngine();
