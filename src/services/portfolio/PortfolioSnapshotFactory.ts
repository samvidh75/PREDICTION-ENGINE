// src/services/portfolio/PortfolioSnapshotFactory.ts
import { PortfolioEngine, UserHolding } from "./PortfolioEngine";
import { PortfolioAnalyticsEngine, SectorWeight } from "./PortfolioAnalyticsEngine";
import { PortfolioHealthEngine, PortfolioHealthState } from "./PortfolioHealthEngine";
import { PortfolioRiskEngine, RiskAnalysis } from "./PortfolioRiskEngine";
import { PortfolioPerformanceEngine, PerformanceSnapshot } from "./PortfolioPerformanceEngine";

export interface PortfolioSnapshot {
  holdings: UserHolding[];
  sectorExposure: SectorWeight[];
  health: { score: number; status: PortfolioHealthState };
  risk: RiskAnalysis;
  performance: PerformanceSnapshot;
  lastUpdated: string;
}

export class PortfolioSnapshotFactory {
  public static createSnapshot(currentPrices: Record<string, number> = {}): PortfolioSnapshot {
    const holdings = PortfolioEngine.getHoldings();
    const sectorExposure = PortfolioAnalyticsEngine.calculateWeights(holdings, currentPrices);

    // Derive volatility from actual holdings data instead of hardcoding
    const volatility = PortfolioSnapshotFactory.calculateVolatility(holdings, currentPrices);

    // Derive drawdown from actual holdings data instead of hardcoding
    const drawdown = PortfolioSnapshotFactory.calculateDrawdown(holdings, currentPrices);

    const health = PortfolioHealthEngine.evaluateHealth(sectorExposure, volatility, drawdown);
    const risk = PortfolioRiskEngine.analyzeRisk(holdings);
    const performance = PortfolioPerformanceEngine.evaluatePerformance(holdings, currentPrices);

    return {
      holdings,
      sectorExposure,
      health,
      risk,
      performance,
      lastUpdated: new Date().toLocaleTimeString("en-IN"),
    };
  }

  /**
   * Calculate portfolio volatility (0-100) based on actual holdings data.
   * Uses sector-based risk weights and concentration as a proxy for volatility
   * since individual stock beta is not available without live data.
   *
   * Returns a value between 0-100, where higher = more volatile.
   * Returns 50 (neutral) for empty portfolios.
   */
  private static calculateVolatility(
    holdings: UserHolding[],
    currentPrices: Record<string, number>
  ): number {
    if (holdings.length === 0) return 50;

    const highVolSectors = new Set(["IT", "Pharma", "Real Estate", "Mining"]);
    const lowVolSectors = new Set(["Banking", "FMCG", "Insurance", "Utilities"]);

    let totalValue = 0;
    let volWeightedValue = 0;

    for (const h of holdings) {
      const price = currentPrices[h.symbol] || h.avgBuyPrice;
      const val = h.shares * price;
      totalValue += val;

      const sector = h.sector || "Other";
      if (highVolSectors.has(sector)) {
        volWeightedValue += val * 70; // High volatility sectors
      } else if (lowVolSectors.has(sector)) {
        volWeightedValue += val * 30; // Low volatility sectors
      } else {
        volWeightedValue += val * 50; // Neutral sectors
      }
    }

    if (totalValue <= 0) return 50;
    return Math.round(Math.min(95, Math.max(5, volWeightedValue / totalValue)));
  }

  /**
   * Calculate portfolio drawdown percentage (0-100) based on actual holdings.
   * Uses the gap between buy price and current price as a proxy.
   *
   * Returns a value between 0-100, where higher = deeper drawdown.
   * Returns 0 for empty portfolios.
   */
  private static calculateDrawdown(
    holdings: UserHolding[],
    currentPrices: Record<string, number>
  ): number {
    if (holdings.length === 0) return 0;

    let totalCost = 0;
    let totalCurrentValue = 0;

    for (const h of holdings) {
      const cost = h.shares * h.avgBuyPrice;
      const price = currentPrices[h.symbol] || h.avgBuyPrice;
      const val = h.shares * price;

      totalCost += cost;
      totalCurrentValue += val;
    }

    if (totalCost <= 0) return 0;

    const drawdownPct = ((totalCost - totalCurrentValue) / totalCost) * 100;
    // Cap at 100, floor at 0
    return Math.round(Math.min(100, Math.max(0, drawdownPct)));
  }
}
