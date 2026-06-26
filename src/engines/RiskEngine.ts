import type { EngineInput, EngineResult } from './types';
import { RISK_THRESHOLDS as R } from './calibration';
import { clampScore, weightedAverage } from '@/types';

export class RiskEngine {
  static evaluate(input: EngineInput): EngineResult {
    const { fcfYield, operatingMargin, beta, peRatio, marketCap, revenueGrowth, epsGrowth } = input.fundamentals;
    const volatility = input.technicals?.volatility ?? null;

    let anomalyScore = 50;
    let anomalies = 0;

    if (revenueGrowth !== null && epsGrowth !== null) {
      const divergence = Math.abs(revenueGrowth - epsGrowth);
      if (epsGrowth > revenueGrowth && divergence > 0.20) {
        anomalyScore -= 20;
        anomalies++;
      } else if (epsGrowth > revenueGrowth && divergence > 0.10) {
        anomalyScore -= 10;
      }
    }

    if (peRatio !== null && peRatio <= 0 && marketCap !== null && marketCap > 10000) {
      anomalyScore -= 15;
      anomalies++;
    }

    if (operatingMargin !== null && operatingMargin < 0 && epsGrowth !== null && epsGrowth > 0.05) {
      anomalyScore -= 15;
      anomalies++;
    }

    let cashFlowScore = 50;
    if (fcfYield !== null) {
      if (fcfYield < R.FCF_YIELD_STRESS) cashFlowScore = 90;
      else if (fcfYield < R.FCF_YIELD_WARNING) cashFlowScore = 75;
      else if (fcfYield < R.FCF_YIELD_FAIR) cashFlowScore = 55;
      else if (fcfYield < R.FCF_YIELD_GOOD) cashFlowScore = 35;
      else cashFlowScore = 20;
    }

    if (operatingMargin !== null && operatingMargin < 0.05) {
      cashFlowScore = Math.min(95, cashFlowScore + 15);
    }

    let volatilityScore = 50;
    if (volatility !== null) {
      if (volatility > R.VOLATILITY_HIGH) volatilityScore = 90;
      else if (volatility > R.VOLATILITY_ELEVATED) volatilityScore = 75;
      else if (volatility > R.VOLATILITY_MODERATE) volatilityScore = 60;
      else if (volatility > R.VOLATILITY_LOW) volatilityScore = 45;
      else if (volatility > 0.15) volatilityScore = 30;
      else volatilityScore = 15;
    }

    if (beta !== null) {
      if (beta > R.BETA_HIGH) volatilityScore = Math.min(95, volatilityScore + 20);
      else if (beta > R.BETA_ELEVATED) volatilityScore = Math.min(95, volatilityScore + 10);
      else if (beta < R.BETA_LOW) volatilityScore = Math.max(5, volatilityScore - 10);
    }

    const rawScore = weightedAverage([
      { score: anomalyScore, weight: 2.5 },
      { score: cashFlowScore, weight: 3.5 },
      { score: volatilityScore, weight: 4 },
    ]);

    const confidence: 'high' | 'medium' | 'low' = anomalies > 2 ? 'low' : anomalies > 0 ? 'medium' : 'high';

    return { score: clampScore(rawScore), confidence };
  }
}
