// src/services/portfolio/PortfolioAnalyticsEngine.ts
import { UserHolding } from "./PortfolioEngine";

export interface SectorWeight {
  sector: string;
  weightPct: number;
}

export class PortfolioAnalyticsEngine {
  public static calculateWeights(holdings: UserHolding[], currentPrices: Record<string, number>): SectorWeight[] {
    const totalVal = holdings.reduce((acc, h) => {
      const price = currentPrices[h.symbol] || h.avgBuyPrice;
      return acc + h.shares * price;
    }, 0) || 1;

    const sectorVals: Record<string, number> = {};
    for (const h of holdings) {
      const price = currentPrices[h.symbol] || h.avgBuyPrice;
      const val = h.shares * price;
      sectorVals[h.sector] = (sectorVals[h.sector] || 0) + val;
    }

    return Object.entries(sectorVals).map(([sector, val]) => ({
      sector,
      weightPct: Math.round((val / totalVal) * 100),
    })).sort((a, b) => b.weightPct - a.weightPct);
  }
}
