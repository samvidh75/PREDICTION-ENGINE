/**
 * Sector Intelligence Engine
 *
 * Aggregates 5 sub-modules into a 0-100 Sector Score.
 * HIGHER score = stronger position within sector + better sector environment.
 *
 * Modules:
 *   Relative Valuation (0-25): Stock multiples vs peer averages
 *   Relative Quality (0-20): ROE, margins vs peer median
 *   Relative Growth (0-15): Revenue/EPS growth vs sector
 *   Sector Momentum (0-20): Sector trend, flows, analyst sentiment
 *   Competitive Position (0-20): Market rank, brand, customer stickiness
 */
import type { SectorMetrics, SectorScore } from '../../types';
import { scoreRelativeValuation, type RelativeValuationResult } from './RelativeValuationScoring';
import { scoreRelativeQuality, type RelativeQualityResult } from './RelativeQualityScoring';
import { scoreRelativeGrowth, type RelativeGrowthResult } from './RelativeGrowthScoring';
import { scoreSectorMomentum, type SectorMomentumResult } from './SectorMomentumScoring';
import { scoreCompetitivePosition, type CompetitivePositionResult } from './CompetitivePositionScoring';
import logger from '../../../../config/logger';

const MAX_RV = 25;
const MAX_RQ = 20;
const MAX_RG = 15;
const MAX_SM = 20;
const MAX_CP = 20;

export class SectorEngine {
  async analyze(metrics: SectorMetrics): Promise<SectorScore> {
    logger.info('=== Sector Engine Analyzing ===');

    const rvResult = scoreRelativeValuation({
      stockPE: metrics.stockPE, stockPB: metrics.stockPB,
      stockEVEbitda: metrics.stockEVEbitda,
      peerPE: metrics.peerPE, peerPB: metrics.peerPB,
      peerEVEbitda: metrics.peerEVEbitda,
    });

    const rqResult = scoreRelativeQuality({
      stockROE: metrics.stockROE, stockNetMargin: metrics.stockNetMargin,
      peerROE: metrics.peerROE, peerNetMargin: metrics.peerNetMargin,
    });

    const rgResult = scoreRelativeGrowth({
      stockRevGrowth: metrics.stockRevGrowth, stockEPSGrowth: metrics.stockEPSGrowth,
      peerRevGrowth: metrics.peerRevGrowth, peerEPSGrowth: metrics.peerEPSGrowth,
    });

    const smResult = scoreSectorMomentum({
      sectorReturn1M: metrics.sectorReturn1M, sectorReturn3M: metrics.sectorReturn3M,
      relativeStrength: metrics.relativeStrength,
      analystUpgrades: metrics.analystUpgrades, analystDowngrades: metrics.analystDowngrades,
    });

    const cpResult = scoreCompetitivePosition({
      marketCapRank: metrics.marketCapRank, sectorPeerCount: metrics.sectorPeerCount,
      brandStrength: metrics.brandStrength, customerStickiness: metrics.customerStickiness,
    });

    const overall = rvResult.score + rqResult.score + rgResult.score +
                    smResult.score + cpResult.score;

    const dataCompleteness = this.computeDataCompleteness(metrics);
    const moduleAlignment = this.computeModuleAlignment(
      rvResult.score, rqResult.score, rgResult.score, smResult.score, cpResult.score
    );
    const confidence = Math.min(0.99, dataCompleteness * 0.6 + moduleAlignment * 0.4);
    const reasoning = this.buildReasoning(overall, rvResult, rqResult, rgResult, smResult, cpResult);

    logger.info(`Sector Result: ${overall}/100, Confidence: ${(confidence * 100).toFixed(0)}%`);

    return {
      overall: Math.round(overall),
      relativeValuationScore: rvResult.score,
      relativeQualityScore: rqResult.score,
      relativeGrowthScore: rgResult.score,
      sectorMomentumScore: smResult.score,
      competitivePositionScore: cpResult.score,

      peerRank: cpResult.marketCapRank ?? 0,
      relativeValuation: rvResult.level === 'deep_discount' || rvResult.level === 'discount'
        ? 'discount' : rvResult.level === 'unknown' ? 'fair'
        : rvResult.level === 'premium' || rvResult.level === 'expensive' ? 'premium' : 'fair',
      sectorMomentum: smResult.level === 'strong_uptrend' || smResult.level === 'uptrend'
        ? 'up' : smResult.level === 'downtrend' ? 'down' : 'neutral',
      competitivePosition: cpResult.level === 'market_leader' ? 'leader'
        : cpResult.level === 'top_tier' ? 'competitive' : 'weak',

      details: {
        relativeValuation: { score: rvResult.score, peVsPeer: rvResult.peVsPeer,
                             pbVsPeer: rvResult.pbVsPeer, level: rvResult.level },
        relativeQuality: { score: rqResult.score, roeVsPeer: rqResult.roeVsPeer,
                           marginVsPeer: rqResult.marginVsPeer, level: rqResult.level },
        relativeGrowth: { score: rgResult.score, revGrowthVsPeer: rgResult.revenueGrowthVsPeer,
                          epsGrowthVsPeer: rgResult.epsGrowthVsPeer, level: rgResult.level },
        sectorMomentum: { score: smResult.score, sectorTrend: smResult.sectorTrend,
                          level: smResult.level },
        competitivePosition: { score: cpResult.score, marketCapRank: cpResult.marketCapRank,
                               level: cpResult.level },
      },

      dataCompleteness,
      confidence,
      reasoning,
      timestamp: new Date(),
    };
  }

  private computeDataCompleteness(metrics: SectorMetrics): number {
    const fields = [
      metrics.stockPE, metrics.peerPE, metrics.stockPB, metrics.peerPB,
      metrics.stockROE, metrics.peerROE, metrics.sectorReturn1M,
      metrics.marketCapRank, metrics.sectorPeerCount, metrics.brandStrength,
    ];
    const available = fields.filter(f => f !== undefined && f !== null).length;
    return Math.min(1, available / Math.max(1, fields.length));
  }

  private computeModuleAlignment(rv: number, rq: number, rg: number, sm: number, cp: number): number {
    const components = [rv / MAX_RV, rq / MAX_RQ, rg / MAX_RG, sm / MAX_SM, cp / MAX_CP];
    const mean = components.reduce((a, c) => a + c, 0) / components.length;
    const variance = components.reduce((a, c) => a + (c - mean) ** 2, 0) / components.length;
    return Math.max(0, 1 - Math.sqrt(variance));
  }

  private buildReasoning(
    overall: number,
    rv: RelativeValuationResult,
    rq: RelativeQualityResult,
    rg: RelativeGrowthResult,
    sm: SectorMomentumResult,
    cp: CompetitivePositionResult,
  ): string {
    const parts: string[] = [];

    if (overall >= 70) parts.push('Strong sector positioning — attractive relative value with sector tailwinds.');
    else if (overall >= 50) parts.push('Moderate sector positioning with mixed relative signals.');
    else if (overall >= 30) parts.push('Weak sector positioning. Lagging peers or unfavorable sector environment.');
    else parts.push('Very weak sector positioning. Poor relative metrics and sector headwinds.');

    if (rv.level === 'deep_discount' || rv.level === 'discount') parts.push('Trading at a discount to peers.');
    else if (rv.level === 'expensive') parts.push('Significant premium to peer valuations.');

    if (rq.level === 'best_in_class' || rq.level === 'above_median') parts.push('Above-peer quality metrics.');
    if (cp.level === 'market_leader') parts.push('Market leader position.');

    return parts.join(' ');
  }
}

export const sectorEngine = new SectorEngine();
