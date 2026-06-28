/**
 * Portfolio Thesis Monitor Engine
 *
 * Tracks active theses across a portfolio of stocks.
 * Monitors conviction, signal changes, and thesis lifecycle states.
 *
 * STRICTLY COMPLIANT: No performance tracking, no P&L, no recommendations.
 * Only thesis-level observations and conviction tracking.
 */

import type { ParsedFilter } from '../scanner/NLScannerEngine';

export interface PortfolioThesisEntry {
  symbol: string;
  thesisId: string;
  thesisState: 'forming' | 'validating' | 'confirmed' | 'weakening' | 'invalidated' | 'no_thesis';
  conviction: 'high_conviction' | 'watch' | 'needs_review' | 'avoid_for_now' | 'insufficient_information';
  lastUpdated: string;
  keyObservations: string[];
  activeConcerns: string[];
  dataPointsCollected: number;
}

export interface PortfolioReport {
  generatedAt: string;
  entries: PortfolioThesisEntry[];
  activeThesisCount: number;
  weakeningCount: number;
  invalidatedCount: number;
  summary: string;
}

/**
 * Portfolio-level metrics (NO performance or P&L)
 */
export interface PortfolioSnapshot {
  generatedAt: string;
  totalEntries: number;
  convictionBreakdown: Record<string, number>;
  stateBreakdown: Record<string, number>;
  averageDataPoints: number;
  summary: string;
}

export class PortfolioEngine {
  /**
   * Build a portfolio report from thesis entries
   */
  buildReport(entries: PortfolioThesisEntry[]): PortfolioReport {
    const active = entries.filter(e => ['confirmed', 'validating', 'forming'].includes(e.thesisState));
    const weakening = entries.filter(e => e.thesisState === 'weakening');
    const invalidated = entries.filter(e => e.thesisState === 'invalidated');

    return {
      generatedAt: new Date().toISOString(),
      entries,
      activeThesisCount: active.length,
      weakeningCount: weakening.length,
      invalidatedCount: invalidated.length,
      summary: this.buildSummary(entries),
    };
  }

  /**
   * Create a portfolio snapshot with conviction and state breakdowns
   */
  buildSnapshot(entries: PortfolioThesisEntry[]): PortfolioSnapshot {
    const convictionBreakdown: Record<string, number> = {};
    const stateBreakdown: Record<string, number> = {};

    for (const e of entries) {
      convictionBreakdown[e.conviction] = (convictionBreakdown[e.conviction] || 0) + 1;
      stateBreakdown[e.thesisState] = (stateBreakdown[e.thesisState] || 0) + 1;
    }

    const avgDataPoints = entries.length > 0
      ? Math.round(entries.reduce((s, e) => s + e.dataPointsCollected, 0) / entries.length)
      : 0;

    return {
      generatedAt: new Date().toISOString(),
      totalEntries: entries.length,
      convictionBreakdown,
      stateBreakdown,
      averageDataPoints: avgDataPoints,
      summary: `${entries.length} thesis entries tracked. ${stateBreakdown.confirmed || 0} confirmed, ${stateBreakdown.invalidated || 0} invalidated.`,
    };
  }

  /**
   * Identify entries needing review
   */
  identifyReviewCandidates(entries: PortfolioThesisEntry[]): PortfolioThesisEntry[] {
    return entries.filter(e =>
      e.thesisState === 'weakening' ||
      e.thesisState === 'invalidated' ||
      e.conviction === 'needs_review' ||
      e.conviction === 'insufficient_information'
    );
  }

  /**
   * Update a thesis entry with new observations
   */
  updateEntry(
    entry: PortfolioThesisEntry,
    newObservations: string[],
    newConcerns: string[],
  ): PortfolioThesisEntry {
    const updated = { ...entry };
    updated.keyObservations = [
      ...new Set([...entry.keyObservations, ...newObservations]),
    ].slice(-20); // Keep last 20
    updated.activeConcerns = [
      ...new Set([...entry.activeConcerns, ...newConcerns]),
    ].slice(-10);
    updated.dataPointsCollected += newObservations.length + newConcerns.length;
    updated.lastUpdated = new Date().toISOString();

    // Auto-downgrade conviction if concerns outweigh observations
    if (updated.activeConcerns.length > updated.keyObservations.length * 0.5) {
      if (updated.conviction === 'high_conviction') updated.conviction = 'watch';
      else if (updated.conviction === 'watch') updated.conviction = 'needs_review';
    }

    return updated;
  }

  private buildSummary(entries: PortfolioThesisEntry[]): string {
    const total = entries.length;
    if (total === 0) return 'No thesis entries in portfolio.';

    const active = entries.filter(e => ['confirmed', 'validating', 'forming'].includes(e.thesisState)).length;
    const atRisk = entries.filter(e => e.thesisState === 'weakening' || e.thesisState === 'invalidated').length;

    let summary = `${active}/${total} thesis entries active.`;
    if (atRisk > 0) summary += ` ${atRisk} require attention.`;
    return summary;
  }
}

export const portfolioEngine = new PortfolioEngine();
