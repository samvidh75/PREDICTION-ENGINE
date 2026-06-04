/**
 * Engine 1: Growth Engine
 * Weight: 25%
 * 
 * Inputs: Revenue Growth, EPS Growth, FCF Growth, Profit Growth
 * 
 * Extracts growth trajectory from financial statements.
 * Scores are normalized 0-100 where higher = stronger growth.
 */

import { EngineInputs, GrowthEngineOutput, clampScore, weightedAverage } from '../types';

export class GrowthEngine {
  evaluate(inputs: EngineInputs): GrowthEngineOutput {
    const { financials, historical } = inputs;

    // ── Sub-score 1: Revenue Growth (0-100) ─────────────────────────
    let revenueGrowthScore = 50;
    if (financials.revenueGrowth !== null) {
      const rg = financials.revenueGrowth;
      if (rg >= 0.20) revenueGrowthScore = 95;       // 20%+ explosive
      else if (rg >= 0.15) revenueGrowthScore = 85;  // 15-20% very strong
      else if (rg >= 0.10) revenueGrowthScore = 75;  // 10-15% strong
      else if (rg >= 0.05) revenueGrowthScore = 60;  // 5-10% moderate
      else if (rg >= 0) revenueGrowthScore = 40;     // 0-5% weak
      else if (rg >= -0.05) revenueGrowthScore = 25; // negative slight
      else revenueGrowthScore = 10;                   // sharp decline
    }

    // ── Sub-score 2: EPS Growth (0-100) ─────────────────────────────
    let epsGrowthScore = 50;
    if (financials.epsGrowth !== null) {
      const eg = financials.epsGrowth;
      if (eg >= 0.25) epsGrowthScore = 95;
      else if (eg >= 0.15) epsGrowthScore = 80;
      else if (eg >= 0.10) epsGrowthScore = 70;
      else if (eg >= 0.05) epsGrowthScore = 55;
      else if (eg >= 0) epsGrowthScore = 40;
      else if (eg >= -0.10) epsGrowthScore = 25;
      else epsGrowthScore = 10;
    }

    // ── Sub-score 3: FCF Growth (0-100) ─────────────────────────────
    let fcfGrowthScore = 50;
    if (financials.fcfGrowth !== null) {
      const fg = financials.fcfGrowth;
      if (fg >= 0.20) fcfGrowthScore = 95;
      else if (fg >= 0.10) fcfGrowthScore = 80;
      else if (fg >= 0.05) fcfGrowthScore = 65;
      else if (fg >= 0) fcfGrowthScore = 45;
      else if (fg >= -0.10) fcfGrowthScore = 25;
      else fcfGrowthScore = 10;
    }

    // ── Sub-score 4: Profit Growth (0-100) ──────────────────────────
    let profitGrowthScore = 50;
    if (financials.profitGrowth !== null) {
      const pg = financials.profitGrowth;
      if (pg >= 0.25) profitGrowthScore = 95;
      else if (pg >= 0.15) profitGrowthScore = 85;
      else if (pg >= 0.10) profitGrowthScore = 70;
      else if (pg >= 0.05) profitGrowthScore = 55;
      else if (pg >= 0) profitGrowthScore = 40;
      else if (pg >= -0.10) profitGrowthScore = 25;
      else profitGrowthScore = 10;
    }

    // ── Adjust based on growth factor from factor engine ────────────
    const factorAdjust = (inputs.factors.growthFactor - 50) * 0.3;

    // ── Composite score (weighted) ──────────────────────────────────
    const compositeScore = weightedAverage([
      { score: revenueGrowthScore + factorAdjust, weight: 3 },
      { score: epsGrowthScore + factorAdjust, weight: 3 },
      { score: fcfGrowthScore + factorAdjust, weight: 2 },
      { score: profitGrowthScore + factorAdjust, weight: 2 },
    ]);

    const commentary = this.generateCommentary(compositeScore, financials);

    return {
      score: compositeScore,
      revenueGrowth: financials.revenueGrowth ?? 0,
      epsGrowth: financials.epsGrowth ?? 0,
      fcfGrowth: financials.fcfGrowth ?? 0,
      profitGrowth: financials.profitGrowth ?? 0,
      commentary,
    };
  }

  private generateCommentary(score: number, f: EngineInputs['financials']): string {
    const hasData = f.revenueGrowth !== null || f.epsGrowth !== null;
    if (!hasData) return 'Insufficient growth data available. Score reflects neutral baseline.';

    if (score >= 80) {
      const parts: string[] = [];
      if (f.revenueGrowth !== null && f.revenueGrowth >= 0.10) parts.push('strong revenue expansion');
      if (f.epsGrowth !== null && f.epsGrowth >= 0.10) parts.push('robust EPS growth');
      if (f.fcfGrowth !== null && f.fcfGrowth >= 0.10) parts.push('healthy FCF generation');
      return `Exceptional growth profile: ${parts.join(', ')}. Growth trajectory indicates strong business momentum.`;
    }

    if (score >= 60) {
      return 'Solid growth across key metrics. Revenue and earnings expansion are tracking above market averages.';
    }

    if (score >= 40) {
      return 'Moderate growth profile. Some metrics show expansion while others indicate deceleration.';
    }

    return 'Weak growth metrics. Revenue and earnings may be contracting. Requires closer examination.';
  }
}

export const growthEngine = new GrowthEngine();
