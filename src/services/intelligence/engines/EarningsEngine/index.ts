/**
 * Earnings Engine — Unified Earnings Intelligence Aggregator
 *
 * 5 scoring modules:
 *   Consistency (0-25): 5Y CAGR, volatility, trend
 *   Forward (0-20):     Guided growth, PEG ratio
 *   Beat (0-20):        Beat/miss streaks, surprise magnitude
 *   Quality (0-20):     Rev vs EPS quality, one-time items, FCF
 *   Guidance (0-15):    Historical guidance accuracy
 *
 * Total: 0-100
 */
import {
  EarningsMetrics,
  EarningsScore,
} from '../../types';
import { ConsistencyScoring } from './ConsistencyScoring';
import { ForwardScoring } from './ForwardScoring';
import { BeatScoring } from './BeatScoring';
import { QualityScoring } from './QualityScoring';
import logger from '../../../../config/logger';

export class EarningsEngine {
  private consistency: ConsistencyScoring;
  private forward: ForwardScoring;
  private beat: BeatScoring;
  private quality: QualityScoring;

  constructor() {
    this.consistency = new ConsistencyScoring();
    this.forward = new ForwardScoring();
    this.beat = new BeatScoring();
    this.quality = new QualityScoring();
  }

  async analyze(metrics: EarningsMetrics): Promise<EarningsScore> {
    logger.info(`=== Earnings Engine Analyzing ===`);
    logger.info(`FY${metrics.fiscalYear}, ${metrics.history.length} periods`);

    // ===== SCORE ALL MODULES =====
    const consistencyResult = this.consistency.analyze(metrics.history);
    const forwardResult = this.forward.analyze({
      currentGuidance: metrics.currentGuidance,
      peg: metrics.peg,
      forwardPE: metrics.forwardPE,
    });
    const beatResult = this.beat.analyze(metrics.history);
    const qualityResult = this.quality.analyze({
      history: metrics.history,
      oneTimeItems: metrics.oneTimeItems,
      fcfMargin: metrics.fcfMargin,
    });

    // ===== GUIDANCE ACCURACY SCORE (0-15 pts) =====
    let guidanceScore = 10; // Default when no history available
    const guidanceAccuracy = metrics.history.length > 0
      ? (metrics.history.filter(h => h.guidanceHit).length / metrics.history.length) * 100
      : 0;

    if (metrics.history.length > 0) {
      if (guidanceAccuracy >= 80) {
        guidanceScore = 15;
      } else if (guidanceAccuracy >= 60) {
        guidanceScore = 12;
      } else if (guidanceAccuracy >= 40) {
        guidanceScore = 8;
      } else {
        guidanceScore = 3;
      }
    }

    // ===== AGGREGATE =====
    const totalRaw =
      consistencyResult.score +    // 0-25
      forwardResult.score +        // 0-20
      beatResult.score +           // 0-20
      qualityResult.score +        // 0-20
      guidanceScore;               // 0-15

    const overall = Math.min(100, Math.round(
      totalRaw *
      (0.85 + 0.15 * Math.min(1, metrics.history.length / 8))
    ));

    // ===== DATA COMPLETENESS =====
    const dataCompleteness = Math.min(
      1,
      (metrics.history.length / 8) * 0.7 + 0.3
    );
    const confidence = Math.min(0.99, dataCompleteness * 0.8 + 0.2);

    // ===== REASONING =====
    const reasoningParts: string[] = [];
    reasoningParts.push(
      `Earnings Overall: ${overall}/100 — ${overall >= 80 ? 'very strong' : overall >= 60 ? 'solid' : overall >= 40 ? 'moderate' : 'weak'}`
    );
    reasoningParts.push(
      `${metrics.history.length} quarters, ${consistencyResult.epsGrowthTrend} trend`
    );
    reasoningParts.push(
      `${beatResult.beatStreak}Q beat streak`
    );

    logger.info(
      `Earnings Result: ${overall}/100 (C:${consistencyResult.score} F:${forwardResult.score} B:${beatResult.score} Q:${qualityResult.score} G:${guidanceScore})`
    );

    return {
      overall,
      consistencyScore: consistencyResult.score,
      forwardScore: forwardResult.score,
      beatScore: beatResult.score,
      qualityScore: qualityResult.score,
      guidanceScore,
      epsGrowth5Y: consistencyResult.epsGrowth5Y,
      epsGrowthTrend: consistencyResult.epsGrowthTrend,
      beatStreak: beatResult.beatStreak,
      missStreak: beatResult.missStreak,
      earningsQuality: qualityResult.earningsQuality,
      revenueQuality: qualityResult.revenueQuality,
      details: {
        recent8Quarters: metrics.history.slice(-8),
        avgSurprise: beatResult.avgSurprise,
        volatility: consistencyResult.volatility,
        guidanceAccuracy,
      },
      dataCompleteness,
      confidence,
      reasoning: reasoningParts.join('; '),
      timestamp: new Date(),
    };
  }
}

export const earningsEngine = new EarningsEngine();
