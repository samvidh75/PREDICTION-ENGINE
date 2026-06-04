/**
 * Engine 5: Valuation Engine
 * Weight: 15%
 * 
 * Inputs: PE, PB, EV/EBITDA, FCF Yield
 * 
 * Evaluates relative valuation. Higher score = more attractive valuation.
 * 
 * FIX (RC-ENGINE-002): Sector-aware PE/PB/EV thresholds.
 * FIX (RC-ENGINE-002): Factor adjustment at composite level only.
 */

import { EngineInputs, ValuationEngineOutput, clampScore, weightedAverage } from '../types';
import { getSectorProfile } from '../SectorAdapter';

export class ValuationEngine {
  evaluate(inputs: EngineInputs): ValuationEngineOutput {
    const { financials, factors, sector } = inputs;
    const profile = getSectorProfile(sector?.name ?? 'General');

    // ── Sub-score 1: PE Score (lower PE = higher score) — sector-aware
    let peScore = 50;
    const pe = financials.peRatio;
    if (pe !== null) {
      if (pe <= 0) peScore = 20;
      else if (pe <= profile.peCheap) peScore = 95;
      else if (pe <= profile.peFair) peScore = 75;
      else if (pe <= profile.peExpensive) peScore = 50;
      else if (pe <= profile.peExtreme) peScore = 30;
      else peScore = 10;
    }

    // ── Sub-score 2: PB Score (lower PB = higher score) — sector-aware
    let pbScore = 50;
    const pb = financials.pbRatio;
    if (pb !== null) {
      if (pb <= 0) pbScore = 15;
      else if (pb <= profile.pbCheap) pbScore = 90;
      else if (pb <= profile.pbFair) pbScore = 65;
      else if (pb <= profile.pbExpensive) pbScore = 45;
      else if (pb <= profile.pbExtreme) pbScore = 25;
      else pbScore = 10;
    }

    // ── Sub-score 3: EV/EBITDA Score — sector-aware ────────────────
    let evEbitdaScore = 50;
    if (!profile.skipEvEbitda && financials.evEbitda !== null) {
      const ev = financials.evEbitda;
      if (ev <= 0) evEbitdaScore = 20;
      else if (ev <= profile.evCheap) evEbitdaScore = 90;
      else if (ev <= profile.evFair) evEbitdaScore = 70;
      else if (ev <= profile.evExpensive) evEbitdaScore = 50;
      else if (ev <= profile.evExtreme) evEbitdaScore = 30;
      else evEbitdaScore = 15;
    }
    // For financials, EV/EBITDA is skipped — stays at 50 neutral with zero weight

    // ── Sub-score 4: FCF Yield Score (higher yield = higher score) ──
    let fcfYieldScore = 50;
    const fcfYield = financials.fcfYield;
    if (fcfYield !== null) {
      if (fcfYield >= 0.08) fcfYieldScore = 95;
      else if (fcfYield >= 0.05) fcfYieldScore = 80;
      else if (fcfYield >= 0.03) fcfYieldScore = 65;
      else if (fcfYield >= 0.02) fcfYieldScore = 50;
      else if (fcfYield >= 0) fcfYieldScore = 35;
      else fcfYieldScore = 20;
    }

    // ── Weight adjustments based on sector primary metric ───────────
    const peWeight = profile.primaryMetric === 'pe' ? 3 : 2;
    const pbWeight = profile.primaryMetric === 'pb' ? 3 : 2;
    const evWeight = profile.skipEvEbitda ? 0 : (profile.primaryMetric === 'evEbitda' ? 3 : 2);

    // ── Composite Score ─────────────────────────────────────────────
    const rawComposite = weightedAverage([
      { score: peScore, weight: peWeight },
      { score: pbScore, weight: pbWeight },
      { score: evEbitdaScore, weight: evWeight },
      { score: fcfYieldScore, weight: 3 },
    ]);

    // ── Factor adjustment ONCE at composite level ───────────────────
    const factorAdjust = (factors.valueFactor - 50) * 0.2;
    const compositeScore = clampScore(rawComposite + factorAdjust);

    const commentary = this.generateCommentary(compositeScore, financials, profile);

    return {
      score: compositeScore,
      peScore: clampScore(peScore + factorAdjust * 0.5),
      pbScore: clampScore(pbScore + factorAdjust * 0.5),
      evEbitdaScore: clampScore(evEbitdaScore + factorAdjust * 0.5),
      fcfYieldScore,
      commentary,
    };
  }

  private generateCommentary(
    score: number,
    f: EngineInputs['financials'],
    profile: ReturnType<typeof getSectorProfile>
  ): string {
    const hasData = f.peRatio !== null || f.pbRatio !== null;
    if (!hasData) return 'Insufficient valuation data. Score reflects neutral baseline.';

    if (score >= 75) {
      return `Attractive valuation relative to ${profile.name} sector norms. Multiple metrics suggest the stock trades at a discount to peers.`;
    }

    if (score >= 60) {
      return `Reasonable valuation within ${profile.name} sector. The stock trades near or slightly below sector medians.`;
    }

    if (score >= 45) {
      return `Fairly valued against ${profile.name} peers. Current pricing approximately reflects sector fundamentals.`;
    }

    if (score >= 30) {
      return `Premium valuation relative to ${profile.name} sector. The stock trades above sector averages, which may reflect growth expectations.`;
    }

    return `Stretched valuation. Metrics are elevated relative to ${profile.name} sector norms, indicating limited margin of safety at current levels.`;
  }
}

export const valuationEngine = new ValuationEngine();
