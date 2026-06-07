export type HealthScoreInputs = {
  businessQuality: number; // 0 - 100
  financialStrength: number;
  priceBehaviour: number;
  sectorStrength: number;
  marketSentiment: number;
  earningsConsistency: number;
  riskStability: number;
};

export class HealthScoreEngine {
  /**
   * Healthometer 2.0 Score Calculation (Section 41)
   * Business Quality: 25%
   * Financial Strength: 20%
   * Price Behaviour: 15%
   * Sector Strength: 10%
   * Market Sentiment: 10%
   * Earnings Consistency: 10%
   * Risk Stability: 10%
   */
  static calculateScore(inputs: HealthScoreInputs): number {
    const score =
      inputs.businessQuality * 0.25 +
      inputs.financialStrength * 0.20 +
      inputs.priceBehaviour * 0.15 +
      inputs.sectorStrength * 0.10 +
      inputs.marketSentiment * 0.10 +
      inputs.earningsConsistency * 0.10 +
      inputs.riskStability * 0.10;

    return Math.round(Math.max(0, Math.min(100, score)));
  }

  static getHealthStatus(score: number): "Very Healthy" | "Healthy" | "Stable" | "Weakening" | "Unhealthy" {
    if (score >= 90) return "Very Healthy";
    if (score >= 75) return "Healthy";
    if (score >= 60) return "Stable";
    if (score >= 45) return "Weakening";
    return "Unhealthy";
  }
}
