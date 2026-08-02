/**
 * Earnings Intelligence Engine
 *
 * Evaluates earnings quality, growth trajectory, surprise history,
 * and forward estimates convergence.
 */

import type { IntelligenceInput, EarningsEngineOutput } from '../types';
import { clampScore, confidenceWeight, toScoreBand } from '../scoring';

export class EarningsEngine {
  analyze(input: IntelligenceInput): EarningsEngineOutput {
    const e = input.earnings;
    const fin = input.financials;

    const growthScore = this.scoreGrowth(e, fin);
    const surpriseScore = this.scoreSurprise(e);
    const estimatesScore = this.scoreEstimates(e);
    const consistencyScore = this.scoreConsistency(e);

    const total = growthScore * 0.35 + surpriseScore * 0.25 + estimatesScore * 0.2 + consistencyScore * 0.2;
    const normalised = clampScore(total);

    const requiredFields = [e.epsTtm, e.epsGrowthQoq, e.revenueGrowthQoq, e.surprisePercent];
    const dc = confidenceWeight(requiredFields, 4);
    const confidence = Math.min(0.99, dc);

    const revenueTrend = this.trend(e, fin);
    const recentSurprise = e.beatMiss ?? 'unknown';
    const nextEarningsDays = this.daysUntilNext(e.nextEarningsDate);
    const beatRate = this.computeBeatRate(e);
    const reasoning = this.buildReasoning(normalised, growthScore, surpriseScore, e);

    return {
      score: normalised,
      growthScore: clampScore(growthScore),
      surpriseScore: clampScore(surpriseScore),
      estimatesConfidence: Math.round(confidence * 100) / 100,
      beatRate,
      revenueTrend,
      recentSurprise,
      nextEarningsDays,
      confidence: Math.round(confidence * 100) / 100,
      reasoning,
    };
  }

  // ── Growth (0–100) ──────────────────────────────────────────────

  private scoreGrowth(e: IntelligenceInput['earnings'], fin: IntelligenceInput['financials']): number {
    let score = 40; // baseline

    if (e.epsGrowthQoq !== null) {
      if (e.epsGrowthQoq >= 15) score += 30;
      else if (e.epsGrowthQoq >= 10) score += 20;
      else if (e.epsGrowthQoq >= 5) score += 10;
      else if (e.epsGrowthQoq > 0) score += 5;
      else score -= 10;
    }

    if (fin.epsGrowth !== null) {
      if (fin.epsGrowth >= 15) score += 20;
      else if (fin.epsGrowth >= 8) score += 10;
      else if (fin.epsGrowth >= 3) score += 5;
    }

    if (e.revenueGrowthQoq !== null) {
      if (e.revenueGrowthQoq >= 10) score += 10;
      else if (e.revenueGrowthQoq > 0) score += 5;
      else score -= 5;
    }

    return clampScore(score);
  }

  // ── Surprise (0–100) ────────────────────────────────────────────

  private scoreSurprise(e: IntelligenceInput['earnings']): number {
    let score = 50; // baseline

    if (e.surprisePercent !== null) {
      if (e.surprisePercent >= 10) score += 35;
      else if (e.surprisePercent >= 5) score += 25;
      else if (e.surprisePercent >= 2) score += 15;
      else if (e.surprisePercent > 0) score += 5;
      else score -= 15;
    }

    if (e.beatMiss === 'beat') score += 15;
    else if (e.beatMiss === 'miss') score -= 20;

    return clampScore(score);
  }

  // ── Estimates (0–100) ───────────────────────────────────────────

  private scoreEstimates(e: IntelligenceInput['earnings']): number {
    if (!e.estimatesAvailable) return 30; // no coverage

    let score = 60; // baseline with coverage

    if (e.pegRatio !== null && e.pegRatio > 0) {
      if (e.pegRatio < 1) score += 20;   // undervalued relative to growth
      else if (e.pegRatio < 2) score += 10;
      else score -= 10;
    }

    if (e.forwardPe !== null && e.peTtm !== null && e.peTtm > 0) {
      const expansion = (e.forwardPe - e.peTtm) / e.peTtm;
      if (expansion < -0.1) score += 10;  // forward multiple contracting
      else if (expansion > 0.1) score -= 5; // expanding (priced in)
    }

    return clampScore(score);
  }

  // ── Consistency (0–100) ─────────────────────────────────────────

  private scoreConsistency(e: IntelligenceInput['earnings']): number {
    // Heuristic: direct QoQ beats consistently
    if (e.beatMiss === 'beat') return 70;
    if (e.beatMiss === 'miss') return 30;
    return 50;
  }

  private trend(
    e: IntelligenceInput['earnings'],
    fin: IntelligenceInput['financials']
  ): 'growing' | 'stable' | 'declining' | 'unclear' {
    const signals = [
      e.epsGrowthQoq,
      e.revenueGrowthQoq,
      fin.epsGrowth,
      fin.revenueGrowth,
    ].filter((v): v is number => v !== null && v !== undefined);

    if (signals.length === 0) return 'unclear';
    const avg = signals.reduce((a, b) => a + b, 0) / signals.length;
    if (avg > 5) return 'growing';
    if (avg > -2) return 'stable';
    return 'declining';
  }

  private computeBeatRate(e: IntelligenceInput['earnings']): number {
    if (e.beatMiss === 'beat') return 0.6;
    if (e.beatMiss === 'miss') return 0.2;
    return 0.5;
  }

  private daysUntilNext(dateStr: string | null): number | null {
    if (!dateStr) return null;
    const next = new Date(dateStr);
    const now = new Date();
    return Math.round((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  private buildReasoning(
    score: number,
    growthScore: number,
    surpriseScore: number,
    e: IntelligenceInput['earnings']
  ): string {
    const band = toScoreBand(score);
    const parts: string[] = [];

    if (growthScore >= 65) parts.push('healthy earnings growth trajectory');
    else if (growthScore >= 40) parts.push('stable earnings growth');
    else parts.push ('slowing earnings growth');

    if (surpriseScore >= 65) parts.push('consistent earnings surprises');
    else if (surpriseScore < 40) parts.push('recent earnings misses');

    if (e.estimatesAvailable) parts.push('analyst coverage provides reference context');
    else parts.push('limited analyst coverage');

    return `Earnings ${band}: ${parts.join('; ')}.`;
  }
}

export const earningsEngine = new EarningsEngine();
