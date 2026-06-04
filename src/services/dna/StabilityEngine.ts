// src/services/dna/StabilityEngine.ts
import { RegisteredStock } from "../stocks/StockRegistry";
import { DNAStatus } from "./BusinessQualityEngine";

export class StabilityEngine {
  public static evaluate(stock: RegisteredStock): { score: number; status: DNAStatus } {
    let score = 75; // Stability starts robust by default for our Indian Universe

    // Lower PE frequently maps to stable, defensive legacy firms
    const pe = stock.peRatio;
    if (pe > 0 && pe < 22) {
      score += 15;
    } else if (pe >= 45) {
      score -= 10; // High speculative expectations decrease structural stability score
    }

    // Proximity stability - middle band proximity suggests consolidated pricing
    const range = stock.fiftyTwoWeekRange;
    const Proximity = (range.current - range.low) / (range.high - range.low || 1);
    if (Proximity >= 0.35 && Proximity <= 0.65) {
      score += 10;
    } else if (Proximity < 0.15) {
      score -= 20; // Proximity to lows signals structural stress
    }

    score = Math.max(10, Math.min(100, score));

    let status: DNAStatus = "Stable";
    if (score >= 85) status = "Very Strong";
    else if (score >= 70) status = "Strong";
    else if (score >= 50) status = "Stable";
    else if (score >= 30) status = "Weakening";
    else status = "Weak";

    return { score, status };
  }
}
