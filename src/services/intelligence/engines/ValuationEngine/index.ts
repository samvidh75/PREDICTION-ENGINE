/**
 * Valuation Intelligence Engine
 *
 * Aggregates 5 sub-modules into a single 0-100 Valuation Score.
 * HIGHER score = BETTER value (cheaper / more attractive).
 *
 * Modules:
 *   PE Ratio (0-25): Price-to-earnings — core value anchor
 *   PB Ratio (0-25): Price-to-book — asset-backed value
 *   EV/EBITDA (0-20): Enterprise value multiple — capital-structure neutral
 *   FCF Yield (0-15): Free cash flow return — cash generation quality
 *   Dividend Yield (0-15): Income component — healthy vs distress yield
 */
import type { ValuationMetrics, ValuationScore } from '../../types';
import { scorePERatio, type PERatioResult } from './PERatioScoring';
import { scorePBRatio, type PBRatioResult } from './PBRatioScoring';
import { scoreEVEbitda, type EVEbitdaResult } from './EVEbitdaScoring';
import { scoreFCFYield, type FCFYieldResult } from './FCFYieldScoring';
import { scoreDividendYield, type DividendYieldResult } from './DividendYieldScoring';
import logger from '../../../../config/logger';

const MAX_PE = 25;
const MAX_PB = 25;
const MAX_EV = 20;
const MAX_FCF = 15;
const MAX_DIV = 15;

export class ValuationEngine {
  async analyze(metrics: ValuationMetrics): Promise<ValuationScore> {
    logger.info('=== Valuation Engine Analyzing ===');

    const peResult = scorePERatio(metrics.peRatio);
    const pbResult = scorePBRatio(metrics.pbRatio);
    const evResult = scoreEVEbitda(metrics.evEbitda);
    const fcfResult = scoreFCFYield(metrics.fcfYield);
    const divResult = scoreDividendYield(metrics.dividendYield);

    const overall = peResult.score + pbResult.score + evResult.score +
                    fcfResult.score + divResult.score;

    const dataCompleteness = this.computeDataCompleteness(metrics);
    const moduleAlignment = this.computeModuleAlignment(
      peResult.score, pbResult.score, evResult.score, fcfResult.score, divResult.score
    );
    const confidence = Math.min(0.99, dataCompleteness * 0.6 + moduleAlignment * 0.4);
    const reasoning = this.buildReasoning(overall, peResult, pbResult, evResult, fcfResult, divResult);

    logger.info(`Valuation Result: ${overall}/100, Confidence: ${(confidence * 100).toFixed(0)}%`);

    return {
      overall: Math.round(overall),
      peScore: peResult.score,
      pbScore: pbResult.score,
      evEbitdaScore: evResult.score,
      fcfYieldScore: fcfResult.score,
      dividendYieldScore: divResult.score,

      valuation: overall >= 75 ? 'undervalued' : overall >= 55 ? 'fair_value' :
                  overall >= 35 ? 'premium' : 'expensive',

      details: {
        pe: { score: peResult.score, ratio: peResult.peRatio, level: peResult.level },
        pb: { score: pbResult.score, ratio: pbResult.pbRatio, level: pbResult.level },
        evEbitda: { score: evResult.score, ratio: evResult.evEbitda, level: evResult.level },
        fcfYield: { score: fcfResult.score, yield: fcfResult.fcfYield, level: fcfResult.level },
        dividend: { score: divResult.score, yield: divResult.dividendYield, level: divResult.level },
      },

      dataCompleteness,
      confidence,
      reasoning,
      timestamp: new Date(),
    };
  }

  private computeDataCompleteness(metrics: ValuationMetrics): number {
    const fields = [metrics.peRatio, metrics.pbRatio, metrics.evEbitda, metrics.fcfYield, metrics.dividendYield];
    const available = fields.filter(f => f !== undefined && f !== null).length;
    return available / fields.length;
  }

  private computeModuleAlignment(pe: number, pb: number, ev: number, fcf: number, div: number): number {
    const components = [pe / MAX_PE, pb / MAX_PB, ev / MAX_EV, fcf / MAX_FCF, div / MAX_DIV];
    const mean = components.reduce((a, c) => a + c, 0) / components.length;
    const variance = components.reduce((a, c) => a + (c - mean) ** 2, 0) / components.length;
    return Math.max(0, 1 - Math.sqrt(variance));
  }

  private buildReasoning(
    overall: number,
    pe: PERatioResult,
    pb: PBRatioResult,
    ev: EVEbitdaResult,
    fcf: FCFYieldResult,
    div: DividendYieldResult,
  ): string {
    const parts: string[] = [];

    if (overall >= 75) parts.push('Attractive valuation across multiple metrics.');
    else if (overall >= 55) parts.push('Fairly valued overall with mixed signals.');
    else if (overall >= 35) parts.push('Premium pricing relative to fundamentals.');
    else parts.push('Stretched valuation. Premium multiples with limited earnings support.');

    const levels = [pe.level, pb.level, ev.level, fcf.level, div.level];
    const strengths = levels.filter(l => ['deep_value', 'attractive', 'below_book', 'fair_value', 'cheap', 'reasonable', 'excellent', 'good', 'healthy'].includes(l));
    const weaknesses = levels.filter(l => ['expensive', 'very_expensive', 'premium', 'distress', 'negative', 'unprofitable'].includes(l));

    if (strengths.length > 0) parts.push(`Strengths: ${strengths.length} positive valuation signals.`);
    if (weaknesses.length > 0) parts.push(`Weaknesses: ${weaknesses.length} concerning signals.`);

    return parts.join(' ');
  }
}

export const valuationEngine = new ValuationEngine();
