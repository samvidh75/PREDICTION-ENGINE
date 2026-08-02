/**
 * Risk Intelligence Engine
 * 
 * Aggregates 5 sub-modules into a single 0-100 Risk Score.
 * HIGHER score = LOWER risk (safer stock).
 * 
 * Modules:
 *   Volatility Risk (0-25): σ, beta, 52-week range, max drawdown
 *   Financial Risk  (0-20): D/E, current ratio, interest coverage, cash reserves
 *   Business Risk   (0-20): customer concentration, revenue predictability, moat, execution
 *   Downside Risk   (0-20): -20% revenue scenario, Sharpe, VaR
 *   Tail Risk       (0-15): regulatory, litigation, obsolescence, disruption
 * 
 * Risk Profile thresholds:
 *   ≥75: low_risk   | 60-74: moderate | 45-59: elevated
 *   30-44: high     | <30:  dangerous
 */
import type { RiskMetrics, RiskScore } from '../../types';
import { scoreVolatilityRisk, type VolatilityRiskResult } from './VolatilityRiskScoring';
import { scoreFinancialRisk, type FinancialRiskResult } from './FinancialRiskScoring';
import { scoreBusinessRisk, type BusinessRiskResult } from './BusinessRiskScoring';
import { scoreDownsideRisk, type DownsideRiskResult } from './DownsideRiskScoring';
import { scoreTailRisk, type TailRiskResult } from './TailRiskScoring';
import logger from '../../../../config/logger';

const MAX_VOLATILITY = 25;
const MAX_FINANCIAL = 20;
const MAX_BUSINESS = 20;
const MAX_DOWNSIDE = 20;
const MAX_TAIL = 15;

export class RiskEngine {
  /**
   * Analyze risk metrics and return a RiskScore
   */
  analyze(metrics: RiskMetrics): RiskScore {
    const volatility = scoreVolatilityRisk(metrics);
    const financial = scoreFinancialRisk(metrics);
    const business = scoreBusinessRisk(metrics);
    const downside = scoreDownsideRisk(metrics);
    const tail = scoreTailRisk(metrics);

    const overall = volatility.points + financial.points + business.points +
                    downside.points + tail.points;

    const riskProfile = this.determineRiskProfile(overall);
    const dataCompleteness = this.computeDataCompleteness(metrics);
    const moduleAlignment = this.computeModuleAlignment(
      volatility.points, financial.points, business.points, downside.points, tail.points
    );
    const confidence = this.computeConfidence(dataCompleteness, moduleAlignment);
    const reasoning = this.buildReasoning(
      overall, riskProfile, volatility, financial, business, downside, tail, metrics
    );

    logger.info({
      symbol: metrics.symbol,
      overall,
      riskProfile,
      dataCompleteness,
      confidence,
      components: {
        volatility: volatility.points,
        financial: financial.points,
        business: business.points,
        downside: downside.points,
        tail: tail.points,
      },
    }, 'Risk Engine analysis complete');

    return {
      overall,
      riskProfile,

      volatilityScore: volatility.points,
      financialRiskScore: financial.points,
      businessRiskScore: business.points,
      downsideRiskScore: downside.points,
      tailRiskScore: tail.points,

      details: {
        volatility: {
          sigmaScore: volatility.sigmaScore,
          betaScore: volatility.betaScore,
          drawdownScore: volatility.drawdownScore,
          points: volatility.points,
        },
        financialRisk: {
          leverageScore: financial.leverageScore,
          liquidityScore: financial.liquidityScore,
          coverageScore: financial.coverageScore,
          cashScore: financial.cashScore,
          points: financial.points,
        },
        businessRisk: {
          concentrationScore: business.concentrationScore,
          predictabilityScore: business.predictabilityScore,
          moatScore: business.moatScore,
          executionScore: business.executionScore,
          points: business.points,
        },
        downsideRisk: {
          scenarioScore: downside.scenarioScore,
          sharpeScore: downside.sharpeScore,
          varScore: downside.varScore,
          points: downside.points,
        },
        tailRisk: {
          regulatoryScore: tail.regulatoryScore,
          litigationScore: tail.litigationScore,
          obsolescenceScore: tail.obsolescenceScore,
          disruptionScore: tail.disruptionScore,
          points: tail.points,
        },
      },

      dataCompleteness,
      confidence,
      reasoning,
      timestamp: new Date(),
    };
  }

  // ---- Risk Profile ----
  private determineRiskProfile(overall: number): RiskScore['riskProfile'] {
    if (overall >= 75) return 'low_risk';
    if (overall >= 60) return 'moderate';
    if (overall >= 45) return 'elevated';
    if (overall >= 30) return 'high';
    return 'dangerous';
  }

  // ---- Data Completeness ----
  private computeDataCompleteness(metrics: RiskMetrics): number {
    const fields = [
      metrics.volatility, metrics.beta, metrics.maxDrawdown, metrics.weeklyRange,
      metrics.debtToEquity, metrics.currentRatio, metrics.interestCoverage, metrics.cashReserves,
      metrics.customerConcentration, metrics.revenuePredictability,
      metrics.competitiveMoat, metrics.executionRisk,
      metrics.profitabilityAtMinus20Revenue, metrics.sharpeRatio, metrics.valueAtRisk,
      metrics.regulatoryRisk, metrics.litigationRisk,
      metrics.obsolescenceRisk, metrics.disruptionRisk,
    ];
    const available = fields.filter(f => f !== undefined).length;
    return available / fields.length;
  }

  // ---- Module Alignment ----
  private computeModuleAlignment(
    v: number, f: number, b: number, d: number, t: number,
  ): number {
    const components = [
      v / MAX_VOLATILITY,
      f / MAX_FINANCIAL,
      b / MAX_BUSINESS,
      d / MAX_DOWNSIDE,
      t / MAX_TAIL,
    ];
    const mean = components.reduce((a, c) => a + c, 0) / components.length;
    const variance = components.reduce((a, c) => a + (c - mean) ** 2, 0) / components.length;
    // High alignment = low variance across modules
    return Math.max(0, 1 - Math.sqrt(variance));
  }

  // ---- Confidence ----
  private computeConfidence(dataCompleteness: number, moduleAlignment: number): number {
    return Math.min(0.99, dataCompleteness * 0.6 + moduleAlignment * 0.4);
  }

  // ---- Reasoning ----
  private buildReasoning(
    overall: number,
    riskProfile: string,
    v: VolatilityRiskResult,
    f: FinancialRiskResult,
    b: BusinessRiskResult,
    d: DownsideRiskResult,
    t: TailRiskResult,
    metrics: RiskMetrics,
  ): string {
    const parts: string[] = [];

    parts.push(`Overall Risk Score: ${Math.round(overall)}/100 — ${riskProfile.replace(/_/g, ' ')}.`);

    // Identify strongest area (most points earned = safest)
    const scores: { name: string; pts: number; max: number }[] = [
      { name: 'volatility', pts: v.points || 0, max: MAX_VOLATILITY },
      { name: 'financial', pts: f.points || 0, max: MAX_FINANCIAL },
      { name: 'business', pts: b.points || 0, max: MAX_BUSINESS },
      { name: 'downside', pts: d.points || 0, max: MAX_DOWNSIDE },
      { name: 'tail', pts: t.points || 0, max: MAX_TAIL },
    ];

    scores.sort((a, b) => (b.pts / b.max) - (a.pts / a.max));
    const [best, , , , worst] = scores;

    if (best.pts > 0) {
      parts.push(`Strongest area: ${best.name} risk (${best.pts}/${best.max} pts).`);
    }
    if (worst.pts < worst.max * 0.4) {
      parts.push(`Weakest area: ${worst.name} risk (${worst.pts}/${worst.max} pts) — needs attention.`);
    }

    // Key risk metrics snapshot
    if (metrics.volatility !== undefined) {
      parts.push(`σ=${metrics.volatility.toFixed(1)}%`);
    }
    if (metrics.debtToEquity !== undefined) {
      parts.push(`D/E=${metrics.debtToEquity.toFixed(2)}`);
    }
    if (metrics.maxDrawdown !== undefined) {
      parts.push(`Max DD=${metrics.maxDrawdown.toFixed(1)}%`);
    }

    return parts.join(' ');
  }
}

export const riskEngine = new RiskEngine();
