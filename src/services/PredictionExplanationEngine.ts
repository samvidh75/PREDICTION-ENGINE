// src/services/PredictionExplanationEngine.ts
// Production Prediction Explanation Engine.
// Evaluates feature/factor contributions for individual ML model predictions.

export interface PredictionInput {
  symbol: string;
  horizon: string;
  predictionValue: number;
  features: {
    rsi: number;
    macd: number;
    adx: number;
    atr: number;
    momentum: number;
    volatility: number;
    relativeStrength: number;
    trendStrength: number;
  };
  factors: {
    qualityFactor: number;
    valueFactor: number;
    growthFactor: number;
    momentumFactor: number;
    riskFactor: number;
    sectorStrengthFactor: number;
  };
}

export interface PredictionExplanation {
  symbol: string;
  horizon: string;
  predictedReturn: number;
  topPositiveDrivers: string[];
  topNegativeDrivers: string[];
  factorContributions: {
    factor: string;
    contributionScore: number; // -100 to 100 representing direct impact
  }[];
}

export class PredictionExplanationEngine {
  explain(input: PredictionInput): PredictionExplanation {
    const topPositiveDrivers: string[] = [];
    const topNegativeDrivers: string[] = [];
    const factorContributions: { factor: string; contributionScore: number }[] = [];

    // Analyze technical feature drivers
    const { rsi, macd, adx, atr, momentum, volatility, relativeStrength, trendStrength } = input.features;

    // Feature thresholds based on classic quantitative guidelines
    if (rsi > 60) topPositiveDrivers.push(`RSI Momentum: Overbought strength (Value: ${Math.round(rsi)})`);
    else if (rsi < 40) topNegativeDrivers.push(`RSI Momentum: Oversold weakness (Value: ${Math.round(rsi)})`);

    if (momentum > 0.05) topPositiveDrivers.push(`Momentum: Strong 10-day rate of change (+${Math.round(momentum * 100)}%)`);
    else if (momentum < -0.05) topNegativeDrivers.push(`Momentum: Declining rate of change (${Math.round(momentum * 100)}%)`);

    if (trendStrength > 0.02) topPositiveDrivers.push(`Trend: Rising exponential moving average gap (Value: ${trendStrength.toFixed(4)})`);
    else if (trendStrength < -0.02) topNegativeDrivers.push(`Trend: Dropping exponential moving average gap (Value: ${trendStrength.toFixed(4)})`);

    if (relativeStrength > 0.01) topPositiveDrivers.push(`Market Relative: Beating index averages (+${Math.round(relativeStrength * 100)}% daily alpha)`);
    else if (relativeStrength < -0.01) topNegativeDrivers.push(`Market Relative: Underperforming index averages (${Math.round(relativeStrength * 100)}% daily alpha)`);

    // Ensure we have at least one placeholder driver if features are in neutral bands
    if (topPositiveDrivers.length === 0) topPositiveDrivers.push("Technical features are holding within stable trading bands");
    if (topNegativeDrivers.length === 0) topNegativeDrivers.push("No sharp breakdown triggers observed in current indicators");

    // Calculate Factor Contributions based on weights and factor scores relative to neutral (50)
    const factorWeights: Record<keyof typeof input.factors, { name: string; weight: number }> = {
      qualityFactor: { name: "Quality", weight: 0.15 },
      valueFactor: { name: "Value", weight: 0.20 },
      growthFactor: { name: "Growth", weight: 0.20 },
      momentumFactor: { name: "Momentum", weight: 0.25 },
      riskFactor: { name: "Risk Safety", weight: 0.10 },
      sectorStrengthFactor: { name: "Sector Strength", weight: 0.10 },
    };

    for (const [key, value] of Object.entries(input.factors)) {
      const k = key as keyof typeof input.factors;
      const val = Number(value);
      const conf = factorWeights[k];

      // Contribution = (Score - Neutral) * Weight
      const rawContribution = (val - 50) * conf.weight;
      factorContributions.push({
        factor: conf.name,
        contributionScore: Math.round(rawContribution * 100) / 100,
      });
    }

    return {
      symbol: input.symbol,
      horizon: input.horizon,
      predictedReturn: Math.round(input.predictionValue * 10000) / 10000,
      topPositiveDrivers,
      topNegativeDrivers,
      factorContributions,
    };
  }
}

export const predictionExplanationEngine = new PredictionExplanationEngine();
export default predictionExplanationEngine;
