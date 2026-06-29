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
   * 4. Score bonus: ROA (0-5), dividend yield (0-5), market cap (0-5)
   * 5. Aggregate: (quality + growth + debt + bonuses) / 85 * 100 = 0-100
   * 6. Calculate confidence based on data completeness
   * 7. Generate reasoning
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

    const roaResult = this.scoreRoa(metrics.roa);
    const dividendResult = this.scoreDividendYield(metrics.dividendYield);
    const marketCapResult = this.scoreMarketCap(metrics.marketCap);

    const MAX_BASE = 70;    // quality(35) + growth(25) + debt(10)
    const MAX_BONUS = 15;   // roa(5) + dividend(5) + marketCap(5)
    const MAX_TOTAL = MAX_BASE + MAX_BONUS;

    const totalRawScore =
      qualityResult.score +
      growthResult.score +
      debtResult.score +
      roaResult.score +
      dividendResult.score +
      marketCapResult.score;

    const normalizedScore = (totalRawScore / MAX_TOTAL) * 100;

    logger.info(
      `Raw Score: ${totalRawScore}/${MAX_TOTAL} → Normalized: ${normalizedScore.toFixed(1)}/100`
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
      normalizedScore,
      roaResult,
      dividendResult,
      marketCapResult
    );

    const result: FinancialScore = {
      overall: Math.round(normalizedScore),
      qualityScore: qualityResult.score,
      growthScore: growthResult.score,
      debtScore: debtResult.score,

      details: {
        quality: {
          roeScore: qualityResult.roeScore,
          roaScore: roaResult.score,
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
        roa: roaResult.score > 0 ? roaResult : undefined,
        dividend: dividendResult.score > 0 ? dividendResult : undefined,
        marketCap: marketCapResult.score > 0 ? marketCapResult : undefined,
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
   * Score Return on Assets (0-5 pts)
   * High ROA = efficient asset utilization, strong management
   */
  private scoreRoa(roa?: number): { score: number; value?: number; level: string } {
    if (roa === undefined || roa === null) {
      return { score: 0, level: 'unavailable' };
    }

    let score: number;
    let level: string;

    if (roa >= 25) {
      score = 5; level = 'exceptional';
    } else if (roa >= 20) {
      score = 4; level = 'excellent';
    } else if (roa >= 15) {
      score = 3; level = 'good';
    } else if (roa >= 10) {
      score = 2; level = 'fair';
    } else if (roa >= 5) {
      score = 1; level = 'weak';
    } else {
      score = 0; level = 'poor';
    }

    logger.info(`ROA Score: ${score}/5 (${level})`);

    return { score, value: roa, level };
  }

  /**
   * Score Dividend Yield (0-5 pts)
   * Rewards sustainable dividends (2-5%), penalizes yield traps
   */
  private scoreDividendYield(divYield?: number | null): { score: number; yield?: number; level: string } {
    if (divYield === undefined || divYield === null) {
      return { score: 0, level: 'unavailable' };
    }

    let score: number;
    let level: string;

    if (divYield >= 0.05) {
      score = 5; level = 'strong';
    } else if (divYield >= 0.04) {
      score = 4; level = 'solid';
    } else if (divYield >= 0.02) {
      score = 3; level = 'decent';
    } else if (divYield >= 0.01) {
      score = 2; level = 'modest';
    } else if (divYield > 0) {
      score = 1; level = 'minimal';
    } else {
      score = 0; level = 'none';
    }

    logger.info(`Dividend Yield Score: ${score}/5 (${level})`);

    return { score, yield: divYield, level };
  }

  /**
   * Score Market Cap (0-5 pts)
   * Larger market caps = more stability, lower risk premium
   */
  private scoreMarketCap(marketCap?: number): { score: number; cap?: number; level: string } {
    if (marketCap === undefined || marketCap === null) {
      return { score: 0, level: 'unavailable' };
    }

    let score: number;
    let level: string;

    if (marketCap >= 500000) {
      score = 5; level = 'mega_cap';
    } else if (marketCap >= 100000) {
      score = 4; level = 'large_cap';
    } else if (marketCap >= 10000) {
      score = 3; level = 'mid_cap';
    } else if (marketCap >= 1000) {
      score = 2; level = 'small_cap';
    } else if (marketCap >= 100) {
      score = 1; level = 'micro_cap';
    } else {
      score = 0; level = 'nano_cap';
    }

    logger.info(`Market Cap Score: ${score}/5 (${level})`);

    return { score, cap: marketCap, level };
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
    score: number,
    roa?: { score: number; level: string },
    dividend?: { score: number; level: string },
    marketCap?: { score: number; level: string }
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

    if (roa && roa.score > 0) {
      if (roa.score >= 4) {
        parts.push('strong asset efficiency');
      } else if (roa.score >= 2) {
        parts.push('adequate asset efficiency');
      }
    }

    if (dividend && dividend.score > 0) {
      parts.push(`${dividend.level} dividend`);
    }

    if (marketCap && marketCap.score > 0) {
      parts.push(`${marketCap.level.replace('_', ' ')} stability`);
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
