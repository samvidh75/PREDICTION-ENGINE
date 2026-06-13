/**
 * Engine 5: Valuation Engine (RC-ENGINE-004 — Percentile Migration)
 * TRACK-22: Added DividendYieldScore (Task 14)
 * TRACK-P1: Per-metric percentile readiness.
 */

import { EngineInputs, ValuationEngineOutput, clampScore, weightedAverage } from '../types';
import { getSectorProfile } from '../SectorAdapter';
import { SectorPercentileEngine } from '../scoring/SectorPercentileEngine';

export class ValuationEngine {
  evaluate(inputs: EngineInputs): ValuationEngineOutput {
    const { financials, factors, sector } = inputs;
    const profile = getSectorProfile(sector?.name ?? 'General');
    const sectorName = sector?.name ?? 'General';

    const percentilePE = SectorPercentileEngine.hasSufficientData(sectorName, 'peRatio');
    const percentilePB = SectorPercentileEngine.hasSufficientData(sectorName, 'pbRatio');
    const percentileEV = SectorPercentileEngine.hasSufficientData(sectorName, 'evEbitda');
    const percentileFCFY = SectorPercentileEngine.hasSufficientData(sectorName, 'fcfYield');

    // ── Sub-score 1: PE Score ───────────────────────────────────────
    let peScore = 50;
    const pe = financials.peRatio;
    if (pe !== null) {
      if (percentilePE) {
        peScore = SectorPercentileEngine.score(pe, sectorName, 'peRatio');
      } else {
        if (pe <= 0) peScore = 20;
        else if (pe <= profile.peCheap) peScore = 95;
        else if (pe <= profile.peFair) peScore = 75;
        else if (pe <= profile.peExpensive) peScore = 50;
        else if (pe <= profile.peExtreme) peScore = 30;
        else peScore = 10;
      }
    }

    // ── Sub-score 2: PB Score ───────────────────────────────────────
    let pbScore = 50;
    const pb = financials.pbRatio;
    if (pb !== null) {
      if (percentilePB) {
        pbScore = SectorPercentileEngine.score(pb, sectorName, 'pbRatio');
      } else {
        if (pb <= 0) pbScore = 15;
        else if (pb <= profile.pbCheap) pbScore = 90;
        else if (pb <= profile.pbFair) pbScore = 65;
        else if (pb <= profile.pbExpensive) pbScore = 45;
        else if (pb <= profile.pbExtreme) pbScore = 25;
        else pbScore = 10;
      }
    }

    // ── Sub-score 3: EV/EBITDA Score ────────────────────────────────
    let evEbitdaScore = 50;
    if (!profile.skipEvEbitda && financials.evEbitda !== null) {
      if (percentileEV) {
        evEbitdaScore = SectorPercentileEngine.score(financials.evEbitda, sectorName, 'evEbitda');
      } else {
        const ev = financials.evEbitda;
        if (ev <= 0) evEbitdaScore = 20;
        else if (ev <= profile.evCheap) evEbitdaScore = 90;
        else if (ev <= profile.evFair) evEbitdaScore = 70;
        else if (ev <= profile.evExpensive) evEbitdaScore = 50;
        else if (ev <= profile.evExtreme) evEbitdaScore = 30;
        else evEbitdaScore = 15;
      }
    }

    // ── Sub-score 4: FCF Yield Score ────────────────────────────────
    let fcfYieldScore = 50;
    const fcfYield = financials.fcfYield;
    if (fcfYield !== null) {
      if (percentileFCFY) {
        fcfYieldScore = SectorPercentileEngine.score(fcfYield, sectorName, 'fcfYield');
      } else {
        if (fcfYield >= 0.08) fcfYieldScore = 95;
        else if (fcfYield >= 0.05) fcfYieldScore = 80;
        else if (fcfYield >= 0.03) fcfYieldScore = 65;
        else if (fcfYield >= 0.02) fcfYieldScore = 50;
        else if (fcfYield >= 0) fcfYieldScore = 35;
        else fcfYieldScore = 20;
      }
    }

    // ── Sub-score 5: Dividend Yield Score (TRACK-12B: yield-trap) ──
    let dividendYieldScore = 50;
    const divYield = financials.dividendYield;
    if (divYield !== null) {
      if (divYield >= 0.20) dividendYieldScore = 10;   // Extreme distress (likely unsustainable)
      else if (divYield >= 0.12) dividendYieldScore = 25; // Probable distress / value trap
      else if (divYield >= 0.08) dividendYieldScore = 50; // Possible distress — neutral
      else if (divYield >= 0.04) dividendYieldScore = 90; // Healthy high yield
      else if (divYield >= 0.03) dividendYieldScore = 80;
      else if (divYield >= 0.02) dividendYieldScore = 65;
      else if (divYield >= 0.01) dividendYieldScore = 50;
      else if (divYield >= 0.005) dividendYieldScore = 35;
      else dividendYieldScore = 20;
    }

    const peWeight = profile.primaryMetric === 'pe' ? 3 : 2;
    const pbWeight = profile.primaryMetric === 'pb' ? 3 : 2;
    const evWeight = profile.skipEvEbitda ? 0 : (profile.primaryMetric === 'evEbitda' ? 3 : 2);

    const rawComposite = weightedAverage([
      { score: peScore, weight: peWeight },
      { score: pbScore, weight: pbWeight },
      { score: evEbitdaScore, weight: evWeight },
      { score: fcfYieldScore, weight: 3 },
      { score: dividendYieldScore, weight: 1.5 },
    ]);

    const factorAdjust = (factors.valueFactor - 50) * 0.2;
    const compositeScore = clampScore(rawComposite + factorAdjust);

    const anyPercentile = percentilePE || percentilePB || percentileEV || percentileFCFY;

    return {
      score: compositeScore,
      peScore: clampScore(peScore + factorAdjust * 0.5),
      pbScore: clampScore(pbScore + factorAdjust * 0.5),
      evEbitdaScore: clampScore(evEbitdaScore + factorAdjust * 0.5),
      fcfYieldScore,
      dividendYieldScore,
      commentary: this.generateCommentary(compositeScore, profile, anyPercentile),
    };
  }

  private generateCommentary(
    score: number,
    profile: ReturnType<typeof getSectorProfile>,
    usePercentile: boolean
  ): string {
    const method = usePercentile ? ` (sector-percentile vs ${profile.name} peers)` : '';
    if (score >= 75) return `Attractive valuation relative to ${profile.name} sector norms${method}.`;
    if (score >= 60) return `Reasonable valuation within ${profile.name} sector${method}.`;
    if (score >= 45) return `Fairly valued against ${profile.name} peers${method}.`;
    if (score >= 30) return `Premium valuation relative to ${profile.name} sector${method}.`;
    return `Stretched valuation. Metrics are elevated relative to ${profile.name} sector norms${method}.`;
  }
}

export const valuationEngine = new ValuationEngine();
