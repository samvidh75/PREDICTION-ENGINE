import type { EngineInput, EngineResult } from './types';
import { VALUATION_THRESHOLDS as V } from './calibration';
import { clampScore, weightedAverage } from '@/types';

export class ValuationEngine {
  static evaluate(input: EngineInput): EngineResult {
    const { peRatio, pbRatio, evEbitda, fcfYield, dividendYield } = input.fundamentals;

    let peScore = 50;
    if (peRatio !== null) {
      if (peRatio <= 0) peScore = 20;
      else if (peRatio <= V.PE_CHEAP) peScore = 95;
      else if (peRatio <= V.PE_FAIR) peScore = 75;
      else if (peRatio <= V.PE_EXPENSIVE) peScore = 50;
      else if (peRatio <= V.PE_EXTREME) peScore = 30;
      else peScore = 10;
    }

    let pbScore = 50;
    if (pbRatio !== null) {
      if (pbRatio <= 0) pbScore = 15;
      else if (pbRatio <= V.PB_CHEAP) pbScore = 90;
      else if (pbRatio <= V.PB_FAIR) pbScore = 65;
      else if (pbRatio <= V.PB_EXPENSIVE) pbScore = 45;
      else if (pbRatio <= V.PB_EXTREME) pbScore = 25;
      else pbScore = 10;
    }

    let evScore = 50;
    if (evEbitda !== null) {
      if (evEbitda <= 0) evScore = 20;
      else if (evEbitda <= V.EV_CHEAP) evScore = 90;
      else if (evEbitda <= V.EV_FAIR) evScore = 70;
      else if (evEbitda <= V.EV_EXPENSIVE) evScore = 50;
      else if (evEbitda <= V.EV_EXTREME) evScore = 30;
      else evScore = 15;
    }

    let fcfScore = 50;
    if (fcfYield !== null) {
      if (fcfYield >= 0.08) fcfScore = 95;
      else if (fcfYield >= 0.05) fcfScore = 80;
      else if (fcfYield >= 0.03) fcfScore = 65;
      else if (fcfYield >= 0.02) fcfScore = 50;
      else if (fcfYield >= 0) fcfScore = 35;
      else fcfScore = 20;
    }

    let divScore = 50;
    if (dividendYield !== null) {
      if (dividendYield >= 0.20) divScore = 10;
      else if (dividendYield >= 0.12) divScore = 25;
      else if (dividendYield >= 0.08) divScore = 50;
      else if (dividendYield >= 0.04) divScore = 90;
      else if (dividendYield >= 0.03) divScore = 80;
      else if (dividendYield >= 0.02) divScore = 65;
      else if (dividendYield >= 0.01) divScore = 50;
      else if (dividendYield >= 0.005) divScore = 35;
      else divScore = 20;
    }

    const score = weightedAverage([
      { score: peScore, weight: 2 },
      { score: pbScore, weight: 2 },
      { score: evScore, weight: evEbitda !== null ? 2 : 0 },
      { score: fcfScore, weight: 3 },
      { score: divScore, weight: dividendYield !== null ? 1.5 : 0 },
    ]);

    const missingFields = [peRatio, pbRatio].filter(f => f === null).length;
    const confidence: 'high' | 'medium' | 'low' = missingFields > 1 ? 'low' : missingFields > 0 ? 'medium' : 'high';

    return { score, confidence };
  }
}
