/**
 * StockStory Engine — Orchestrator (RC-ENGINE-003)
 * 
 * Integrates:
 * - SectorWeightEngine for sector-aware factor weighting
 * - Penalty Framework (Accounting, Debt, Volatility, Governance)
 * - Configurable Weights
 * - Confidence Engine (independent from health score)
 * - Standardised Scoring (0-100, banded)
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
import { computeSectorWeightedHealth } from './sectors/SectorWeightEngine';
import { growthEngine } from './engines/GrowthEngine';
import { qualityEngine } from './engines/QualityEngine';
import { stabilityEngine } from './engines/StabilityEngine';
import { momentumEngine } from './engines/MomentumEngine';
import { valuationEngine } from './engines/ValuationEngine';
import { riskEngine } from './engines/RiskEngine';
import { confidenceEngine } from './engines/ConfidenceEngine';
import { accountingEngine } from './engines/AccountingEngine';
import { evaluateAccountingPenalty } from './risk/AccountingPenalty';
import { evaluateDebtPenalty } from './risk/DebtPenalty';
import { evaluateVolatilityPenalty } from './risk/VolatilityPenalty';
import { evaluateGovernancePenalty } from './risk/GovernancePenalty';
import { applyPenalties, type Penalty } from './scoring/PenaltyScorer';
import { SectorDistributionEngine } from './analytics/SectorDistributionEngine';

// ── Auto-initialise percentile distributions on module load ──────
let _percentileReady = false;
function ensurePercentileData(): void {
  if (!_percentileReady) {
    SectorDistributionEngine.initialise();
    _percentileReady = true;
  }
}

export class StockStoryEngine {
  constructor() {
    ensurePercentileData();
  }
  public riskDampeningCoefficient: number = 0.45;

  evaluate(inputs: EngineInputs): StockStoryOutput {
    // ── Run all engines ─────────────────────────────────────────────
    const growth = growthEngine.evaluate(inputs);
    const quality = qualityEngine.evaluate(inputs);
    const stability = stabilityEngine.evaluate(inputs);
    const momentum = momentumEngine.evaluate(inputs);
    const valuation = valuationEngine.evaluate(inputs);
    const risk = riskEngine.evaluate(inputs);
    const accounting = accountingEngine.evaluate(inputs);

    // ── Sector-weighted health score ────────────────────────────────
    const sectorName = inputs.sector?.name ?? 'General';
    const preAdjustHealth = computeSectorWeightedHealth(
      {
        growth: growth.score,
        quality: quality.score,
        stability: stability.score,
        valuation: valuation.score,
        momentum: momentum.score,
      },
      sectorName
    );

    // ── Continuous risk dampening ───────────────────────────────────
    const stretchCenter = 58;
    const stretchFactor = 1.7;
    const stretchedHealth = clampScore(
      Math.round(stretchCenter + (preAdjustHealth - stretchCenter) * stretchFactor)
    );
    const riskDampening = Math.max(0, (risk.score - 15) * this.riskDampeningCoefficient);
    const dampenedHealth = clampScore(stretchedHealth - riskDampening);

    // ── Apply Penalty Framework ─────────────────────────────────────
    const allPenalties: Penalty[] = [
      ...evaluateAccountingPenalty(inputs),
      ...evaluateDebtPenalty(inputs),
      ...evaluateVolatilityPenalty(inputs),
      ...evaluateGovernancePenalty(inputs),
    ];

    const { finalScore: adjustedHealth, result: penaltyResult } =
      applyPenalties(dampenedHealth, allPenalties);

    // ── Classification ──────────────────────────────────────────────
    const classification = this.classify(adjustedHealth, risk.score);

    // ── Confidence (independent from health score) ──────────────────
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
      confidence.score,
      growth.score,
      quality.score,
      stability.score,
      valuation.score,
      momentum.score,
      risk.score,
      accounting.score,
      penaltyResult.totalPenalty,
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
    const riskAdjusted = healthScore - Math.max(0, (riskScore - 15) * this.riskDampeningCoefficient);

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
    confidenceLevel: ConfidenceLevel,
    confidenceScore: number,
    growth: number,
    quality: number,
    stability: number,
    valuation: number,
    momentum: number,
    risk: number,
    accountingQuality: number,
    penaltyTotal: number,
    inputs: EngineInputs
  ): string {
    const symbol = inputs.symbol;
    const profile = getSectorProfile(inputs.sector?.name ?? 'General');
    const parts: string[] = [];

    // ── Descriptive observation ─────────────────────────────────────
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
      parts.push(`${topName} (${topScore}/100) is the strongest-performing dimension.`);
    }

    // ── Weakness callout ────────────────────────────────────────────
    const [bottomName, bottomScore] = scores[scores.length - 1];
    if (bottomScore < 40) {
      parts.push(`${bottomName} (${bottomScore}/100) is the weakest dimension and may merit closer review.`);
    }

    // ── Risk context ────────────────────────────────────────────────
    if (risk > 65) {
      parts.push(`Risk indicators are elevated (${risk}/100), reflecting above-average volatility or cash flow stress.`);
    } else if (risk < 35) {
      parts.push(`Risk metrics are contained (${risk}/100), indicating lower-than-average stress signals.`);
    }

    // ── Accounting quality ──────────────────────────────────────────
    if (accountingQuality < 40) {
      parts.push(`Accounting quality signals (${accountingQuality}/100) suggest earnings may not be fully backed by operating cash flows.`);
    }

    // ── Penalties ───────────────────────────────────────────────────
    if (penaltyTotal > 0) {
      parts.push(`${penaltyTotal} penalty point(s) applied for detected stress signals.`);
    }

    // ── Confidence ──────────────────────────────────────────────────
    parts.push(`Confidence: ${confidenceLevel} (${confidenceScore}/100).`);

    // ── Closing ─────────────────────────────────────────────────────
    if (classification === 'Excellent' || classification === 'Healthy') {
      parts.push(`The company's profile aligns with above-average quality and stability characteristics within the ${profile.name} sector.`);
    } else if (classification === 'Stable') {
      parts.push(`The composite profile suggests a holding pattern with no clear directional catalyst.`);
    } else {
      parts.push(`The composite profile indicates below-average metrics that warrant careful evaluation against investment criteria.`);
    }

    return parts.join(' ');
  }
}

export const stockStoryEngine = new StockStoryEngine();
export default stockStoryEngine;
