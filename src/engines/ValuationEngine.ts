import type { EngineInput } from './types';
import { clampScore } from '@/types';

const THRESHOLDS = {
  PE_CHEAP: 15, PE_FAIR: 25, PE_EXPENSIVE: 35, PE_EXTREME: 50,
  PB_CHEAP: 1.5, PB_FAIR: 3, PB_EXPENSIVE: 5, PB_EXTREME: 8,
  EV_CHEAP: 8, EV_FAIR: 15, EV_EXPENSIVE: 25, EV_EXTREME: 40,
};

function scoreInverse(value: number | null | undefined, cheap: number, fair: number, expensive: number, extreme: number): { score: number; confidence: 'high' | 'medium' | 'low' } {
  if (value === null || value === undefined) return { score: 0, confidence: 'low' };
  if (value <= cheap) return { score: 95, confidence: 'high' };
  if (value <= fair) return { score: 75, confidence: 'high' };
  if (value <= expensive) return { score: 50, confidence: 'medium' };
  if (value <= extreme) return { score: 30, confidence: 'medium' };
  return { score: 10, confidence: 'low' };
}

export class ValuationEngine {
  static evaluate(input: EngineInput): { score: number; confidence: 'high' | 'medium' | 'low' } {
    const fund = input.fundamentals;
    const pe = scoreInverse(fund?.peRatio, THRESHOLDS.PE_CHEAP, THRESHOLDS.PE_FAIR, THRESHOLDS.PE_EXPENSIVE, THRESHOLDS.PE_EXTREME);
    const pb = scoreInverse(fund?.pbRatio, THRESHOLDS.PB_CHEAP, THRESHOLDS.PB_FAIR, THRESHOLDS.PB_EXPENSIVE, THRESHOLDS.PB_EXTREME);
    const score = clampScore(Math.round(pe.score * 0.6 + pb.score * 0.4));
    const confidence: 'high' | 'medium' | 'low' = pe.confidence === 'low' || pb.confidence === 'low' ? 'low' : pe.confidence === 'high' && pb.confidence === 'high' ? 'high' : 'medium';
    return { score, confidence };
  }
}