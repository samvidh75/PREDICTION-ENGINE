// src/services/dna/GrowthEngine.ts
import { RegisteredStock } from "../stocks/StockRegistry";
import { DNAStatus } from "./BusinessQualityEngine";

export class GrowthEngine {
  public static evaluate(stock: RegisteredStock): { score: number; status: DNAStatus } {
    let score = 65; // Base score

    // High PE implies growth expectations
    const pe = stock.peRatio;
    if (pe > 35) {
      score += 20; // Hyper-growth expectations
    } else if (pe >= 20 && pe <= 35) {
      score += 10; // Steady expansion
    } else if (pe > 0 && pe < 20) {
      score -= 5; // Muted growth / value territory
    }

    // Proximity to high boundaries implies current momentum and expansion velocity
    const range = stock.fiftyTwoWeekRange;
    const Proximity = (range.current - range.low) / (range.high - range.low || 1);
    if (Proximity > 0.7) {
      score += 15;
    } else if (Proximity < 0.3) {
      score -= 15;
    }

    score = Math.max(10, Math.min(100, score));

    let status: DNAStatus = "Stable";
    if (score >= 85) status = "Very Strong";
    else if (score >= 70) status = "Strong";
    else if (score >= 55) status = "Stable";
    else if (score >= 35) status = "Weakening";
    else status = "Weak";

    return { score, status };
  }
}
