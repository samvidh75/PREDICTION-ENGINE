// src/services/dna/SentimentEngine.ts
import { RegisteredStock } from "../stocks/StockRegistry";
import { DNAStatus } from "./BusinessQualityEngine";
import { rangeProximity } from "./dnaInputs";

export class SentimentEngine {
  public static evaluate(stock: RegisteredStock): { score: number; status: DNAStatus } {
    let score = 70; // Base sentiment

    // Proximity to high boundaries indicates aggressive buying sentiment
    const proximity = rangeProximity(stock);
    if (proximity !== null && proximity > 0.8) {
      score += 20; // Bullish sentiment
    } else if (proximity !== null && proximity < 0.25) {
      score -= 25; // Bearish sentiment
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
