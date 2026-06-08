/**
 * Engine 3: Stability Engine (RC-ENGINE-004 — Percentile Migration)
 */

import { EngineInputs, StabilityEngineOutput, clampScore, weightedAverage } from '../types';
import { getSectorProfile } from '../SectorAdapter';
import { SectorPercentileEngine } from '../scoring/SectorPercentileEngine';

export class StabilityEngine {
  evaluate(inputs: EngineInputs): StabilityEngineOutput {
    const { financials, features, factors, sector } = inputs;
    const profile = getSectorProfile(sector?.name ?? 'General');
    const sectorName = sector?.name ?? 'General';
    const usePercentile = SectorPercentileEngine.hasSufficientData(sectorName, 'debtToEquity');

    // ── Sub-score 1: Debt Score ─────────────────────────────────────
    let debtScore = 50;
    if (financials.debtToEquity !== null) {
      if (usePercentile) {
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
      if (usePercentile) {
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
      if (usePercentile) {
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

    // ── Sub-score 6: Market Cap Size Score ──────────────────────────
    let marketCapSizeScore = 50;
    if (financials.marketCap !== null) {
      const mcapCr = financials.marketCap; // in crores (INR)
      if (mcapCr >= 100000) marketCapSizeScore = 95;       // Large cap (>1L Cr)
      else if (mcapCr >= 20000) marketCapSizeScore = 85;   // Large-Mid
      else if (mcapCr >= 5000) marketCapSizeScore = 70;    // Mid cap
      else if (mcapCr >= 1000) marketCapSizeScore = 50;    // Small-Mid
      else if (mcapCr >= 100) marketCapSizeScore = 30;     // Small cap
      else marketCapSizeScore = 15;                         // Micro cap
    }

    const rawComposite = weightedAverage([
      { score: debtScore, weight: 2.5 },
      { score: cashScore, weight: 2 },
      { score: volatilityScore, weight: 1.5 },
      { score: coverageScore, weight: 2 },
      { score: interestCoverageScore, weight: 2 },
    ]);

    const factorAdjust = (factors.riskFactor - 50) * 0.2;
    const compositeScore = clampScore(rawComposite + factorAdjust);

    const commentary = this.generateCommentary(compositeScore, financials, profile, usePercentile);

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
