/**
 * Engine 5: Valuation Engine
 * Weight: 15%
 * 
 * Inputs: PE, PB, EV/EBITDA, FCF Yield
 * 
 * Evaluates relative valuation. Higher score = more attractive valuation
 * (cheaper relative to fundamentals). The score is inverted from typical
 * "expensive = bad" framing to "better value = higher score".
 * 
 * NOTE: This means a high PE stock gets a low score, and vice versa.
 */

import { EngineInputs, ValuationEngineOutput, clampScore, weightedAverage } from '../types';

export class ValuationEngine {
  evaluate(inputs: EngineInputs): ValuationEngineOutput {
    const { financials, factors } = inputs;

    // ── Sub-score 1: PE Score (lower PE = higher score) ─────────────
    let peScore = 50;
    const pe = financials.peRatio;
    if (pe !== null) {
      if (pe <= 0) peScore = 20;              // negative earnings
      else if (pe <= 10) peScore = 95;         // deeply undervalued
      else if (pe <= 15) peScore = 85;         // undervalued
      else if (pe <= 20) peScore = 70;         // below market average
      else if (pe <= 25) peScore = 55;         // fair value
      else if (pe <= 35) peScore = 40;         // premium
      else if (pe <= 50) peScore = 25;         // expensive
      else peScore = 10;                        // extreme valuation
    }

    // ── Sub-score 2: PB Score (lower PB = higher score) ─────────────
    let pbScore = 50;
    const pb = financials.pbRatio;
    if (pb !== null) {
      if (pb <= 0) pbScore = 15;
      else if (pb <= 1.0) pbScore = 90;         // below book value
      else if (pb <= 2.0) pbScore = 70;          // reasonable
      else if (pb <= 3.0) pbScore = 50;          // fair
      else if (pb <= 5.0) pbScore = 30;          // expensive
      else pbScore = 10;                          // very expensive
    }

    // ── Sub-score 3: EV/EBITDA Score ────────────────────────────────
    let evEbitdaScore = 50;
    const evEbitda = financials.evEbitda;
    if (evEbitda !== null) {
      if (evEbitda <= 0) evEbitdaScore = 20;
      else if (evEbitda <= 8) evEbitdaScore = 90;
      else if (evEbitda <= 12) evEbitdaScore = 75;
      else if (evEbitda <= 16) evEbitdaScore = 60;
      else if (evEbitda <= 20) evEbitdaScore = 45;
      else if (evEbitda <= 30) evEbitdaScore = 30;
      else evEbitdaScore = 15;
    }

    // ── Sub-score 4: FCF Yield Score (higher yield = higher score) ──
    let fcfYieldScore = 50;
    const fcfYield = financials.fcfYield;
    if (fcfYield !== null) {
      if (fcfYield >= 0.08) fcfYieldScore = 95;     // 8%+ yield — excellent
      else if (fcfYield >= 0.05) fcfYieldScore = 80; // 5-8%
      else if (fcfYield >= 0.03) fcfYieldScore = 65; // 3-5%
      else if (fcfYield >= 0.02) fcfYieldScore = 50; // 2-3%
      else if (fcfYield >= 0) fcfYieldScore = 35;    // 0-2%
      else fcfYieldScore = 20;                        // negative FCF
    }

    // ── Incorporate value factor from factor engine ─────────────────
    const valueFactorAdjust = (factors.valueFactor - 50) * 0.2;

    // ── Composite Score ─────────────────────────────────────────────
    const compositeScore = weightedAverage([
      { score: peScore + valueFactorAdjust, weight: 3 },
      { score: pbScore + valueFactorAdjust * 0.5, weight: 2 },
      { score: evEbitdaScore + valueFactorAdjust * 0.5, weight: 2 },
      { score: fcfYieldScore, weight: 3 },
    ]);

    const commentary = this.generateCommentary(compositeScore, financials);

    return {
      score: compositeScore,
      peScore: clampScore(peScore + valueFactorAdjust),
      pbScore: clampScore(pbScore + valueFactorAdjust * 0.5),
      evEbitdaScore: clampScore(evEbitdaScore + valueFactorAdjust * 0.5),
      fcfYieldScore,
      commentary,
    };
  }

  private generateCommentary(score: number, f: EngineInputs['financials']): string {
    const hasData = f.peRatio !== null || f.pbRatio !== null;
    if (!hasData) return 'Insufficient valuation data. Score reflects neutral baseline.';

    if (score >= 75) {
      return 'Compelling valuation. Multiple metrics suggest the stock trades at a significant discount to intrinsic value. Strong value opportunity.';
    }

    if (score >= 60) {
      return 'Reasonable valuation. The stock trades at or slightly below fair value on most metrics. Modest margin of safety.';
    }

    if (score >= 45) {
      return 'Fairly valued. Current pricing reflects fundamentals without significant discount or premium. Market is pricing efficiently.';
    }

    if (score >= 30) {
      return 'Premium valuation. The stock trades above historical and sector averages. Growth expectations may already be priced in.';
    }

    return 'Stretched valuation. Metrics are elevated across the board, suggesting limited margin of safety at current levels.';
  }
}

export const valuationEngine = new ValuationEngine();
