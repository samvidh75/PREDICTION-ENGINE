// src/services/dna/RiskEngine.ts
import { RegisteredStock } from "../stocks/StockRegistry";
import { DNAStatus } from "./BusinessQualityEngine";
import { finitePeRatio, rangeProximity } from "./dnaInputs";

export class RiskEngine {
  public static evaluate(stock: RegisteredStock): { score: number; status: DNAStatus } {
    let score = 40; // Risk score - lower is safer, but we scale it such that high score means highly robust/low risk.

    const pe = finitePeRatio(stock);
    if (pe !== null && pe > 50) {
      score += 35; // Extreme pricing multiple risk
    } else if (pe !== null && pe > 30) {
      score += 15;
    } else if (pe !== null && pe < 0) {
      score += 40; // Loss-making is high risk
    }

    const proximity = rangeProximity(stock);
    if (proximity !== null && proximity < 0.20) {
      score += 20; // Proximity to lows signifies negative price channels / stress
    }

    score = Math.max(10, Math.min(100, score));

    // Convert high score to standard status where low risk = Very Strong, high risk = Weak
    let status: DNAStatus;
    if (score <= 25) status = "Very Strong";      // Safe
    else if (score <= 45) status = "Strong";      // Moderate
    else if (score <= 65) status = "Stable";      // High
    else if (score <= 80) status = "Weakening";   // Very High
    else status = "Weak";                         // Speculative / Distress

    return { score, status };
  }
}
