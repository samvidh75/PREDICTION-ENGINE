/**
 * Company Profile Builder
 *
 * Constructs a CompanyIntelligenceProfile from IntelligenceInput and signals.
 * This is the canonical company-level intelligence view consumed by:
 * - Thesis Engine (bull/bear case generation)
 * - Peer Graph (company-to-company comparison)
 * - Explainability Layer (product-facing narratives)
 */

import type { IntelligenceInput } from '../../types';
import type { IntelligenceSignal } from '../signals/SignalTypes';
import type {
  CompanyIntelligenceProfile,
  CompanyIdentity,
  FundamentalSnapshot,
  QualityAssessment,
  GrowthTrajectory,
  MoatAssessment,
  CompanyAggregateScores,
  CompanyNarrative,
} from './CompanyTypes';
import { clampScore } from '../scoring';

export class CompanyProfileBuilder {
  /**
   * Build a full company intelligence profile from input + signals.
   */
  build(input: IntelligenceInput, signals: IntelligenceSignal[]): CompanyIntelligenceProfile {
    const identity = this.buildIdentity(input);
    const fundamentals = this.buildFundamentals(input);
    const quality = this.buildQuality(input);
    const growth = this.buildGrowth(input);
    const moat = this.buildMoat(input, signals);
    const aggregate = this.buildAggregate(signals);
    const narrative = this.buildNarrative(input, signals, aggregate);

    return {
      symbol: input.symbol,
      exchange: input.exchange,
      generatedAt: new Date().toISOString(),
      identity,
      fundamentals,
      quality,
      growth,
      moat,
      signals,
      aggregate,
      narrative,
    };
  }

  // ── Identity ──────────────────────────────────────────────────

  private buildIdentity(input: IntelligenceInput): CompanyIdentity {
    const cap = input.financials.marketCap;
    return {
      name: null, // Populated upstream by data mapper
      isin: null,
      sector: input.sector.name || 'Unclassified',
      industry: null,
      marketCap: cap,
      marketCapBucket: cap !== null
        ? cap >= 20000 ? 'large_cap'
        : cap >= 5000 ? 'mid_cap'
        : cap >= 500 ? 'small_cap'
        : 'micro_cap'
        : 'unknown',
      listedSince: null,
      headquarterState: null,
      employeeCount: null,
    };
  }

  // ── Fundamentals ──────────────────────────────────────────────

  private buildFundamentals(input: IntelligenceInput): FundamentalSnapshot {
    const f = input.financials;
    return {
      roe: f.roe,
      roic: f.roic,
      roa: f.roa,
      grossMargin: f.grossMargin,
      operatingMargin: f.operatingMargin,
      netMargin: f.netMargin,
      debtToEquity: f.debtToEquity,
      interestCoverage: f.interestCoverage,
      currentRatio: f.currentRatio,
      peRatio: f.peRatio,
      pbRatio: f.pbRatio,
      evToEbitda: f.evEbitda,
      dividendYield: f.dividendYield,
      freeCashFlowYield: f.fcfYield,
      revenueGrowth3y: f.revenueGrowth,
      profitGrowth3y: f.profitGrowth,
      epsGrowth3y: f.epsGrowth,
    };
  }

  // ── Quality ──────────────────────────────────────────────────

  private buildQuality(input: IntelligenceInput): QualityAssessment {
    const r = input.risks;
    const f = input.financials;

    // Earnings quality: based on margin stability and cash conversion
    let earningsQ = 50;
    if (f.operatingMargin !== null && f.operatingMargin > 15) earningsQ += 15;
    if (f.roic !== null && f.roic > 12) earningsQ += 10;
    if (r?.esopDilution !== null && r.esopDilution < 3) earningsQ += 5;
    if (r?.auditorChange) earningsQ -= 10;

    // Balance sheet quality
    let bsQ = 50;
    if (f.debtToEquity !== null && f.debtToEquity < 0.5) bsQ += 20;
    else if (f.debtToEquity !== null && f.debtToEquity < 1.0) bsQ += 10;
    if (f.interestCoverage !== null && f.interestCoverage > 5) bsQ += 15;
    if (f.currentRatio !== null && f.currentRatio > 1.5) bsQ += 10;

    const redFlags: string[] = [];
    if (r?.pledgedShares !== null && r.pledgedShares > 30) redFlags.push('High promoter pledge');
    if (r?.auditorChange) redFlags.push('Auditor change');
    if (r?.relatedPartyTransactions) redFlags.push('Related-party transactions');
    if (f.debtToEquity !== null && f.debtToEquity > 2) redFlags.push('High leverage');

    return {
      qualityScore: clampScore(Math.round((earningsQ + bsQ) / 2)),
      earningsQuality: clampScore(earningsQ),
      balanceSheetQuality: clampScore(bsQ),
      governanceScore: r?.governanceScore ?? null,
      promoterHolding: r?.promoterHolding ?? null,
      institutionalHolding: r?.institutionalHolding ?? null,
      pledgedShares: r?.pledgedShares ?? null,
      redFlags,
    };
  }

  // ── Growth ────────────────────────────────────────────────────

  private buildGrowth(input: IntelligenceInput): GrowthTrajectory {
    const f = input.financials;
    const rev = f.revenueGrowth;
    const profit = f.profitGrowth;
    const epsG = f.epsGrowth;

    const avg = (rev !== null && profit !== null && epsG !== null)
      ? (rev + profit + epsG) / 3
      : rev ?? profit ?? epsG;

    const trajectoryScore = avg !== null && avg > 20 ? 85
      : avg !== null && avg > 10 ? 65
      : avg !== null && avg > 0 ? 45
      : avg !== null ? 30 : 40;

    const trajectory: GrowthTrajectory['trajectory'] =
      avg !== null && avg > 20 ? 'accelerating'
      : avg !== null && avg > 5 ? 'steady'
      : avg !== null && avg > -5 ? 'decelerating'
      : 'unclear';

    const marginExpanding = (f.operatingMargin !== null && profit !== null && profit > 5)
      ? true : null;

    return {
      trajectoryScore,
      revenueCAGR: rev,
      profitCAGR: profit,
      trajectory,
      marginExpanding,
      capexIncreasing: null,
    };
  }

  // ── Moat ──────────────────────────────────────────────────────

  private buildMoat(input: IntelligenceInput, signals: IntelligenceSignal[]): MoatAssessment {
    const f = input.financials;

    // Existing moat signals from registry
    const moatSignals = signals.filter(s =>
      s.category === 'sector_context' || s.category === 'peer_relative' ||
      s.category === 'financial_quality'
    );
    const positiveMoat = moatSignals.filter(s => s.direction === 'positive').length;
    const totalMoat = moatSignals.length;
    const moatRatio = totalMoat > 0 ? positiveMoat / totalMoat : 0.5;

    // ROIC as economic moat proxy
    let moatScore = 30;
    if (f.roic !== null && f.roic > 20) moatScore = 80;
    else if (f.roic !== null && f.roic > 15) moatScore = 65;
    else if (f.roic !== null && f.roic > 10) moatScore = 50;
    else if (f.roic !== null && f.roic > 5) moatScore = 35;

    moatScore = Math.round(moatScore * 0.7 + clampScore(moatRatio * 100) * 0.3);

    return {
      moatScore: clampScore(moatScore),
      moatWidth: moatScore >= 65 ? 'wide' : moatScore >= 40 ? 'narrow' : 'unclear',
      pricingPower: f.operatingMargin !== null && f.operatingMargin > 20 ? 'strong'
        : f.operatingMargin !== null && f.operatingMargin > 10 ? 'moderate'
        : 'unclear',
      switchingCosts: f.roic !== null && f.roic > 15 ? 'high' : 'unclear',
      networkEffects: null,
      costAdvantage: f.operatingMargin !== null && f.operatingMargin > 25,
      intangibleAssets: f.roa !== null && f.roa > 15,
    };
  }

  // ── Aggregate ─────────────────────────────────────────────────

  private buildAggregate(signals: IntelligenceSignal[]): CompanyAggregateScores {
    const totalImpact = signals.reduce((s, sig) => s + sig.scoreImpact, 0);
    const overall = clampScore(50 + totalImpact);

    const classification: CompanyAggregateScores['classification'] =
      overall >= 80 ? 'excellent'
      : overall >= 65 ? 'healthy'
      : overall >= 45 ? 'stable'
      : overall >= 25 ? 'weakening'
      : 'at_risk';

    const confidences = signals.map(s => s.confidence);
    const avgConfidence = confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0;

    const completeness = signals.length / 30; // 30 signals is the full registry

    return {
      overall,
      classification,
      confidence: Math.min(0.99, avgConfidence),
      dataCompleteness: Math.min(1, completeness),
    };
  }

  // ── Narrative ─────────────────────────────────────────────────

  private buildNarrative(
    input: IntelligenceInput,
    signals: IntelligenceSignal[],
    aggregate: CompanyAggregateScores,
  ): CompanyNarrative {
    const positiveSigs = signals.filter(s => s.direction === 'positive');
    const negativeSigs = signals.filter(s => s.direction === 'negative');

    const oneLiner = `${input.symbol} is ${aggregate.classification.replace('_', ' ')} with ${aggregate.overall}/100 overall score and ${Math.round(aggregate.confidence * 100)}% confidence.`;

    const strengths = positiveSigs.slice(0, 5).map(s => s.name);
    const concerns = negativeSigs.slice(0, 5).map(s => s.name);

    const thesisContext = `Operating in the ${input.sector.name} sector` +
      (input.financials.revenueGrowth !== null
        ? ` with revenue growth of ${input.financials.revenueGrowth}%. `
        : '. ') +
      (input.financials.roe !== null
        ? `Return on equity is ${input.financials.roe}%` +
          (input.financials.roic !== null ? ` and ROIC is ${input.financials.roic}%.` : '.')
        : '');

    return {
      oneLiner,
      strengths,
      concerns,
      thesisContext,
      lastUpdated: new Date().toISOString(),
    };
  }
}

export const companyProfileBuilder = new CompanyProfileBuilder();
