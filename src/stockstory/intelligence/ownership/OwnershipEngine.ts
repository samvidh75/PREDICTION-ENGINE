/**
 * Ownership Intelligence Engine
 *
 * Analyses shareholding patterns for Indian listed companies.
 * Tracks promoter, institutional, FII, DII, retail, and public holdings.
 * Identifies ownership changes that may signal thesis changes.
 */

import type { IntelligenceInput } from '../../types';
import { clampScore } from '../scoring';

export interface OwnershipReport {
  symbol: string;
  generatedAt: string;

  /** Current ownership breakdown */
  ownership: OwnershipBreakdown;

  /** Ownership quality score */
  qualityScore: number;

  /** Changes vs prior period */
  changes: OwnershipChange[];

  /** Assessment */
  assessment: string;
}

export interface OwnershipBreakdown {
  promoterHolding: number | null;
  institutionalHolding: number | null;
  fiiHolding: number | null;          // Foreign Institutional Investor
  diiHolding: number | null;          // Domestic Institutional Investor
  publicHolding: number | null;
  pledgedShares: number | null;
  insiderTrading: InsiderActivity | null;
}

export interface OwnershipChange {
  category: string;
  changePercent: number;              // change in holding %
  direction: 'increasing' | 'decreasing' | 'stable';
  significance: 'significant' | 'moderate' | 'minor';
  interpretation: string;
}

export interface InsiderActivity {
  recentTrades: number;               // count
  netBuyRatio: number | null;         // -1 to 1 (positive = net buying)
  significance: 'notable' | 'routine' | 'unknown';
}

export class OwnershipEngine {
  analyze(input: IntelligenceInput): OwnershipReport {
    const r = input.risks;
    const f = input.financials;

    const breakdown = this.buildBreakdown(r, f);
    const changes = this.detectChanges(r);
    const qualityScore = this.computeQuality(breakdown);
    const assessment = this.buildAssessment(breakdown, qualityScore);

    return {
      symbol: input.symbol,
      generatedAt: new Date().toISOString(),
      ownership: breakdown,
      qualityScore,
      changes,
      assessment,
    };
  }

  private buildBreakdown(
    r: IntelligenceInput['risks'],
    f: IntelligenceInput['financials'],
  ): OwnershipBreakdown {
    return {
      promoterHolding: r?.promoterHolding ?? null,
      institutionalHolding: r?.institutionalHolding ?? null,
      fiiHolding: null,        // Not available in current input — data mapper to fill
      diiHolding: null,
      publicHolding: r?.promoterHolding !== null && r?.institutionalHolding !== null
        ? Math.round((100 - r.promoterHolding - r.institutionalHolding) * 100) / 100
        : null,
      pledgedShares: r?.pledgedShares ?? null,
      insiderTrading: null,
    };
  }

  private detectChanges(r: IntelligenceInput['risks']): OwnershipChange[] {
    // OwnershipChange requires time-series data — not available in current input
    // Return empty — this is a future enhancement
    return [];
  }

  private computeQuality(b: OwnershipBreakdown): number {
    let score = 50;

    // Promoter holding in sweet spot
    if (b.promoterHolding !== null) {
      if (b.promoterHolding >= 25 && b.promoterHolding <= 55) score += 15;
      else if (b.promoterHolding > 55) score -= 10; // Too high = governance concern
      else if (b.promoterHolding < 15) score += 0;  // Too low = no skin in game
    }

    // Institutional presence is positive
    if (b.institutionalHolding !== null) {
      if (b.institutionalHolding > 40) score += 20;
      else if (b.institutionalHolding > 20) score += 10;
      else if (b.institutionalHolding > 5) score += 5;
    }

    // Pledged shares are negative
    if (b.pledgedShares !== null) {
      if (b.pledgedShares > 50) score -= 25;
      else if (b.pledgedShares > 25) score -= 15;
      else if (b.pledgedShares > 10) score -= 5;
    }

    return clampScore(score);
  }

  private buildAssessment(b: OwnershipBreakdown, qualityScore: number): string {
    const parts: string[] = [];

    if (b.promoterHolding !== null) {
      parts.push(`Promoter holding at ${b.promoterHolding}%`);
    }
    if (b.institutionalHolding !== null && b.institutionalHolding > 30) {
      parts.push(`Strong institutional presence at ${b.institutionalHolding}%`);
    }
    if (b.pledgedShares !== null && b.pledgedShares > 10) {
      parts.push(`${b.pledgedShares}% promoter pledge warrants attention`);
    }

    if (qualityScore >= 70) parts.push('Ownership structure appears constructive.');
    else if (qualityScore >= 50) parts.push('Ownership structure is adequate.');
    else parts.push('Ownership profile requires further review.');

    return parts.join('. ');
  }
}

export const ownershipEngine = new OwnershipEngine();
