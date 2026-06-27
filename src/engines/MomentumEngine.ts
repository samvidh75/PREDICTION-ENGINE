import type { EngineInput } from './types';
import { clampScore } from '@/types';

export class MomentumEngine {
  static evaluate(input: EngineInput): { score: number; confidence: 'high' | 'medium' | 'low' } {
    const tech = input.technicals;
    if (!tech || tech.rsi === null) return { score: 0, confidence: 'low' };
    const rsi = tech.rsi;
    let score: number;
    if (rsi >= 55 && rsi <= 65) score = 90;
    else if (rsi >= 50 && rsi < 55) score = 75;
    else if (rsi > 65 && rsi <= 70) score = 65;
    else if (rsi >= 65) score = 40;
    else if (rsi < 40) score = 30;
    else score = 50;
    return { score: clampScore(score), confidence: 'medium' };
  }
}