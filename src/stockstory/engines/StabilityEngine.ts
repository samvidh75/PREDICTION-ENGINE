/**
 * Engine 3: Stability Engine (RC-ENGINE-004 — Percentile Migration)
 * 
 * TRACK-P1: Per-metric percentile readiness, marketCapSizeScore activated.
 * 
 * STABILITY_WEIGHTS (documented):
 *   debt: 2.5, liquidity: 2.0, volatility: 1.5, coverage: 2.0,
 *   interestCoverage: 2.0, marketCapSize: 1.0
 * 
 * marketCapSize weight (1.0) chosen because:
 *   - visible but not dominant (7% of total)
 *   - mega-cap to microcap difference bounded at ~7 points
 *   - null marketCap → neutral 50, no distortion
 */

import { EngineInputs, StabilityEngineOutput, clampScore, isFiniteNumber, weightedAverage } from '../types';
import { getSectorProfile } from '../SectorAdapter';
import { SectorPercentileEngine } from '../scoring/SectorPercentileEngine';

const STABILITY_WEIGHTS = {
  debt: 2.5,
  liquidity: 2.0,
  volatility: 1.5,
  coverage: 2.0,
  interestCoverage: 2.0,
  marketCapSize: 1.0,
} as const;

export class StabilityEngine {
  evaluate(inputs: EngineInputs): StabilityEngineOutput {
    const { financials, features, factors, sector } = inputs;
    const profile = getSectorProfile(sector?.name ?? 'General');
    const sectorName = sector?.name ?? 'General';

    const percentileDTE = SectorPercentileEngine.hasSufficientData(sectorName, 'debtToEquity');
    const percentileCR = SectorPercentileEngine.hasSufficientData(sectorName, 'currentRatio');
    const percentileVol = SectorPercentileEngine.hasSufficientData(sectorName, 'volatility');

    // ── Sub-score 1: Debt Score ─────────────────────────────────────
    let debtScore = 50;
    if (financials.debtToEquity !== null) {
      if (percentileDTE) {
        debtScore = SectorPercentileEngine.score(financials.debtToEquity, sectorName, 'debtToEquity');
      } else {
        const dte = financials.debtToEquity;
        if (dte <= 0) debtScore = 95;
        else if (dte < profile.deLow) debtScore = 85;
        else if (dte < profile.deModerate) debtScore = 75;
        else if (dte < profile.deElevated) debtScore = 55;
        else if (dte < profile.deExtreme) debtScore = 35;
        else debtScore = 15;
      }
    }

    // ── Sub-score 2: Cash / Liquidity Score ─────────────────────────
    let cashScore = 50;
    const currentRatio = financials.currentRatio;
    if (currentRatio !== null) {
      if (percentileCR) {
        cashScore = SectorPercentileEngine.score(currentRatio, sectorName, 'currentRatio');
      } else {
        if (currentRatio >= profile.crHealthy) cashScore = 90;
        else if (currentRatio >= profile.crAdequate) cashScore = 75;
        else if (currentRatio >= profile.crTight) cashScore = 55;
        else if (currentRatio >= 0.5) cashScore = 30;
        else cashScore = 10;
      }
    }

    // ── Sub-score 3: Volatility Score ───────────────────────────────
    let volatilityScore = 50;
    if (features.volatility !== null) {
      const vol = features.volatility;
      if (percentileVol) {
        volatilityScore = SectorPercentileEngine.score(vol, sectorName, 'volatility');
      } else {
        if (vol <= 0.15) volatilityScore = 90;
        else if (vol <= 0.25) volatilityScore = 75;
        else if (vol <= 0.35) volatilityScore = 55;
        else if (vol <= 0.50) volatilityScore = 35;
        else volatilityScore = 15;
      }
    }

    // ── Sub-score 4: Coverage Score ─────────────────────────────────
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

    // ── Sub-score 5: Interest Coverage ──────────────────────────────
    let interestCoverageScore = 50;
    if (financials.operatingMargin !== null && financials.debtToEquity !== null) {
      const om = financials.operatingMargin;
      const dte = financials.debtToEquity;
      if (dte <= 0) {
        interestCoverageScore = 95;
      } else {
        const icrProxy = (om * 100) / Math.max(dte, 0.1);
        if (icrProxy >= 15) interestCoverageScore = 90;
        else if (icrProxy >= 8) interestCoverageScore = 75;
        else if (icrProxy >= 4) interestCoverageScore = 60;
        else if (icrProxy >= 2) interestCoverageScore = 45;
        else if (icrProxy >= 1) interestCoverageScore = 30;
        else interestCoverageScore = 15;
      }
    }

    // ── Sub-score 6: Market Cap Size Score (TRACK-12B: log10) ──────
    let marketCapSizeScore = 50;
    const marketCap = isFiniteNumber(financials.marketCap);
    if (marketCap !== null && marketCap > 0) {
      const mcapCr = marketCap; // in crores (PKR)
      const logMcap = Math.log10(mcapCr);
      // Continuous log10 scaling: ~10 Cr (log10≈1) → 5, 1L Cr (log10=5) → 81, ~1M Cr (log10=6) → 100
      marketCapSizeScore = clampScore((logMcap - 1) / 5 * 95 + 5);
    } else if (marketCap !== null) {
      marketCapSizeScore = 10; // Negative or zero → score floor
    }

    // ── Composite: INCLUDES marketCapSizeScore (TRACK-P1 fix) ───────
    const rawComposite = weightedAverage([
      { score: debtScore, weight: STABILITY_WEIGHTS.debt },
      { score: cashScore, weight: STABILITY_WEIGHTS.liquidity },
      { score: volatilityScore, weight: STABILITY_WEIGHTS.volatility },
      { score: coverageScore, weight: STABILITY_WEIGHTS.coverage },
      { score: interestCoverageScore, weight: STABILITY_WEIGHTS.interestCoverage },
      { score: marketCapSizeScore, weight: marketCap !== null ? STABILITY_WEIGHTS.marketCapSize : 0 },
    ]);

    const factorAdjust = (factors.riskFactor - 50) * 0.2;
    const compositeScore = clampScore(rawComposite + factorAdjust);

    const anyPercentile = percentileDTE || percentileCR || percentileVol;
    const commentary = this.generateCommentary(compositeScore, financials, profile, anyPercentile);

    return {
      score: compositeScore,
      debtScore: clampScore(debtScore + factorAdjust * 0.5),
      cashScore,
      volatilityScore,
      coverageScore,
      marketCapSizeScore,
      commentary,
    };
  }

  private generateCommentary(
    score: number,
    f: EngineInputs['financials'],
    profile: ReturnType<typeof getSectorProfile>,
    usePercentile: boolean
  ): string {
    const hasData = f.debtToEquity !== null || f.currentRatio !== null;
    if (!hasData) return 'Insufficient stability data. Score reflects neutral baseline.';

    const method = usePercentile ? ` (sector-percentile vs ${profile.name} peers)` : '';

    if (score >= 80) {
      return `Exceptional stability within ${profile.name} sector norms${method}. Low leverage, strong liquidity, and contained volatility indicate a resilient balance sheet.`;
    }
    if (score >= 60) {
      return `Solid stability profile${method}. Balance sheet supports business operations without stress.`;
    }
    if (score >= 40) {
      return `Moderate stability${method}. Some balance sheet metrics show strain relative to sector norms.`;
    }
    return `Concerning stability indicators${method}. Leverage or liquidity metrics suggest vulnerability to adverse conditions.`;
  }
}

export const stabilityEngine = new StabilityEngine();