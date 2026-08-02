// src/services/portfolio/PortfolioRiskEngine.ts
import { UserHolding } from "./PortfolioEngine";

export interface RiskAnalysis {
  weakestHoldingSymbol: string;
  weakestHoldingReason: string;
  hasConcentrationRisk: boolean;
}

export class PortfolioRiskEngine {
  public static analyzeRisk(holdings: UserHolding[]): RiskAnalysis {
    if (holdings.length === 0) {
      return { weakestHoldingSymbol: "None", weakestHoldingReason: "No holdings active", hasConcentrationRisk: false };
    }

    // High PE or loss making sector allocations usually suggest higher relative volatility risk
    const defensiveSectors = ["Defence", "Pharma", "Banking"];
    const highRiskHoldings = holdings.filter((h) => !defensiveSectors.includes(h.sector));

    const weakest = highRiskHoldings[0] || holdings[0];

    // Determine sector concentration risk
    const sectorCounts: Record<string, number> = {};
    for (const h of holdings) {
      sectorCounts[h.sector] = (sectorCounts[h.sector] || 0) + 1;
    }

    const maxCount = Math.max(...Object.values(sectorCounts));
    const hasConcentrationRisk = maxCount > holdings.length * 0.5 && holdings.length > 2;

    return {
      weakestHoldingSymbol: weakest.symbol,
      weakestHoldingReason: "High volatility exposure relative to defensive legacy sectors.",
      hasConcentrationRisk,
    };
  }
}
