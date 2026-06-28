/**
 * Financial Intelligence Engine
 *
 * Evaluates a company's financial health across three dimensions:
 *   1. Quality  — profitability & capital efficiency
 *   2. Growth   — revenue & earnings trajectory
 *   3. Leverage — balance-sheet risk
 *
 * Produces a normalised 0–100 score and detailed reasoning.
 */

import type { IntelligenceInput, FinancialEngineOutput } from '../types';
import { clampScore, confidenceWeight, toScoreBand } from '../scoring';

export class FinancialEngine {
  /**
   * Analyse financial fundamentals.
   *
   * Scoring breakdown:
   *   Quality  0–40 pts  (ROE, ROA, ROIC, margins)
   *   Growth   0–35 pts  (revenue, profit, EPS, FCF growth)
   *   Leverage 0–25 pts  (D/E, coverage, current ratio)
   *   ─────────────────
   *   Raw max 100 pts → normalised 0–100
   */
  analyze(input: IntelligenceInput): FinancialEngineOutput {
    const fin = input.financials;

    // ── Dimension scores ──────────────────────────────────────────
    const quality = this.scoreQuality(fin);
    const growth = this.scoreGrowth(fin);
    const leverage = this.scoreLeverage(fin);

    const rawTotal = quality.points + growth.points + leverage.points;
    const normalised = clampScore(rawTotal);

    // ── Data completeness & confidence ─────────────────────────────
    const requiredFields = [
      fin.roe, fin.roa, fin.roic,
      fin.operatingMargin, fin.netMargin,
      fin.revenueGrowth, fin.epsGrowth, fin.fcfGrowth,
      fin.debtToEquity, fin.currentRatio, fin.interestCoverage,
    ];
    const dataCompleteness = confidenceWeight(requiredFields, 11);

    // Module alignment: low variance = high signal agreement
    const alignment = this.moduleAlignment(quality.points, growth.points, leverage.points);
    const confidence = Math.min(0.99, dataCompleteness * 0.6 + alignment * 0.4);

    // ── Reasoning ─────────────────────────────────────────────────
    const reasoning = this.buildReasoning(
      normalised, quality, growth, leverage
    );

    return {
      score: normalised,
      qualityScore: quality.normalised,
      growthScore: growth.normalised,
      debtScore: leverage.normalised,
      confidence: Math.round(confidence * 100) / 100,
      dataCompleteness: Math.round(dataCompleteness * 100) / 100,
      reasoning,
    };
  }

  // ── Quality (0–40) ──────────────────────────────────────────────

  private scoreQuality(fin: IntelligenceInput['financials']): ScoredDim {
    let points = 0;

    // ROE (0–10)
    if (fin.roe !== null && fin.roe !== undefined) {
      if (fin.roe >= 18) points += 10;
      else if (fin.roe >= 15) points += 8;
      else if (fin.roe >= 12) points += 6;
      else if (fin.roe >= 8) points += 4;
      else if (fin.roe >= 5) points += 2;
    }

    // ROA (0–6)
    if (fin.roa !== null && fin.roa !== undefined) {
      if (fin.roa >= 8) points += 6;
      else if (fin.roa >= 5) points += 4;
      else if (fin.roa >= 3) points += 2;
    }

    // ROIC (0–6)
    if (fin.roic !== null && fin.roic !== undefined) {
      if (fin.roic >= 15) points += 6;
      else if (fin.roic >= 12) points += 5;
      else if (fin.roic >= 10) points += 4;
      else if (fin.roic >= 7) points += 2;
    }

    // Operating margin (0–8)
    if (fin.operatingMargin !== null && fin.operatingMargin !== undefined) {
      if (fin.operatingMargin >= 20) points += 8;
      else if (fin.operatingMargin >= 15) points += 6;
      else if (fin.operatingMargin >= 10) points += 4;
      else if (fin.operatingMargin >= 5) points += 2;
    }

    // Net margin (0–6)
    if (fin.netMargin !== null && fin.netMargin !== undefined) {
      if (fin.netMargin >= 15) points += 6;
      else if (fin.netMargin >= 10) points += 5;
      else if (fin.netMargin >= 7) points += 4;
      else if (fin.netMargin >= 5) points += 2;
    }

    // Gross margin (0–4)
    if (fin.grossMargin !== null && fin.grossMargin !== undefined) {
      if (fin.grossMargin >= 50) points += 4;
      else if (fin.grossMargin >= 35) points += 3;
      else if (fin.grossMargin >= 20) points += 2;
      else if (fin.grossMargin >= 10) points += 1;
    }

    return { raw: points, points, normalised: clampScore((points / 40) * 100) };
  }

  // ── Growth (0–35) ───────────────────────────────────────────────

  private scoreGrowth(fin: IntelligenceInput['financials']): ScoredDim {
    let points = 0;

    // Revenue growth (0–12)
    if (fin.revenueGrowth !== null && fin.revenueGrowth !== undefined) {
      if (fin.revenueGrowth >= 20) points += 12;
      else if (fin.revenueGrowth >= 15) points += 10;
      else if (fin.revenueGrowth >= 10) points += 8;
      else if (fin.revenueGrowth >= 7) points += 6;
      else if (fin.revenueGrowth >= 5) points += 4;
      else if (fin.revenueGrowth > 0) points += 2;
    }

    // EPS growth (0–10)
    if (fin.epsGrowth !== null && fin.epsGrowth !== undefined) {
      if (fin.epsGrowth >= 25) points += 10;
      else if (fin.epsGrowth >= 20) points += 9;
      else if (fin.epsGrowth >= 15) points += 7;
      else if (fin.epsGrowth >= 10) points += 5;
      else if (fin.epsGrowth >= 7) points += 3;
      else if (fin.epsGrowth > 0) points += 1;
    }

    // Profit growth (0–7)
    if (fin.profitGrowth !== null && fin.profitGrowth !== undefined) {
      if (fin.profitGrowth >= 20) points += 7;
      else if (fin.profitGrowth >= 15) points += 5;
      else if (fin.profitGrowth >= 10) points += 3;
      else if (fin.profitGrowth > 0) points += 1;
    }

    // FCF growth (0–6)
    if (fin.fcfGrowth !== null && fin.fcfGrowth !== undefined) {
      if (fin.fcfGrowth >= 25) points += 6;
      else if (fin.fcfGrowth >= 15) points += 5;
      else if (fin.fcfGrowth >= 10) points += 3;
      else if (fin.fcfGrowth > 0) points += 1;
    }

    return { raw: points, points, normalised: clampScore((points / 35) * 100) };
  }

  // ── Leverage (0–25) ─────────────────────────────────────────────

  private scoreLeverage(fin: IntelligenceInput['financials']): ScoredDim {
    let points = 25; // start perfect, deduct

    // Debt-to-equity (deduct up to 10)
    if (fin.debtToEquity !== null && fin.debtToEquity !== undefined) {
      if (fin.debtToEquity > 200) points -= 10;
      else if (fin.debtToEquity > 100) points -= 6;
      else if (fin.debtToEquity > 50) points -= 3;
    }

    // Interest coverage (deduct up to 8)
    if (fin.interestCoverage !== null && fin.interestCoverage !== undefined) {
      if (fin.interestCoverage < 1.5) points -= 8;
      else if (fin.interestCoverage < 2.5) points -= 5;
      else if (fin.interestCoverage < 4) points -= 3;
    }

    // Current ratio (deduct up to 7)
    if (fin.currentRatio !== null && fin.currentRatio !== undefined) {
      if (fin.currentRatio < 0.8) points -= 7;
      else if (fin.currentRatio < 1.0) points -= 4;
      else if (fin.currentRatio < 1.5) points -= 2;
    }

    points = Math.max(0, points);
    return { raw: points, points, normalised: clampScore((points / 25) * 100) };
  }

  // ── Alignment ───────────────────────────────────────────────────

  private moduleAlignment(q: number, g: number, l: number): number {
    const qn = q / 40;
    const gn = g / 35;
    const ln = l / 25;
    const variance = Math.abs(qn - gn) + Math.abs(gn - ln) + Math.abs(ln - qn);
    return Math.max(0, 1 - variance / 3);
  }

  // ── Reasoning ───────────────────────────────────────────────────

  private buildReasoning(
    score: number,
    quality: ScoredDim,
    growth: ScoredDim,
    leverage: ScoredDim
  ): string {
    const band = toScoreBand(score);
    const parts: string[] = [];

    if (quality.normalised >= 70) parts.push('strong profitability and capital efficiency');
    else if (quality.normalised >= 50) parts.push('adequate profitability');
    else parts.push('weak profitability');

    if (growth.normalised >= 70) parts.push('robust growth trajectory');
    else if (growth.normalised >= 50) parts.push('moderate growth trajectory');
    else parts.push('slowing or negative growth');

    if (leverage.normalised >= 70) parts.push('conservative balance sheet');
    else if (leverage.normalised >= 50) parts.push('manageable leverage');
    else parts.push('elevated financial leverage');

    let summary = '';
    if (score >= 80) summary = 'Financial fundamentals are excellent.';
    else if (score >= 65) summary = 'Financial fundamentals are solid.';
    else if (score >= 45) summary = 'Financial fundamentals are mixed.';
    else summary = 'Financial fundamentals warrant caution.';

    return `${parts.join('; ')}. ${summary}`;
  }
}

// ── Internal helper type ──────────────────────────────────────────

interface ScoredDim {
  raw: number;
  points: number;
  normalised: number;
}

export const financialEngine = new FinancialEngine();
