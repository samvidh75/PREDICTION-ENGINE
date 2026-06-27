import type { EngineInput } from './types';
import { QualityEngine } from './QualityEngine';
import { ValuationEngine } from './ValuationEngine';
import { GrowthEngine } from './GrowthEngine';
import { RiskEngine } from './RiskEngine';
import { MomentumEngine } from './MomentumEngine';
import { clampScore } from '@/types';

const ENGINE_WEIGHTS = {
  QUALITY: 0.40,
  VALUATION: 0.25,
  GROWTH: 0.15,
  RISK: 0.15,
  MOMENTUM: 0.05,
};

export interface UnifiedOutput {
  score: number;
  confidence: 'high' | 'medium' | 'low';
  components: {
    quality: number;
    valuation: number;
    growth: number;
    risk: number;
    momentum: number;
  };
}

export class UnifiedEngine {
  static evaluate(input: EngineInput): UnifiedOutput {
    const quality = QualityEngine.evaluate(input);
    const valuation = ValuationEngine.evaluate(input);
    const growth = GrowthEngine.evaluate(input);
    const risk = RiskEngine.evaluate(input);
    const momentum = MomentumEngine.evaluate(input);

    const overall = clampScore(
      Math.round(
        quality.score * ENGINE_WEIGHTS.QUALITY +
        valuation.score * ENGINE_WEIGHTS.VALUATION +
        growth.score * ENGINE_WEIGHTS.GROWTH +
        (100 - risk.score) * ENGINE_WEIGHTS.RISK +
        momentum.score * ENGINE_WEIGHTS.MOMENTUM
      )
    );

    const allHigh = [quality, valuation, growth, risk, momentum].every(e => e.confidence === 'high');
    const anyLow = [quality, valuation, growth, risk, momentum].some(e => e.confidence === 'low');

    return {
      score: overall,
      confidence: anyLow ? 'low' : allHigh ? 'high' : 'medium',
      components: {
        quality: quality.score,
        valuation: valuation.score,
        growth: growth.score,
        risk: risk.score,
        momentum: momentum.score,
      },
    };
  }

  static getStateLabel(score: number): string {
    if (score >= 75) return 'High Conviction';
    if (score >= 60) return 'Watch';
    if (score >= 40) return 'Needs Review';
    return 'Avoid for Now';
  }
}
