import { FinancialMetrics, FinancialScore } from '../../types';
import { QualityScoring } from './QualityScoring';
import { GrowthScoring } from './GrowthScoring';
import { DebtScoring } from './DebtScoring';
import logger from '../../../../config/logger';

export class FinancialEngine {
  private quality: QualityScoring;
  private growth: GrowthScoring;
  private debt: DebtScoring;

  constructor() {
    this.quality = new QualityScoring();
    this.growth = new GrowthScoring();
    this.debt = new DebtScoring();
  }

  /**
   * Analyze financial metrics and produce unified score
   *
   * Process:
   * 1. Score quality (0-35 pts)
   * 2. Score growth (0-25 pts)
   * 3. Score debt (0-10 pts)
   * 4. Aggregate: (quality + growth + debt) / 70 * 100 = 0-100
   * 5. Calculate confidence based on data completeness
   * 6. Generate reasoning
   */
  async analyze(metrics: FinancialMetrics): Promise<FinancialScore> {
    logger.info(`=== Financial Engine Analyzing ===`);
    logger.info(`Symbol: ${metrics.fiscalYear}`);

    const qualityResult = this.quality.analyze({
      roe: metrics.roe,
      operatingMargin: metrics.operatingMargin,
      netMargin: metrics.netMargin,
    });

    const growthResult = this.growth.analyze({
      revenueGrowth: metrics.revenueGrowth,
      epsGrowth: metrics.epsGrowth,
    });

    const debtResult = this.debt.analyze({
      debtToEquity: metrics.debtToEquity,
      interestCoverage: metrics.interestCoverage,
    });

    const totalRawScore =
      qualityResult.score +
      growthResult.score +
      debtResult.score;

    const normalizedScore = (totalRawScore / 70) * 100;

    logger.info(
      `Raw Score: ${totalRawScore}/70 → Normalized: ${normalizedScore.toFixed(1)}/100`
    );

    const criticalFields = [
      metrics.roe,
      metrics.operatingMargin,
      metrics.netMargin,
      metrics.revenueGrowth,
      metrics.epsGrowth,
      metrics.debtToEquity,
      metrics.interestCoverage,
    ];

    const fieldsWithData = criticalFields.filter(f => f !== undefined && f !== null).length;
    const dataCompleteness = fieldsWithData / 7;

    logger.info(`Data Completeness: ${fieldsWithData}/7 fields (${(dataCompleteness * 100).toFixed(0)}%)`);

    const moduleAlignment = this.calculateModuleAlignment(
      qualityResult.score,
      growthResult.score,
      debtResult.score
    );

    const confidence = Math.min(
      0.99,
      dataCompleteness * 0.6 + moduleAlignment * 0.4
    );

    logger.info(`Module Alignment: ${(moduleAlignment * 100).toFixed(0)}%`);
    logger.info(`Confidence: ${(confidence * 100).toFixed(0)}%`);

    const reasoning = this.generateReasoning(
      qualityResult,
      growthResult,
      debtResult,
      normalizedScore
    );

    const result: FinancialScore = {
      overall: Math.round(normalizedScore),
      qualityScore: qualityResult.score,
      growthScore: growthResult.score,
      debtScore: debtResult.score,

      details: {
        quality: {
          roeScore: qualityResult.roeScore,
          roaScore: metrics.roa ?? 0,
          marginScore: qualityResult.operatingMarginScore + qualityResult.netMarginScore,
          points: qualityResult.score,
        },
        growth: {
          revenueScore: growthResult.revenueScore,
          epsScore: growthResult.epsScore,
          points: growthResult.score,
        },
        debt: {
          leverageScore: debtResult.score,
          coverageScore: metrics.interestCoverage ?? 0,
          points: debtResult.score,
        },
      },

      dataCompleteness,
      confidence,
      reasoning,
      timestamp: new Date(),
    };

    logger.info(`=== Financial Engine Complete ===`);
    logger.info(`Final Score: ${result.overall}/100`);
    logger.info(`Confidence: ${(result.confidence * 100).toFixed(0)}%`);

    return result;
  }

  /**
   * Check if all three modules agree on business quality level
   * Low variance = high alignment = high confidence in result
   */
  private calculateModuleAlignment(
    qualityScore: number,
    growthScore: number,
    debtScore: number
  ): number {
    const qNorm = qualityScore / 35;
    const gNorm = growthScore / 25;
    const dNorm = debtScore / 10;

    const variance = Math.abs(qNorm - gNorm) + Math.abs(gNorm - dNorm) + Math.abs(dNorm - qNorm);

    const alignment = Math.max(0, 1 - variance / 3);

    return alignment;
  }

  /**
   * Generate plain-English explanation of score
   */
  private generateReasoning(
    quality: ReturnType<QualityScoring['analyze']>,
    growth: ReturnType<GrowthScoring['analyze']>,
    debt: ReturnType<DebtScoring['analyze']>,
    score: number
  ): string {
    const parts: string[] = [];

    if (quality.score >= 32) {
      parts.push('exceptional profitability');
    } else if (quality.score >= 25) {
      parts.push('excellent profitability');
    } else if (quality.score >= 18) {
      parts.push('good profitability');
    } else if (quality.score >= 10) {
      parts.push('acceptable profitability');
    } else {
      parts.push('weak profitability');
    }

    if (growth.score >= 23) {
      parts.push('strong earnings growth');
    } else if (growth.score >= 18) {
      parts.push('healthy growth');
    } else if (growth.score >= 12) {
      parts.push('moderate growth');
    } else if (growth.score >= 5) {
      parts.push('slow growth');
    } else {
      parts.push('declining growth');
    }

    if (debt.score === 10) {
      parts.push('fortress balance sheet');
    } else if (debt.score >= 7) {
      parts.push('healthy balance sheet');
    } else if (debt.score >= 5) {
      parts.push('moderate leverage');
    } else {
      parts.push('high financial risk');
    }

    let overall = '';
    if (score >= 80) {
      overall = 'Fundamentals are excellent.';
    } else if (score >= 65) {
      overall = 'Fundamentals are strong.';
    } else if (score >= 50) {
      overall = 'Fundamentals are reasonable.';
    } else if (score >= 35) {
      overall = 'Fundamentals are weak.';
    } else {
      overall = 'Fundamentals are concerning.';
    }

    return `${parts.join(', ')}. ${overall}`;
  }
}

export const financialEngine = new FinancialEngine();
