import type { EngineInput } from './types';
import { clampScore, weightedAverage } from '@/types';

const THRESHOLDS = {
  ROE_EXCELLENT: 25, ROE_GOOD: 18, ROE_FAIR: 12, ROE_LOW: 5,
  ROIC_EXCELLENT: 20, ROIC_GOOD: 15, ROIC_FAIR: 10, ROIC_LOW: 5,
  GM_EXCELLENT: 0.40, GM_GOOD: 0.25, GM_FAIR: 0.15, GM_LOW: 0.08,
  OM_EXCELLENT: 0.20, OM_GOOD: 0.12, OM_FAIR: 0.06, OM_LOW: 0.02,
};

function scoreMetric(value: number | null | undefined, excellent: number, good: number, fair: number, low: number): { score: number; confidence: 'high' | 'medium' | 'low' } {
  if (value === null || value === undefined) return { score: 0, confidence: 'low' };
  if (value >= excellent) return { score: 95, confidence: 'high' };
  if (value >= good) return { score: 80, confidence: 'high' };
  if (value >= fair) return { score: 60, confidence: 'medium' };
  if (value >= low) return { score: 40, confidence: 'medium' };
  return { score: 20, confidence: 'low' };
}

export class QualityEngine {
  static evaluate(input: EngineInput): { score: number; confidence: 'high' | 'medium' | 'low' } {
    const fund = input.fundamentals;
    const roe = scoreMetric(fund?.roe, THRESHOLDS.ROE_EXCELLENT, THRESHOLDS.ROE_GOOD, THRESHOLDS.ROE_FAIR, THRESHOLDS.ROE_LOW);
    const roic = scoreMetric(fund?.roic, THRESHOLDS.ROIC_EXCELLENT, THRESHOLDS.ROIC_GOOD, THRESHOLDS.ROIC_FAIR, THRESHOLDS.ROIC_LOW);
    const gm = scoreMetric(fund?.grossMargin, THRESHOLDS.GM_EXCELLENT, THRESHOLDS.GM_GOOD, THRESHOLDS.GM_FAIR, THRESHOLDS.GM_LOW);
    const om = scoreMetric(fund?.operatingMargin, THRESHOLDS.OM_EXCELLENT, THRESHOLDS.OM_GOOD, THRESHOLDS.OM_FAIR, THRESHOLDS.OM_LOW);
    const score = clampScore(Math.round(roe.score * 0.35 + roic.score * 0.25 + gm.score * 0.20 + om.score * 0.20));
    const confs = [roe.confidence, roic.confidence, gm.confidence, om.confidence];
    const confidence: 'high' | 'medium' | 'low' = confs.some(c => c === 'low') ? 'low' : confs.every(c => c === 'high') ? 'high' : 'medium';
    return { score, confidence };
  }
}