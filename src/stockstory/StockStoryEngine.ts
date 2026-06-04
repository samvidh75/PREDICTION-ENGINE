/**
 * StockStory Engine — Orchestrator
 * 
 * Runs all 7 engines + AccountingEngine and produces the final output contract.
 * 
 * FIX (RC-ENGINE-002): Stronger risk dampening (continuous, no hard threshold).
 * FIX (RC-ENGINE-002): Advisory language removed — all narrative is descriptive.
 * FIX (RC-ENGINE-002): AccountingEngine integrated for earnings quality signal.
 */

import {
  EngineInputs,
  StockStoryOutput,
  CompanyClassification,
  ConfidenceLevel,
  clampScore,
  weightedAverage,
} from './types';
import { getSectorProfile } from './SectorAdapter';
import { growthEngine } from './engines/GrowthEngine';
import { qualityEngine } from './engines/QualityEngine';
import { stabilityEngine } from './engines/StabilityEngine';
import { momentumEngine } from './engines/MomentumEngine';
import { valuationEngine } from './engines/ValuationEngine';
import { riskEngine } from './engines/RiskEngine';
import { confidenceEngine } from './engines/ConfidenceEngine';
import { accountingEngine } from './engines/AccountingEngine';

export class StockStoryEngine {
  evaluate(inputs: EngineInputs): StockStoryOutput {
    // ── Run all engines ─────────────────────────────────────────────
    const growth = growthEngine.evaluate(inputs);
    const quality = qualityEngine.evaluate(inputs);
    const stability = stabilityEngine.evaluate(inputs);
    const momentum = momentumEngine.evaluate(inputs);
    const valuation = valuationEngine.evaluate(inputs);
    const risk = riskEngine.evaluate(inputs);
    const accounting = accountingEngine.evaluate(inputs);

    // ── Compute Health Score (weighted) ─────────────────────────────
    const healthScore = weightedAverage([
      { score: growth.score, weight: 25 },
      { score: quality.score, weight: 25 },
      { score: stability.score, weight: 20 },
      { score: momentum.score, weight: 15 },
      { score: valuation.score, weight: 15 },
    ]);

    // ── Continuous risk dampening ───────────────────────────────────
    // riskDampening = proportional penalty starting at riskScore > 40
    const riskDampening = Math.max(0, (risk.score - 40) * 0.35);
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
      accounting.score,
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

  private classify(
    healthScore: number,
    riskScore: number
  ): CompanyClassification {
    const riskAdjusted = healthScore - Math.max(0, (riskScore - 40) * 0.35);

    if (riskAdjusted >= 80) return 'Excellent';
    if (riskAdjusted >= 65) return 'Healthy';
    if (riskAdjusted >= 45) return 'Stable';
    if (riskAdjusted >= 30) return 'Weakening';
    return 'At Risk';
  }

  private assessFreshness(
    inputs: EngineInputs
  ): StockStoryOutput['dataFreshness'] {
    const tradeDate = new Date(inputs.tradeDate);
    const now = new Date();
    const daysSince =
      (now.getTime() - tradeDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSince <= 1) return 'Live';
    if (daysSince <= 7) return 'Recent';
    if (daysSince <= 30) return 'Stale';
    return 'Unavailable';
  }

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
    accountingQuality: number,
    inputs: EngineInputs
  ): string {
    const symbol = inputs.symbol;
    const profile = getSectorProfile(inputs.sector?.name ?? 'General');
    const parts: string[] = [];

    // ── Descriptive observation (not recommendation) ────────────────
    if (classification === 'Excellent') {
      parts.push(
        `${symbol} registers excellent composite health across measured dimensions relative to ${profile.name} sector benchmarks.`
      );
    } else if (classification === 'Healthy') {
      parts.push(
        `${symbol} presents a healthy profile with balanced fundamentals and contained risk levels.`
      );
    } else if (classification === 'Stable') {
      parts.push(
        `${symbol} maintains a stable position with mixed signals across key metrics.`
      );
    } else if (classification === 'Weakening') {
      parts.push(
        `${symbol} shows declining momentum across several dimensions relative to historical norms.`
      );
    } else {
      parts.push(
        `${symbol} registers elevated risk indicators and below-average composite health.`
      );
    }

    // ── Strength callout ────────────────────────────────────────────
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
      parts.push(
        `${topName} (${topScore}/100) is the strongest-performing dimension.`
      );
    }

    // ── Weakness callout ────────────────────────────────────────────
    const [bottomName, bottomScore] = scores[scores.length - 1];
    if (bottomScore < 40) {
      parts.push(
        `${bottomName} (${bottomScore}/100) is the weakest dimension and may merit closer review.`
      );
    }

    // ── Risk context ────────────────────────────────────────────────
    if (risk > 65) {
      parts.push(
        `Risk indicators are elevated (${risk}/100), reflecting above-average volatility or cash flow stress.`
      );
    } else if (risk < 35) {
      parts.push(
        `Risk metrics are contained (${risk}/100), indicating lower-than-average stress signals.`
      );
    }

    // ── Accounting quality context ──────────────────────────────────
    if (accountingQuality < 40) {
      parts.push(
        `Accounting quality signals (${accountingQuality}/100) suggest earnings may not be fully backed by operating cash flows.`
      );
    }

    // ── Confidence context ──────────────────────────────────────────
    if (confidence === 'Very High') {
      parts.push(`Confidence in this assessment is very high.`);
    } else if (confidence === 'High') {
      parts.push(`Confidence is high.`);
    } else if (confidence === 'Medium') {
      parts.push(`Confidence is moderate — some data gaps or signal divergence exist.`);
    } else {
      parts.push(`Confidence is low — this assessment should be treated as directional.`);
    }

    // ── Descriptive closing (no recommendations) ────────────────────
    if (classification === 'Excellent' || classification === 'Healthy') {
      parts.push(
        `The company's profile aligns with above-average quality and stability characteristics within the ${profile.name} sector.`
      );
    } else if (classification === 'Stable') {
      parts.push(
        `The composite profile suggests a holding pattern with no clear directional catalyst.`
      );
    } else {
      parts.push(
        `The composite profile indicates below-average metrics that warrant careful evaluation against investment criteria.`
      );
    }

    return parts.join(' ');
  }
}

export const stockStoryEngine = new StockStoryEngine();
export default stockStoryEngine;
