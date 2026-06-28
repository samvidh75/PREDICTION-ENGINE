/**
 * Valuation Intelligence Engine
 *
 * Evaluates whether a stock is fairly valued relative to earnings,
 * book value, cash flows, and dividends. Considers sector context
 * when available.
 *
 * Produces a 0–100 score where higher = reasonably/undervalued,
 * lower = overvalued relative to fundamentals.
 */

import type { IntelligenceInput, ValuationEngineOutput } from '../types';
import { clampScore, confidenceWeight, toScoreBand } from '../scoring';

export class ValuationEngine {
  analyze(input: IntelligenceInput): ValuationEngineOutput {
    const fin = input.financials;

    const pe = this.scorePe(fin.peRatio);
    const pb = this.scorePb(fin.pbRatio);
    const ev = this.scoreEvEbitda(fin.evEbitda);
    const fcf = this.scoreFcfYield(fin.fcfYield);
    const div = this.scoreDividend(fin.dividendYield);

    const total = pe.points + pb.points + ev.points + fcf.points + div.points;
    const normalised = clampScore(total);

    const requiredFields = [fin.peRatio, fin.pbRatio, fin.evEbitda, fin.fcfYield];
    const dc = confidenceWeight(requiredFields, 4);
    const confidence = Math.min(0.99, dc);

    const reasoning = this.buildReasoning(normalised, pe, pb, ev, fcf, div);

    return {
      score: normalised,
      peScore: pe.normalised,
      pbScore: pb.normalised,
      evEbitdaScore: ev.normalised,
      fcfYieldScore: fcf.normalised,
      dividendScore: div.normalised,
      confidence: Math.round(confidence * 100) / 100,
      reasoning,
    };
  }

  // ── P/E (0–25) ──────────────────────────────────────────────────

  private scorePe(pe: number | null): ScoredDim {
    if (pe === null || pe === undefined || pe <= 0) {
      return { raw: pe, points: 10, normalised: 40 }; // neutral
    }
    let points = 0;
    if (pe < 10) points = 25;       // undervalued
    else if (pe < 15) points = 22;
    else if (pe < 20) points = 18;
    else if (pe < 25) points = 14;
    else if (pe < 30) points = 10;
    else if (pe < 40) points = 6;
    else points = 2;                // very expensive
    return { raw: pe, points, normalised: clampScore((points / 25) * 100) };
  }

  // ── P/B (0–20) ──────────────────────────────────────────────────

  private scorePb(pb: number | null): ScoredDim {
    if (pb === null || pb === undefined || pb <= 0) {
      return { raw: pb, points: 10, normalised: 50 };
    }
    let points = 0;
    if (pb < 1.0) points = 20;
    else if (pb < 1.5) points = 18;
    else if (pb < 2.5) points = 14;
    else if (pb < 4.0) points = 10;
    else if (pb < 6.0) points = 6;
    else points = 2;
    return { raw: pb, points, normalised: clampScore((points / 20) * 100) };
  }

  // ── EV/EBITDA (0–20) ────────────────────────────────────────────

  private scoreEvEbitda(ev: number | null): ScoredDim {
    if (ev === null || ev === undefined || ev <= 0) {
      return { raw: ev, points: 10, normalised: 50 };
    }
    let points = 0;
    if (ev < 6) points = 20;
    else if (ev < 10) points = 17;
    else if (ev < 14) points = 13;
    else if (ev < 18) points = 9;
    else if (ev < 25) points = 5;
    else points = 2;
    return { raw: ev, points, normalised: clampScore((points / 20) * 100) };
  }

  // ── FCF Yield (0–20) ────────────────────────────────────────────

  private scoreFcfYield(yield_: number | null): ScoredDim {
    if (yield_ === null || yield_ === undefined) {
      return { raw: yield_, points: 8, normalised: 40 };
    }
    let points = 0;
    if (yield_ >= 6) points = 20;
    else if (yield_ >= 4) points = 17;
    else if (yield_ >= 2) points = 13;
    else if (yield_ > 0) points = 8;
    else points = 2; // negative FCF yield
    return { raw: yield_, points, normalised: clampScore((points / 20) * 100) };
  }

  // ── Dividend yield (0–15) ───────────────────────────────────────

  private scoreDividend(dy: number | null): ScoredDim {
    if (dy === null || dy === undefined || dy <= 0) {
      return { raw: dy, points: 0, normalised: 0 };
    }
    let points = 0;
    if (dy >= 3) points = 15;
    else if (dy >= 2) points = 12;
    else if (dy >= 1) points = 8;
    else points = 4;
    return { raw: dy, points, normalised: clampScore((points / 15) * 100) };
  }

  private buildReasoning(
    score: number,
    pe: ScoredDim, pb: ScoredDim,
    ev: ScoredDim, fcf: ScoredDim, div: ScoredDim
  ): string {
    const band = toScoreBand(score);
    const parts: string[] = [];

    if (pe.normalised >= 70) parts.push('P/E suggests undervaluation');
    else if (pe.normalised < 30) parts.push('P/E is elevated');

    if (pb.normalised >= 70) parts.push('P/B is attractive');
    else if (pb.normalised < 30) parts.push('P/B is high');

    if (fcf.normalised >= 70) parts.push('cash flow yield is strong');
    else if (fcf.normalised < 30) parts.push('FCF yield is weak');

    return `Valuation ${band}: ${parts.join('; ')}.`;
  }
}

interface ScoredDim {
  raw: number | null;
  points: number;
  normalised: number;
}

export const valuationEngine = new ValuationEngine();
