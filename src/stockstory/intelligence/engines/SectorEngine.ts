/**
 * Sector Intelligence Engine
 *
 * Evaluates sector tailwinds/headwinds and the stock's position within
 * its peer group. Uses sector metadata and relative comparisons.
 */

import type { IntelligenceInput, SectorEngineOutput } from '../types';
import { clampScore, confidenceWeight, toScoreBand } from '../scoring';

export class SectorEngine {
  analyze(input: IntelligenceInput): SectorEngineOutput {
    const sector = input.sector;
    const fin = input.financials;

    const sectorStrength = clampScore(sector.sectorStrength ?? 50);
    const tailwinds = this.scoreTailwinds(sector, fin);
    const headwinds = this.scoreHeadwinds(sector, fin);
    const peerCompare = this.peerComparison(fin);

    const rawScore = clampScore(
      sectorStrength * 0.3 + tailwinds * 0.25 + (100 - headwinds) * 0.25 + peerCompare * 0.2
    );

    const requiredFields = [sector.sectorStrength, sector.sectorPe, sector.sectorAvgGrowth];
    const dc = confidenceWeight(requiredFields, 3);
    const confidence = Math.min(0.99, dc);

    const reasoning = this.buildReasoning(rawScore, sector, tailwinds, headwinds);

    return {
      score: rawScore,
      sectorStrength,
      peerPercentile: clampScore(peerCompare),
      peerCount: 0, // populated externally when universe data is available
      tailwindScore: tailwinds,
      headwindScore: headwinds,
      confidence: Math.round(confidence * 100) / 100,
      reasoning,
    };
  }

  // ── Tailwinds (0–100) ───────────────────────────────────────────

  private scoreTailwinds(
    sector: IntelligenceInput['sector'],
    fin: IntelligenceInput['financials']
  ): number {
    let score = 50; // baseline
    if (sector.sectorMomentum === 'accelerating') score += 20;
    else if (sector.sectorMomentum === 'steady') score += 10;
    else score -= 10;

    if (sector.sectorStrength !== null && sector.sectorStrength >= 60) score += 10;
    if (sector.sectorAvgGrowth !== null && sector.sectorAvgGrowth > 10) score += 10;
    if (fin.revenueGrowth !== null && sector.sectorAvgGrowth !== null && fin.revenueGrowth > sector.sectorAvgGrowth)
      score += 10; // company outperforming sector

    return clampScore(score);
  }

  // ── Headwinds (0–100) ───────────────────────────────────────────

  private scoreHeadwinds(
    sector: IntelligenceInput['sector'],
    fin: IntelligenceInput['financials']
  ): number {
    let score = 0;
    if (sector.sectorMomentum === 'decelerating') score += 20;
    if (sector.sectorStrength !== null && sector.sectorStrength < 30) score += 15;
    if (sector.sectorAvgGrowth !== null && sector.sectorAvgGrowth < 3) score += 10;
    if (fin.revenueGrowth !== null && sector.sectorAvgGrowth !== null && fin.revenueGrowth < sector.sectorAvgGrowth * 0.5)
      score += 10; // company significantly underperforming sector

    return clampScore(score);
  }

  // ── Peer comparison (0–100) ─────────────────────────────────────

  private peerComparison(fin: IntelligenceInput['financials']): number {
    // Simple heuristic vs assumed sector medians
    let score = 50; // at peer median

    if (fin.roe !== null && fin.roe > 15) score += 10;
    else if (fin.roe !== null && fin.roe < 5) score -= 10;

    if (fin.operatingMargin !== null && fin.operatingMargin > 15) score += 10;
    else if (fin.operatingMargin !== null && fin.operatingMargin < 5) score -= 10;

    if (fin.revenueGrowth !== null && fin.revenueGrowth > 12) score += 10;
    else if (fin.revenueGrowth !== null && fin.revenueGrowth < 0) score -= 10;

    if (fin.debtToEquity !== null && fin.debtToEquity < 30) score += 10;
    else if (fin.debtToEquity !== null && fin.debtToEquity > 100) score -= 10;

    return clampScore(score);
  }

  private buildReasoning(
    score: number,
    sector: IntelligenceInput['sector'],
    tailwinds: number,
    headwinds: number
  ): string {
    const band = toScoreBand(score);
    const parts: string[] = [];
    parts.push(`${sector.name} sector`);
    if (tailwinds >= 60) parts.push('benefiting from sector tailwinds');
    if (headwinds >= 40) parts.push('facing sector headwinds');
    if (score >= 60) parts.push('company is well-positioned within its peer group');
    else parts.push('company lags peer group on key metrics');
    return `Sector ${band}: ${parts.join('; ')}.`;
  }
}

export const sectorEngine = new SectorEngine();
