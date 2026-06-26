import type { EngineInput, EngineResult } from './types';
import { GROWTH_THRESHOLDS as G } from './calibration';
import { weightedAverage } from '@/types';

export class GrowthEngine {
  static evaluate(input: EngineInput): EngineResult {
    const { revenueGrowth, epsGrowth, fcfGrowth, profitGrowth } = input.fundamentals;

    let revenueScore = 50;
    if (revenueGrowth !== null) {
      if (revenueGrowth >= G.REVENUE_EXCELLENT) revenueScore = 95;
      else if (revenueGrowth >= G.REVENUE_GOOD) revenueScore = 85;
      else if (revenueGrowth >= G.REVENUE_FAIR) revenueScore = 75;
      else if (revenueGrowth >= G.REVENUE_LOW) revenueScore = 60;
      else if (revenueGrowth >= 0) revenueScore = 40;
      else if (revenueGrowth >= -0.05) revenueScore = 25;
      else revenueScore = 10;
    }

    let epsScore = 50;
    if (epsGrowth !== null) {
      if (epsGrowth >= G.EPS_EXCELLENT) epsScore = 95;
      else if (epsGrowth >= G.EPS_GOOD) epsScore = 80;
      else if (epsGrowth >= G.EPS_FAIR) epsScore = 70;
      else if (epsGrowth >= G.EPS_LOW) epsScore = 55;
      else if (epsGrowth >= 0) epsScore = 40;
      else if (epsGrowth >= -0.10) epsScore = 25;
      else epsScore = 10;
    }

    let fcfScore = 50;
    if (fcfGrowth !== null) {
      if (fcfGrowth >= 0.20) fcfScore = 95;
      else if (fcfGrowth >= 0.10) fcfScore = 80;
      else if (fcfGrowth >= 0.05) fcfScore = 65;
      else if (fcfGrowth >= 0) fcfScore = 45;
      else if (fcfGrowth >= -0.10) fcfScore = 25;
      else fcfScore = 10;
    }

    let profitScore = 50;
    if (profitGrowth !== null) {
      if (profitGrowth >= 0.25) profitScore = 95;
      else if (profitGrowth >= 0.15) profitScore = 85;
      else if (profitGrowth >= 0.10) profitScore = 70;
      else if (profitGrowth >= 0.05) profitScore = 55;
      else if (profitGrowth >= 0) profitScore = 40;
      else if (profitGrowth >= -0.10) profitScore = 25;
      else profitScore = 10;
    }

    const score = weightedAverage([
      { score: revenueScore, weight: 3 },
      { score: epsScore, weight: 3 },
      { score: fcfScore, weight: 2 },
      { score: profitScore, weight: 2 },
    ]);

    const missingFields = [revenueGrowth, epsGrowth].filter(f => f === null).length;
    const confidence: 'high' | 'medium' | 'low' = missingFields > 1 ? 'low' : missingFields > 0 ? 'medium' : 'high';

    return { score, confidence };
  }
}
