/**
 * Engine 1: Growth Engine (RC-ENGINE-004 — Percentile Migration)
 * 
 * Inputs: Revenue Growth, EPS Growth, FCF Growth, Profit Growth
 * 
 * Uses sector-percentile scoring when sector data is available.
 * Falls back to static thresholds when insufficient peer data.
 */

import { EngineInputs, GrowthEngineOutput, clampScore, weightedAverage } from '../types';
import { SectorPercentileEngine } from '../scoring/SectorPercentileEngine';

export class GrowthEngine {
  evaluate(inputs: EngineInputs): GrowthEngineOutput {
    const { financials, sector } = inputs;
    const sectorName = sector?.name ?? 'General';
    const usePercentile = SectorPercentileEngine.hasSufficientData(sectorName, 'revenueGrowth');

    // ── Sub-score 1: Revenue Growth (0-100) ─────────────────────────
    let revenueGrowthScore = 50;
    if (financials.revenueGrowth !== null) {
      if (usePercentile) {
        revenueGrowthScore = SectorPercentileEngine.score(
          financials.revenueGrowth, sectorName, 'revenueGrowth'
        );
      } else {
        const rg = financials.revenueGrowth;
        if (rg >= 0.20) revenueGrowthScore = 95;
        else if (rg >= 0.15) revenueGrowthScore = 85;
        else if (rg >= 0.10) revenueGrowthScore = 75;
        else if (rg >= 0.05) revenueGrowthScore = 60;
        else if (rg >= 0) revenueGrowthScore = 40;
        else if (rg >= -0.05) revenueGrowthScore = 25;
        else revenueGrowthScore = 10;
      }
    }

    // ── Sub-score 2: EPS Growth (0-100) ─────────────────────────────
    let epsGrowthScore = 50;
    if (financials.epsGrowth !== null) {
      if (usePercentile) {
        epsGrowthScore = SectorPercentileEngine.score(
          financials.epsGrowth, sectorName, 'epsGrowth'
        );
      } else {
        const eg = financials.epsGrowth;
        if (eg >= 0.25) epsGrowthScore = 95;
        else if (eg >= 0.15) epsGrowthScore = 80;
        else if (eg >= 0.10) epsGrowthScore = 70;
        else if (eg >= 0.05) epsGrowthScore = 55;
        else if (eg >= 0) epsGrowthScore = 40;
        else if (eg >= -0.10) epsGrowthScore = 25;
        else epsGrowthScore = 10;
      }
    }

    // ── Sub-score 3: FCF Growth (0-100) ─────────────────────────────
    let fcfGrowthScore = 50;
    if (financials.fcfGrowth !== null) {
      if (usePercentile) {
        fcfGrowthScore = SectorPercentileEngine.score(
          financials.fcfGrowth, sectorName, 'fcfYield'
        );
      } else {
        const fg = financials.fcfGrowth;
        if (fg >= 0.20) fcfGrowthScore = 95;
        else if (fg >= 0.10) fcfGrowthScore = 80;
        else if (fg >= 0.05) fcfGrowthScore = 65;
        else if (fg >= 0) fcfGrowthScore = 45;
        else if (fg >= -0.10) fcfGrowthScore = 25;
        else fcfGrowthScore = 10;
      }
    }

    // ── Sub-score 4: Profit Growth (0-100) ──────────────────────────
    let profitGrowthScore = 50;
    if (financials.profitGrowth !== null) {
      if (usePercentile) {
        profitGrowthScore = SectorPercentileEngine.score(
          financials.profitGrowth, sectorName, 'epsGrowth'
        );
      } else {
        const pg = financials.profitGrowth;
        if (pg >= 0.25) profitGrowthScore = 95;
        else if (pg >= 0.15) profitGrowthScore = 85;
        else if (pg >= 0.10) profitGrowthScore = 70;
        else if (pg >= 0.05) profitGrowthScore = 55;
        else if (pg >= 0) profitGrowthScore = 40;
        else if (pg >= -0.10) profitGrowthScore = 25;
        else profitGrowthScore = 10;
      }
    }

    // ── Composite score (weighted) ──────────────────────────────────
    const rawComposite = weightedAverage([
      { score: revenueGrowthScore, weight: 3 },
      { score: epsGrowthScore, weight: 3 },
      { score: fcfGrowthScore, weight: 2 },
      { score: profitGrowthScore, weight: 2 },
    ]);

    const factorAdjust = (inputs.factors.growthFactor - 50) * 0.3;
    const compositeScore = clampScore(rawComposite + factorAdjust);

    const commentary = this.generateCommentary(compositeScore, financials, usePercentile, sectorName);

    return {
      score: compositeScore,
      revenueGrowth: financials.revenueGrowth ?? 0,
      epsGrowth: financials.epsGrowth ?? 0,
      fcfGrowth: financials.fcfGrowth ?? 0,
      profitGrowth: financials.profitGrowth ?? 0,
      commentary,
    };
  }

  private generateCommentary(
    score: number,
    f: EngineInputs['financials'],
    usePercentile: boolean,
    sectorName: string
  ): string {
    const hasData = f.revenueGrowth !== null || f.epsGrowth !== null;
    if (!hasData) return 'Insufficient growth data available. Score reflects neutral baseline.';

    const method = usePercentile ? ` (sector-percentile vs ${sectorName} peers)` : '';

    if (score >= 80) {
      const parts: string[] = [];
      if (f.revenueGrowth !== null && f.revenueGrowth >= 0.08) parts.push('strong revenue expansion');
      if (f.epsGrowth !== null && f.epsGrowth >= 0.10) parts.push('robust EPS growth');
      return `Exceptional growth profile${method}: ${parts.join(', ')}. Growth trajectory indicates strong business momentum.`;
    }

    if (score >= 60) {
      return `Solid growth across key metrics${method}. Revenue and earnings expansion are tracking above market averages.`;
    }

    if (score >= 40) {
      return `Moderate growth profile${method}. Some metrics show expansion while others indicate deceleration.`;
    }

    return `Weak growth metrics${method}. Revenue and earnings may be contracting. Requires closer examination.`;
  }
}

export const growthEngine = new GrowthEngine();
