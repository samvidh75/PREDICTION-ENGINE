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
      else {
        const deElevated = profile.deElevated > 0 ? profile.deElevated : 1.5;
        debtScore = clampScore(Math.round(90 - (dte / deElevated) * 45));
      }
    }

    // ── Sub-score 2: Cash / Liquidity Score — sector-aware ─────────
    let cashScore = 50;
    const currentRatio = financials.currentRatio;
    if (currentRatio !== null) {
      const crHealthy = profile.crHealthy > 0 ? profile.crHealthy : 2.0;
      cashScore = clampScore(Math.round((currentRatio / crHealthy) * 55 + 25));
    }

    // ── Sub-score 3: Volatility Score (lower volatility = higher score)
    let volatilityScore = 50;
    if (features.volatility !== null) {
      const vol = features.volatility;
      volatilityScore = clampScore(Math.round(95 - vol * 180));
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
        coverageScore = clampScore(Math.round(Math.min(95, coverageRatio * 50 + 25)));
      }
    } else if (financials.debtToEquity !== null) {
      const dte = financials.debtToEquity;
      const deElevated = profile.deElevated > 0 ? profile.deElevated : 1.5;
      coverageScore = clampScore(Math.round(80 - (dte / deElevated) * 35));
    }

    // ── Sub-score 5: Interest Coverage (NEW) ────────────────────────
    let interestCoverageScore = 50;
    if (financials.operatingMargin !== null && financials.debtToEquity !== null) {
      const om = financials.operatingMargin;
      const dte = financials.debtToEquity;

      if (dte <= 0) {
        interestCoverageScore = 95;
      } else {
        const icrProxy = (om * 100) / Math.max(dte, 0.1);
        interestCoverageScore = clampScore(Math.round(Math.min(95, (icrProxy / 10) * 50 + 25)));
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
