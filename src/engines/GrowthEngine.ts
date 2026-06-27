import type { EngineInput } from './types';
import { clampScore, weightedAverage } from '@/types';

const THRESHOLDS = {
  REVENUE_EXCELLENT: 0.20, REVENUE_GOOD: 0.15, REVENUE_FAIR: 0.10, REVENUE_LOW: 0.05,
  EPS_EXCELLENT: 0.25, EPS_GOOD: 0.15, EPS_FAIR: 0.10, EPS_LOW: 0.05,
};

function scoreMetric(value: number | null | undefined, excellent: number, good: number, fair: number, low: number): { score: number; confidence: 'high' | 'medium' | 'low' } {
  if (value === null || value === undefined) return { score: 0, confidence: 'low' };
  if (value >= excellent) return { score: 95, confidence: 'high' };
  if (value >= good) return { score: 80, confidence: 'high' };
  if (value >= fair) return { score: 60, confidence: 'medium' };
  if (value >= low) return { score: 40, confidence: 'medium' };
  return { score: 20, confidence: 'low' };
}

export class GrowthEngine {
  static evaluate(input: EngineInput): { score: number; confidence: 'high' | 'medium' | 'low' } {
    const fund = input.fundamentals;
    const revenue = scoreMetric(fund?.revenueGrowth, THRESHOLDS.REVENUE_EXCELLENT, THRESHOLDS.REVENUE_GOOD, THRESHOLDS.REVENUE_FAIR, THRESHOLDS.REVENUE_LOW);
    const eps = scoreMetric(fund?.epsGrowth, THRESHOLDS.EPS_EXCELLENT, THRESHOLDS.EPS_GOOD, THRESHOLDS.EPS_FAIR, THRESHOLDS.EPS_LOW);
    const score = clampScore(Math.round(revenue.score * 0.5 + eps.score * 0.5));
    const confs = [revenue.confidence, eps.confidence];
    const confidence: 'high' | 'medium' | 'low' = confs.some(c => c === 'low') ? 'low' : confs.every(c => c === 'high') ? 'high' : 'medium';
    return { score, confidence };
  }
}