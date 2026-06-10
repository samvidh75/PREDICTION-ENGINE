// src/services/dna/BusinessQualityEngine.ts
import { RegisteredStock } from "../stocks/StockRegistry";
import { finitePeRatio, rangeProximity } from "./dnaInputs";

export type DNAStatus = "Very Strong" | "Strong" | "Stable" | "Weakening" | "Weak";

export class BusinessQualityEngine {
  public static evaluate(stock: RegisteredStock): { score: number; status: DNAStatus } {
    // Determine quality using PE ratio boundaries and 52-week price proximity as mock quality heuristics
    let score = 70; // Base score
    
    const pe = finitePeRatio(stock);
    if (pe !== null && pe > 0 && pe < 20) {
      score += 15; // Fair valuation quality
    } else if (pe !== null && pe >= 20 && pe < 40) {
      score += 5;
    } else if (pe !== null && pe >= 40) {
      score -= 10; // Overvalued / high expectations quality strain
    } else if (pe !== null) {
      score -= 20; // Loss making / negative PE quality impact
    }

    // High proximity to low bounds implies stable support / base quality
    const proximity = rangeProximity(stock);
    if (proximity !== null && proximity > 0.4 && proximity < 0.8) {
      score += 10;
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
