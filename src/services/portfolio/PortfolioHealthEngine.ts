// src/services/portfolio/PortfolioHealthEngine.ts
import { SectorWeight } from "./PortfolioAnalyticsEngine";

export type PortfolioHealthState = "Excellent" | "Strong" | "Healthy" | "Stable" | "Weakening" | "At Risk";

export class PortfolioHealthEngine {
  public static evaluateHealth(
    sectorWeights: SectorWeight[],
    volatility: number, // 0..100
    drawdown: number // 0..100
  ): { score: number; status: PortfolioHealthState } {
    let score = 80; // Base score

    // Concentration penalty
    const topSectorWeight = sectorWeights[0]?.weightPct || 0;
    if (topSectorWeight > 50) {
      score -= 25; // Excessive concentration penalty
    } else if (topSectorWeight > 35) {
      score -= 10;
    } else {
      score += 10; // Well diversified
    }

    // Volatility penalty
    if (volatility > 60) {
      score -= 15;
    } else if (volatility < 25) {
      score += 5;
    }

    // Drawdown penalty
    if (drawdown > 20) {
      score -= 20;
    } else if (drawdown < 8) {
      score += 5;
    }

    score = Math.max(10, Math.min(100, score));

    let status: PortfolioHealthState;
    if (score >= 90) status = "Excellent";
    else if (score >= 80) status = "Strong";
    else if (score >= 65) status = "Healthy";
    else if (score >= 50) status = "Stable";
    else if (score >= 35) status = "Weakening";
    else status = "At Risk";

    return { score, status };
  }
}
