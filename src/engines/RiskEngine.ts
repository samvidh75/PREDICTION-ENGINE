import type { EngineInput } from './types';
import { clampScore } from '@/types';

export class RiskEngine {
  static evaluate(input: EngineInput): { score: number; confidence: 'high' | 'medium' | 'low' } {
    const fund = input.fundamentals;
    let flags = 0;
    if (fund?.fcfYield !== null && fund?.fcfYield !== undefined && fund.fcfYield < -0.05) flags++;
    if (fund?.debtEquity !== null && fund?.debtEquity !== undefined && fund.debtEquity > 2) flags++;
    const score = clampScore(Math.round(Math.max(0, 100 - flags * 30)));
    return { score, confidence: flags > 1 ? 'low' : flags > 0 ? 'medium' : 'high' };
  }
}