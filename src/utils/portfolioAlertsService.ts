/**
 * Portfolio Alerts Service
 * Monitors portfolio and triggers alerts for important events
 */

export type AlertType = 'price_target' | 'portfolio_milestone' | 'rebalance' | 'dividend' | 'sector_shift';

export interface Alert {
  id: string;
  type: AlertType;
  ticker?: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: number;
  actionable: boolean;
  action?: string;
}

export interface AlertConfig {
  priceAlerts: boolean;
  priceChangePercent: number; // alert if stock moves more than this %
  portfolioMilestones: boolean;
  milestonePercent: number; // alert every 5% gain/loss
  rebalanceAlerts: boolean;
  rebalanceThreshold: number; // alert if sector deviates > this %
  concentrationAlert: boolean;
  concentrationThreshold: number; // alert if sector > this %
}

class PortfolioAlertsService {
  private alertConfig: AlertConfig = {
    priceAlerts: true,
    priceChangePercent: 5,
    portfolioMilestones: true,
    milestonePercent: 5,
    rebalanceAlerts: true,
    rebalanceThreshold: 10,
    concentrationAlert: true,
    concentrationThreshold: 40,
  };

  private lastCheckpointReturn = 0;
  private alerts: Map<string, Alert> = new Map();

  /**
   * Check for price movement alerts
   */
  checkPriceAlerts(holdings: Array<{ ticker: string; buyPrice: number; currentPrice: number }>): Alert[] {
    const alerts: Alert[] = [];

    if (!this.alertConfig.priceAlerts) return alerts;

    holdings.forEach((holding) => {
      const changePercent = ((holding.currentPrice - holding.buyPrice) / holding.buyPrice) * 100;
      const absChange = Math.abs(changePercent);

      if (absChange >= this.alertConfig.priceChangePercent) {
        const alertId = `price-${holding.ticker}-${Date.now()}`;
        const direction = changePercent > 0 ? 'up' : 'down';
        const severity = absChange > 10 ? 'critical' : 'warning';

        alerts.push({
          id: alertId,
          type: 'price_target',
          ticker: holding.ticker,
          title: `${holding.ticker} moved ${direction} ${Math.abs(changePercent).toFixed(1)}%`,
          message: `${holding.ticker} is now at ₱${holding.currentPrice.toFixed(2)} from buy price ₱${holding.buyPrice}`,
          severity,
          timestamp: Date.now(),
          actionable: true,
          action: direction === 'up' ? 'CONSIDER_SELLING' : 'CONSIDER_BUYING',
        });
      }
    });

    return alerts;
  }

  /**
   * Check for portfolio milestone alerts
   */
  checkPortfolioMilestones(currentReturn: number, lastReturn: number): Alert[] {
    const alerts: Alert[] = [];

    if (!this.alertConfig.portfolioMilestones) return alerts;

    const milestone = this.alertConfig.milestonePercent;

    // Check if crossed a milestone threshold
    const currentMilestone = Math.floor(currentReturn / milestone);
    const lastMilestone = Math.floor(lastReturn / milestone);

    if (currentMilestone !== lastMilestone) {
      const direction = currentReturn > lastReturn ? 'positive' : 'negative';
      const emoji = currentReturn > 0 ? '🎉' : '⚠️';

      alerts.push({
        id: `milestone-${currentMilestone}-${Date.now()}`,
        type: 'portfolio_milestone',
        title: `${emoji} Portfolio milestone: ${direction === 'positive' ? '+' : ''}${currentReturn.toFixed(1)}%`,
        message: `Your portfolio has reached ${currentReturn.toFixed(1)}% return. Keep track of tax implications!`,
        severity: direction === 'positive' ? 'info' : 'warning',
        timestamp: Date.now(),
        actionable: direction === 'positive',
        action: 'REVIEW_GAINS',
      });
    }

    return alerts;
  }

  /**
   * Check for rebalancing alerts
   */
  checkRebalanceAlerts(sectors: Array<{ sector: string; allocation: number; targetAllocation?: number }>): Alert[] {
    const alerts: Alert[] = [];

    if (!this.alertConfig.rebalanceAlerts) return alerts;

    sectors.forEach((sector) => {
      const target = sector.targetAllocation || 20;
      const deviation = Math.abs(sector.allocation - target);

      if (deviation > this.alertConfig.rebalanceThreshold) {
        const direction = sector.allocation > target ? 'overweight' : 'underweight';

        alerts.push({
          id: `rebalance-${sector.sector}-${Date.now()}`,
          type: 'rebalance',
          title: `${sector.sector} is ${direction}`,
          message: `${sector.sector} is ${sector.allocation.toFixed(1)}% of portfolio (target: ${target}%). Consider rebalancing.`,
          severity: 'warning',
          timestamp: Date.now(),
          actionable: true,
          action: 'REBALANCE',
        });
      }
    });

    return alerts;
  }

  /**
   * Check for concentration risk
   */
  checkConcentrationAlerts(holdings: Array<{ ticker: string; allocation: number }>): Alert[] {
    const alerts: Alert[] = [];

    if (!this.alertConfig.concentrationAlert) return alerts;

    holdings.forEach((holding) => {
      if (holding.allocation > this.alertConfig.concentrationThreshold) {
        alerts.push({
          id: `concentration-${holding.ticker}-${Date.now()}`,
          type: 'sector_shift',
          ticker: holding.ticker,
          title: `⚠️ ${holding.ticker} over-concentrated`,
          message: `${holding.ticker} is ${holding.allocation.toFixed(1)}% of your portfolio. High concentration increases risk.`,
          severity: 'critical',
          timestamp: Date.now(),
          actionable: true,
          action: 'TRIM',
        });
      }
    });

    return alerts;
  }

  /**
   * Generate all alerts for portfolio
   */
  generateAlerts(portfolioData: {
    holdings: Array<{ ticker: string; buyPrice: number; currentPrice: number; allocation: number }>;
    sectors: Array<{ sector: string; allocation: number }>;
    currentReturn: number;
  }): Alert[] {
    const allAlerts: Alert[] = [];

    // Price alerts
    allAlerts.push(...this.checkPriceAlerts(portfolioData.holdings));

    // Milestone alerts
    allAlerts.push(...this.checkPortfolioMilestones(portfolioData.currentReturn, this.lastCheckpointReturn));
    this.lastCheckpointReturn = portfolioData.currentReturn;

    // Rebalance alerts
    allAlerts.push(...this.checkRebalanceAlerts(portfolioData.sectors));

    // Concentration alerts
    allAlerts.push(...this.checkConcentrationAlerts(portfolioData.holdings));

    // Store alerts
    allAlerts.forEach((alert) => {
      this.alerts.set(alert.id, alert);
    });

    return allAlerts;
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit: number = 10): Alert[] {
    return Array.from(this.alerts.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Clear alert
   */
  clearAlert(alertId: string): void {
    this.alerts.delete(alertId);
  }

  /**
   * Update alert config
   */
  updateConfig(config: Partial<AlertConfig>): void {
    this.alertConfig = { ...this.alertConfig, ...config };
  }

  /**
   * Get alert config
   */
  getConfig(): AlertConfig {
    return { ...this.alertConfig };
  }
}

export const portfolioAlertsService = new PortfolioAlertsService();
