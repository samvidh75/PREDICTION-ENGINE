// src/services/discovery/DiscoveryEngine.ts
import { StockRegistry, RegisteredStock } from "../stocks/StockRegistry";

export interface OpportunityCluster {
  highHealth: RegisteredStock[];
  improving: RegisteredStock[];
  sectorLeaders: RegisteredStock[];
  momentumLeaders: RegisteredStock[];
  emerging: RegisteredStock[];
}

export class DiscoveryEngine {
  public static getOpportunities(): OpportunityCluster {
    const all = StockRegistry.getAllStocks();

    const highHealth = all
      .filter((s) => s.healthStatus === "veryHealthy" || s.healthStatus === "healthy")
      .slice(0, 12);

    const improving = all
      .filter((s) => s.healthStatus === "healthy" || s.healthStatus === "stable")
      .slice(0, 12);

    const sectorLeaders = all
      .filter((s) => s.peRatio != null && s.peRatio > 0 && s.peRatio < 30)
      .slice(0, 12);

    const momentumLeaders = all
      .filter((s) => {
        const range = s.fiftyTwoWeekRange;
        if (!range || range.current == null || range.low == null || range.high == null) return false;
        const proximity = (range.current - range.low) / (range.high - range.low || 1);
        return proximity > 0.7; // strong momentum
      })
      .slice(0, 12);

    const emerging = all
      .filter((s) => {
        const range = s.fiftyTwoWeekRange;
        if (!range || range.current == null || range.low == null || range.high == null) return false;
        const proximity = (range.current - range.low) / (range.high - range.low || 1);
        return proximity >= 0.3 && proximity <= 0.6; // consolidation base
      })
      .slice(0, 12);

    return {
      highHealth,
      improving,
      sectorLeaders,
      momentumLeaders,
      emerging,
    };
  }
}
