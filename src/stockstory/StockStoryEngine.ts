/**
 * StockStory Engine — Orchestrator
 * 
 * Runs all 7 engines in sequence and produces the final output contract.
 * 
 * Engine weights for Health Score:
 * - Growth:     25%
 * - Quality:    25%
 * - Stability:  20%
 * - Momentum:   15%
 * - Valuation:  15%
 * 
 * Risk and Confidence are meta-engines — they don't directly weight into 
 * the Health Score but inform the classification and confidence level.
 */

import {
  EngineInputs,
  StockStoryOutput,
  CompanyClassification,
  ConfidenceLevel,
  clampScore,
  weightedAverage,
} from './types';
import { growthEngine } from './engines/GrowthEngine';
import { qualityEngine } from './engines/QualityEngine';
import { stabilityEngine } from './engines/StabilityEngine';
import { momentumEngine } from './engines/MomentumEngine';
import { valuationEngine } from './engines/ValuationEngine';
import { riskEngine } from './engines/RiskEngine';
import { confidenceEngine } from './engines/ConfidenceEngine';

export class StockStoryEngine {
  /**
   * Evaluate a single company through all 7 engines.
   */
  evaluate(inputs: EngineInputs): StockStoryOutput {
    // ── Run all engines ─────────────────────────────────────────────
    const growth = growthEngine.evaluate(inputs);
    const quality = qualityEngine.evaluate(inputs);
    const stability = stabilityEngine.evaluate(inputs);
    const momentum = momentumEngine.evaluate(inputs);
    const valuation = valuationEngine.evaluate(inputs);
    const risk = riskEngine.evaluate(inputs);

    // ── Compute Health Score (weighted) ─────────────────────────────
    const healthScore = weightedAverage([
      { score: growth.score, weight: 25 },
      { score: quality.score, weight: 25 },
      { score: stability.score, weight: 20 },
      { score: momentum.score, weight: 15 },
      { score: valuation.score, weight: 15 },
    ]);

    // Risk dampens health score — high risk reduces effective health
    const riskDampening = (risk.score - 50) * 0.15; // up to ±7.5 adjustment
    const adjustedHealth = clampScore(healthScore - riskDampening);

    // ── Classification ──────────────────────────────────────────────
    const classification = this.classify(adjustedHealth, risk.score);

    // ── Confidence ──────────────────────────────────────────────────
    const confidence = confidenceEngine.evaluate(inputs, {
      growth: growth.score,
      quality: quality.score,
      stability: stability.score,
      momentum: momentum.score,
      valuation: valuation.score,
      risk: risk.score,
    });

    // ── Data Freshness ──────────────────────────────────────────────
    const dataFreshness = this.assessFreshness(inputs);

    // ── Narrative ───────────────────────────────────────────────────
    const narrative = this.generateNarrative(
      adjustedHealth,
      classification,
      confidence.level,
      growth.score,
      quality.score,
      stability.score,
      valuation.score,
      momentum.score,
      risk.score,
      inputs
    );

    return {
      healthScore: adjustedHealth,
      classification,
      confidence: confidence.level,
      growth: growth.score,
      quality: quality.score,
      stability: stability.score,
      valuation: valuation.score,
      momentum: momentum.score,
      risk: risk.score,
      narrative,
      engineDetails: {
        growth,
        quality,
        stability,
        momentum,
        valuation,
        risk,
        confidence,
      },
      generatedAt: new Date().toISOString(),
      dataFreshness,
    };
  }

  /**
   * Map health score + risk to classification.
   */
  private classify(healthScore: number, riskScore: number): CompanyClassification {
    // Risk-adjusted: if risk is very high, classification degrades
    const riskAdjusted = healthScore - Math.max(0, (riskScore - 60) * 0.5);

    if (riskAdjusted >= 80) return 'Excellent';
    if (riskAdjusted >= 65) return 'Healthy';
    if (riskAdjusted >= 45) return 'Stable';
    if (riskAdjusted >= 30) return 'Weakening';
    return 'At Risk';
  }

  /**
   * Assess how fresh the underlying data is.
   */
  private assessFreshness(inputs: EngineInputs): StockStoryOutput['dataFreshness'] {
    const tradeDate = new Date(inputs.tradeDate);
    const now = new Date();
    const daysSince = (now.getTime() - tradeDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSince <= 1) return 'Live';
    if (daysSince <= 7) return 'Recent';
    if (daysSince <= 30) return 'Stale';
    return 'Unavailable';
  }

  /**
   * Generate a human-readable narrative summary.
   */
  private generateNarrative(
    healthScore: number,
    classification: CompanyClassification,
    confidence: ConfidenceLevel,
    growth: number,
    quality: number,
    stability: number,
    valuation: number,
    momentum: number,
    risk: number,
    inputs: EngineInputs
  ): string {
    const symbol = inputs.symbol;
    const parts: string[] = [];

    // Opening: classification statement
    if (classification === 'Excellent') {
      parts.push(`${symbol} demonstrates excellent overall health across all measured dimensions.`);
    } else if (classification === 'Healthy') {
      parts.push(`${symbol} shows a healthy profile with balanced fundamentals and manageable risk.`);
    } else if (classification === 'Stable') {
      parts.push(`${symbol} maintains a stable position with mixed signals across key metrics.`);
    } else if (classification === 'Weakening') {
      parts.push(`${symbol} shows signs of weakening across critical dimensions.`);
    } else {
      parts.push(`${symbol} is flagged as at-risk with concerning indicators.`);
    }

    // Strength callout: highest scoring dimension
    const scores: Array<[string, number]> = [
      ['Growth', growth],
      ['Quality', quality],
      ['Stability', stability],
      ['Momentum', momentum],
      ['Valuation', valuation],
    ];
    scores.sort((a, b) => b[1] - a[1]);
    const [topName, topScore] = scores[0];

    if (topScore >= 70) {
      parts.push(`${topName} (${topScore}/100) is a standout strength.`);
    }

    // Weakness callout: lowest scoring dimension
    const [bottomName, bottomScore] = scores[scores.length - 1];
    if (bottomScore < 40) {
      parts.push(`${bottomName} (${bottomScore}/100) is a notable weakness that warrants attention.`);
    }

    // Risk statement
    if (risk > 60) {
      parts.push(`Risk indicators are elevated (${risk}/100), suggesting cautious position sizing.`);
    } else if (risk < 35) {
      parts.push(`Risk metrics are well-contained (${risk}/100), supporting conviction.`);
    }

    // Confidence level
    if (confidence === 'Very High' || confidence === 'High') {
      parts.push(`Overall confidence in this assessment is ${confidence.toLowerCase()}.`);
    } else if (confidence === 'Medium') {
      parts.push(`Confidence is moderate — some data gaps or signal divergence exist.`);
    } else {
      parts.push(`Confidence is low — use this assessment directionally with additional research.`);
    }

    // Closing
    if (classification === 'Excellent' || classification === 'Healthy') {
      parts.push('The company presents a compelling case for inclusion in quality-focused portfolios.');
    } else if (classification === 'Stable') {
      parts.push('A wait-and-watch approach may be appropriate until clearer directional signals emerge.');
    } else {
      parts.push('Careful due diligence is advised before committing capital.');
    }

    return parts.join(' ');
  }
}

// ── Singleton ──────────────────────────────────────────────────────

export const stockStoryEngine = new StockStoryEngine();
export default stockStoryEngine;
