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
    const health = PortfolioHealthEngine.evaluateHealth(sectorExposure, 32, 5.2);
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
}
