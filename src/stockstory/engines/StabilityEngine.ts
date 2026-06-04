/**
 * Engine 3: Stability Engine
 * Weight: 20%
 * 
 * Inputs: Debt, Cash, Volatility, Coverage
 * 
 * Evaluates balance sheet strength and financial stability.
 * Higher score = more stable / less fragile.
 */

import { EngineInputs, StabilityEngineOutput, clampScore, weightedAverage } from '../types';

export class StabilityEngine {
  evaluate(inputs: EngineInputs): StabilityEngineOutput {
    const { financials, features, factors } = inputs;

    // ── Sub-score 1: Debt Score (lower debt = higher score) ─────────
    let debtScore = 50;
    if (financials.debtToEquity !== null) {
      const dte = financials.debtToEquity;
      if (dte <= 0) debtScore = 95;            // zero/negative debt — excellent
      else if (dte < 0.3) debtScore = 85;       // very low leverage
      else if (dte < 0.6) debtScore = 75;       // low leverage
      else if (dte < 1.0) debtScore = 60;       // moderate
      else if (dte < 1.5) debtScore = 40;       // elevated
      else if (dte < 2.5) debtScore = 25;       // highly leveraged
      else debtScore = 10;                       // extreme leverage
    }

    // ── Sub-score 2: Cash / Liquidity Score ─────────────────────────
    let cashScore = 50;
    const currentRatio = financials.currentRatio;
    if (currentRatio !== null) {
      if (currentRatio >= 3.0) cashScore = 90;    // very liquid
      else if (currentRatio >= 2.0) cashScore = 80; // healthy liquidity
      else if (currentRatio >= 1.5) cashScore = 65; // adequate
      else if (currentRatio >= 1.0) cashScore = 45; // tight
      else if (currentRatio >= 0.5) cashScore = 25; // stressed
      else cashScore = 10;                          // severe stress
    }

    // ── Sub-score 3: Volatility Score (lower volatility = higher score)
    let volatilityScore = 50;
    if (features.volatility !== null) {
      const vol = features.volatility;
      // volatility is annualized (e.g. 0.20 = 20%)
      if (vol <= 0.15) volatilityScore = 90;      // very low volatility
      else if (vol <= 0.25) volatilityScore = 75;  // low
      else if (vol <= 0.35) volatilityScore = 55;  // moderate
      else if (vol <= 0.50) volatilityScore = 35;  // elevated
      else volatilityScore = 15;                    // highly volatile
    }

    // ── Sub-score 4: Coverage Score (debt service capacity) ─────────
    // Proxy: combine debt/equity with operating margin as debt-service proxy
    let coverageScore = 50;
    if (financials.debtToEquity !== null && financials.operatingMargin !== null) {
      const dte = financials.debtToEquity;
      const om = financials.operatingMargin;

      if (dte <= 0) {
        coverageScore = 95; // no debt to service
      } else {
        // Coverage ratio proxy = operating margin / debt-to-equity
        const coverageRatio = dte > 0.01 ? om / dte : 10;
        if (coverageRatio >= 1.0) coverageScore = 90;
        else if (coverageRatio >= 0.5) coverageScore = 75;
        else if (coverageRatio >= 0.25) coverageScore = 55;
        else if (coverageRatio >= 0.10) coverageScore = 35;
        else coverageScore = 15;
      }
    } else if (financials.debtToEquity !== null) {
      coverageScore = financials.debtToEquity <= 0.5 ? 70 : financials.debtToEquity <= 1.5 ? 45 : 20;
    }

    // ── Incorporate risk factor from factor engine ──────────────────
    const riskFactorAdjust = (factors.riskFactor - 50) * 0.2;

    // ── Composite Score ─────────────────────────────────────────────
    const compositeScore = weightedAverage([
      { score: debtScore + riskFactorAdjust, weight: 3 },
      { score: cashScore, weight: 2 },
      { score: volatilityScore + riskFactorAdjust * 0.5, weight: 2 },
      { score: coverageScore, weight: 3 },
    ]);

    const commentary = this.generateCommentary(compositeScore, financials, features);

    return {
      score: compositeScore,
      debtScore: clampScore(debtScore + riskFactorAdjust),
      cashScore,
      volatilityScore: clampScore(volatilityScore + riskFactorAdjust * 0.5),
      coverageScore,
      commentary,
    };
  }

  private generateCommentary(
    score: number,
    f: EngineInputs['financials'],
    feat: EngineInputs['features']
  ): string {
    const hasData = f.debtToEquity !== null || f.currentRatio !== null;
    if (!hasData) return 'Insufficient stability data. Score reflects neutral baseline.';

    if (score >= 80) {
      return 'Exceptional stability. Low leverage, strong liquidity, and contained volatility indicate a fortress balance sheet.';
    }

    if (score >= 60) {
      const parts: string[] = [];
      if (f.debtToEquity !== null && f.debtToEquity <= 0.6) parts.push('manageable debt levels');
      if (f.currentRatio !== null && f.currentRatio >= 1.5) parts.push('adequate liquidity');
      return `Solid stability profile: ${parts.join(', ')}. Balance sheet supports business operations without stress.`;
    }

    if (score >= 40) {
      return 'Moderate stability. Some balance sheet metrics show strain, but overall financial structure remains manageable.';
    }

    return 'Concerning stability indicators. Elevated leverage or tight liquidity suggest vulnerability to adverse conditions.';
  }
}

export const stabilityEngine = new StabilityEngine();
