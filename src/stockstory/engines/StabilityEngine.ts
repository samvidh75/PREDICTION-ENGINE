/**
 * Engine 3: Stability Engine
 * Weight: 20%
 * 
 * Inputs: Debt, Cash, Volatility, Coverage, Interest Coverage (NEW)
 * 
 * Evaluates balance sheet strength and financial stability.
 * Higher score = more stable / less fragile.
 * 
 * FIX (RC-ENGINE-002): Factor adjustment at composite level only.
 * FIX (RC-ENGINE-002): Sector-aware D/E and current ratio thresholds.
 * FIX (RC-ENGINE-002): Added interest coverage score.
 */

import { EngineInputs, StabilityEngineOutput, clampScore, weightedAverage } from '../types';
import { getSectorProfile } from '../SectorAdapter';

export class StabilityEngine {
  evaluate(inputs: EngineInputs): StabilityEngineOutput {
    const { financials, features, factors, sector } = inputs;
    const profile = getSectorProfile(sector?.name ?? 'General');

    // ── Sub-score 1: Debt Score (lower debt = higher score) — sector-aware ─
    let debtScore = 50;
    if (financials.debtToEquity !== null) {
      const dte = financials.debtToEquity;
      if (dte <= 0) debtScore = 95;
      else if (dte < profile.deLow) debtScore = 85;
      else if (dte < profile.deModerate) debtScore = 75;
      else if (dte < profile.deElevated) debtScore = 55;
      else if (dte < profile.deExtreme) debtScore = 35;
      else debtScore = 15;
    }

    // ── Sub-score 2: Cash / Liquidity Score — sector-aware ─────────
    let cashScore = 50;
    const currentRatio = financials.currentRatio;
    if (currentRatio !== null) {
      if (currentRatio >= profile.crHealthy) cashScore = 90;
      else if (currentRatio >= profile.crAdequate) cashScore = 75;
      else if (currentRatio >= profile.crTight) cashScore = 55;
      else if (currentRatio >= 0.5) cashScore = 30;
      else cashScore = 10;
    }

    // ── Sub-score 3: Volatility Score (lower volatility = higher score)
    let volatilityScore = 50;
    if (features.volatility !== null) {
      const vol = features.volatility;
      if (vol <= 0.15) volatilityScore = 90;
      else if (vol <= 0.25) volatilityScore = 75;
      else if (vol <= 0.35) volatilityScore = 55;
      else if (vol <= 0.50) volatilityScore = 35;
      else volatilityScore = 15;
    }

    // ── Sub-score 4: Coverage Score (debt service capacity) ─────────
    let coverageScore = 50;
    if (financials.debtToEquity !== null && financials.operatingMargin !== null) {
      const dte = financials.debtToEquity;
      const om = financials.operatingMargin;

      if (dte <= 0) {
        coverageScore = 95;
      } else {
        const coverageRatio = dte > 0.01 ? om / dte : 10;
        if (coverageRatio >= 1.0) coverageScore = 90;
        else if (coverageRatio >= 0.5) coverageScore = 75;
        else if (coverageRatio >= 0.25) coverageScore = 55;
        else if (coverageRatio >= 0.10) coverageScore = 35;
        else coverageScore = 15;
      }
    } else if (financials.debtToEquity !== null) {
      const dte = financials.debtToEquity;
      if (dte <= profile.deElevated) coverageScore = 70;
      else if (dte <= profile.deExtreme) coverageScore = 45;
      else coverageScore = 20;
    }

    // ── Sub-score 5: Interest Coverage (NEW) ────────────────────────
    // Proxy: operating margin relative to debt load
    // For financials: operating margin already captures spread income
    let interestCoverageScore = 50;
    if (financials.operatingMargin !== null && financials.debtToEquity !== null) {
      const om = financials.operatingMargin;
      const dte = financials.debtToEquity;

      if (dte <= 0) {
        interestCoverageScore = 95; // no debt = infinite coverage
      } else {
        // Interest coverage proxy: OM / DTE * sector adjustment
        // Banks have low OM but operate with high DTE — their OM is effectively
        // net interest margin, so the proxy still works directionally
        const icrProxy = (om * 100) / Math.max(dte, 0.1);
        if (icrProxy >= 15) interestCoverageScore = 90;
        else if (icrProxy >= 8) interestCoverageScore = 75;
        else if (icrProxy >= 4) interestCoverageScore = 60;
        else if (icrProxy >= 2) interestCoverageScore = 45;
        else if (icrProxy >= 1) interestCoverageScore = 30;
        else interestCoverageScore = 15;
      }
    }

    // ── Composite Score ─────────────────────────────────────────────
    const rawComposite = weightedAverage([
      { score: debtScore, weight: 2.5 },
      { score: cashScore, weight: 2 },
      { score: volatilityScore, weight: 1.5 },
      { score: coverageScore, weight: 2 },
      { score: interestCoverageScore, weight: 2 },
    ]);

    // ── Factor adjustment ONCE at composite level ───────────────────
    const factorAdjust = (factors.riskFactor - 50) * 0.2;
    const compositeScore = clampScore(rawComposite + factorAdjust);

    const commentary = this.generateCommentary(compositeScore, financials, profile);

    return {
      score: compositeScore,
      debtScore: clampScore(debtScore + factorAdjust * 0.5),
      cashScore,
      volatilityScore,
      coverageScore,
      commentary,
    };
  }

  private generateCommentary(
    score: number,
    f: EngineInputs['financials'],
    profile: ReturnType<typeof getSectorProfile>
  ): string {
    const hasData = f.debtToEquity !== null || f.currentRatio !== null;
    if (!hasData) return 'Insufficient stability data. Score reflects neutral baseline.';

    if (score >= 80) {
      return `Exceptional stability within ${profile.name} sector norms. Low leverage, strong liquidity, and contained volatility indicate a resilient balance sheet.`;
    }

    if (score >= 60) {
      const parts: string[] = [];
      if (f.debtToEquity !== null && f.debtToEquity <= profile.deElevated) parts.push('manageable debt levels');
      if (f.currentRatio !== null && f.currentRatio >= profile.crTight) parts.push('adequate liquidity');
      return `Solid stability profile: ${parts.join(', ')}. Balance sheet supports business operations without stress.`;
    }

    if (score >= 40) {
      return 'Moderate stability. Some balance sheet metrics show strain relative to sector norms, but overall financial structure remains manageable.';
    }

    return 'Concerning stability indicators. Leverage or liquidity metrics suggest vulnerability to adverse conditions.';
  }
}

export const stabilityEngine = new StabilityEngine();
