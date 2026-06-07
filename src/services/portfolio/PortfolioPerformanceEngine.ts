// src/services/portfolio/PortfolioPerformanceEngine.ts
import { UserHolding } from "./PortfolioEngine";

export interface PerformanceSnapshot {
  totalCost: number;
  currentValue: number;
  totalGainPct: number;
  totalGainAmount: number;
  bestPerformerSymbol: string;
}

export class PortfolioPerformanceEngine {
  public static evaluatePerformance(
    holdings: UserHolding[],
    currentPrices: Record<string, number>
  ): PerformanceSnapshot {
    let totalCost = 0;
    let currentValue = 0;
    let bestPerformerSymbol = "None";
    let bestGainPct = -Infinity;

    for (const h of holdings) {
      const cost = h.shares * h.avgBuyPrice;
      const currentPrice = currentPrices[h.symbol] || h.avgBuyPrice;
      const val = h.shares * currentPrice;

      totalCost += cost;
      currentValue += val;

      const gainPct = ((currentPrice - h.avgBuyPrice) / h.avgBuyPrice) * 100;
      if (gainPct > bestGainPct) {
        bestGainPct = gainPct;
        bestPerformerSymbol = h.symbol;
      }
    }

    const totalGainAmount = currentValue - totalCost;
    const totalGainPct = totalCost > 0 ? (totalGainAmount / totalCost) * 100 : 0;

    return {
      totalCost,
      currentValue,
      totalGainPct: parseFloat(totalGainPct.toFixed(2)),
      totalGainAmount: parseFloat(totalGainAmount.toFixed(2)),
      bestPerformerSymbol,
    };
  }
}
