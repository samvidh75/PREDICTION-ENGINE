import type { EngineInput, EngineResult } from './types';
import { QUALITY_THRESHOLDS as Q } from './calibration';
import { clampScore, weightedAverage } from '@/types';

export class QualityEngine {
  static evaluate(input: EngineInput): EngineResult {
    const { roe, roic, roa, grossMargin, operatingMargin } = input.fundamentals;

    let roeScore = 50;
    if (roe !== null) {
      if (roe >= Q.ROE_EXCELLENT) roeScore = 95;
      else if (roe >= Q.ROE_GOOD) roeScore = 80;
      else if (roe >= Q.ROE_FAIR) roeScore = 65;
      else if (roe >= Q.ROE_LOW) roeScore = 45;
      else if (roe >= 0) roeScore = 30;
      else roeScore = 10;
    }

    let roicScore = 50;
    if (roic !== null) {
      if (roic >= Q.ROIC_EXCELLENT) roicScore = 95;
      else if (roic >= Q.ROIC_GOOD) roicScore = 80;
      else if (roic >= Q.ROIC_FAIR) roicScore = 65;
      else if (roic >= Q.ROIC_LOW) roicScore = 50;
      else if (roic >= 0) roicScore = 35;
      else roicScore = 10;
    }

    let roaScore = 50;
    if (roa !== null) {
      if (roa >= 0.15) roaScore = 95;
      else if (roa >= 0.05) roaScore = 65;
      else if (roa >= 0) roaScore = 30;
      else roaScore = 10;
    }

    let gmScore = 50;
    if (grossMargin !== null) {
      if (grossMargin >= Q.GM_EXCELLENT) gmScore = 95;
      else if (grossMargin >= Q.GM_GOOD) gmScore = 80;
      else if (grossMargin >= Q.GM_FAIR) gmScore = 65;
      else if (grossMargin >= Q.GM_LOW) gmScore = 45;
      else gmScore = 25;
    }

    let omScore = 50;
    if (operatingMargin !== null) {
      if (operatingMargin >= Q.OM_EXCELLENT) omScore = 95;
      else if (operatingMargin >= Q.OM_GOOD) omScore = 80;
      else if (operatingMargin >= Q.OM_FAIR) omScore = 65;
      else if (operatingMargin >= Q.OM_LOW) omScore = 45;
      else omScore = 25;
    }

    const score = weightedAverage([
      { score: roeScore, weight: 2 },
      { score: roicScore, weight: 2 },
      { score: roaScore, weight: roa !== null ? 2 : 0 },
      { score: gmScore, weight: grossMargin !== null ? 2 : 0 },
      { score: omScore, weight: 2 },
    ]);

    const missingFields = [roe, roic].filter(f => f === null).length;
    const confidence: 'high' | 'medium' | 'low' = missingFields > 1 ? 'low' : missingFields > 0 ? 'medium' : 'high';

    return { score, confidence };
  }
}
