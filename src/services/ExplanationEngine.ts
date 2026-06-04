// src/services/ExplanationEngine.ts
// Production Explanation Engine to generate top positive and negative drivers for factor scores.

export interface FactorInputs {
  qualityFactor: number;
  valueFactor: number;
  growthFactor: number;
  momentumFactor: number;
  riskFactor: number;
  sectorStrengthFactor: number;
}

export class ExplanationEngine {
  private factorNames: Record<keyof FactorInputs, string> = {
    qualityFactor: "High balance sheet quality & profitability metrics",
    valueFactor: "Attractive valuation metrics (low P/E or strong earnings yield)",
    growthFactor: "Earnings expansion and positive moving average trends",
    momentumFactor: "Strong upward price momentum (RSI/MACD confirmations)",
    riskFactor: "Lower risk profile (stable returns, low volatility & low beta)",
    sectorStrengthFactor: "Aggressive outperformance of the stock's sector",
  };

  /**
   * Generates positive and negative drivers based on relative factor scores.
   */
  generateExplanations(factors: FactorInputs): {
    topPositiveDrivers: string[];
    topNegativeDrivers: string[];
  } {
    const entries = Object.entries(factors) as [keyof FactorInputs, number][];

    // Sort by score descending for positive drivers
    const sortedDesc = [...entries].sort((a, b) => b[1] - a[1]);
    // Sort by score ascending for negative drivers
    const sortedAsc = [...entries].sort((a, b) => a[1] - b[1]);

    // Positives: high scores (e.g., >= 50)
    const positiveDrivers = sortedDesc
      .slice(0, 2)
      .map(([key, score]) => `${this.factorNames[key]} (Score: ${score}/100)`);

    // Negatives: low scores (e.g., < 50)
    const negativeDrivers = sortedAsc
      .slice(0, 2)
      .map(([key, score]) => `${this.factorNames[key]} (Score: ${score}/100)`);

    return {
      topPositiveDrivers: positiveDrivers,
      topNegativeDrivers: negativeDrivers,
    };
  }
}

export default ExplanationEngine;
