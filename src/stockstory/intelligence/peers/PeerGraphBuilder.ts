/**
 * Peer Graph Builder
 *
 * Builds a PeerGraph for a focus company — comparing it to sector peers
 * and ranking it across key dimensions. Works with CompanyIntelligenceProfile
 * to enable cross-company comparison.
 *
 * Deterministic: uses available data, no fake peers or rankings.
 */

import type { IntelligenceInput } from '../../types';
import type { CompanyIntelligenceProfile } from '../company/CompanyTypes';
import type {
  PeerGraph,
  PeerNode,
  PeerRanking,
  PeerStats,
  PeerComparisonNarrative,
} from './PeerTypes';

export class PeerGraphBuilder {
  /**
   * Build a peer graph for a focus company given a list of peer profiles.
   * If no peers are available, returns a minimal graph with the focus company only.
   */
  build(
    focusProfile: CompanyIntelligenceProfile,
    peerProfiles: CompanyIntelligenceProfile[],
  ): PeerGraph {
    const peers = this.buildPeerNodes(focusProfile, peerProfiles);
    const rankings = this.buildRankings(focusProfile, peers);
    const stats = this.buildStats(focusProfile, peers, rankings);
    const comparison = this.buildNarrative(focusProfile, rankings, stats);

    return {
      focusCompany: focusProfile.symbol,
      focusExchange: focusProfile.exchange,
      generatedAt: new Date().toISOString(),
      peers,
      rankings,
      peerStats: stats,
      comparison,
    };
  }

  /**
   * Build a self-only peer graph when no peers are available.
   */
  buildSelfOnly(input: IntelligenceInput, focusProfile: CompanyIntelligenceProfile): PeerGraph {
    return this.build(focusProfile, []);
  }

  // ── Peer node construction ──────────────────────────────────

  private buildPeerNodes(
    focus: CompanyIntelligenceProfile,
    peers: CompanyIntelligenceProfile[],
  ): PeerNode[] {
    return peers.map(peer => ({
      symbol: peer.symbol,
      exchange: peer.exchange,
      similarityScore: this.computeSimilarity(focus, peer),
      profile: peer,
    })).sort((a, b) => b.similarityScore - a.similarityScore);
  }

  private computeSimilarity(
    a: CompanyIntelligenceProfile,
    b: CompanyIntelligenceProfile,
  ): number {
    let score = 0;
    let count = 0;

    // Same sector = high base similarity
    if (a.identity.sector === b.identity.sector) score += 0.4;
    count += 1;

    // Similar market cap bucket
    if (a.identity.marketCapBucket === b.identity.marketCapBucket) score += 0.2;
    count += 1;

    // Similar growth profile
    const aGrowth = a.growth.revenueCAGR;
    const bGrowth = b.growth.revenueCAGR;
    if (aGrowth !== null && bGrowth !== null) {
      const diff = Math.abs(aGrowth - bGrowth);
      if (diff < 5) score += 0.2;
      else if (diff < 10) score += 0.1;
      count += 1;
    }

    // Similar quality
    const aQ = a.aggregate.overall;
    const bQ = b.aggregate.overall;
    const qDiff = Math.abs(aQ - bQ);
    if (qDiff < 10) score += 0.2;
    else if (qDiff < 20) score += 0.1;
    count += 1;

    return count > 0 ? Math.min(1, Math.round((score / Math.max(count, 0.4)) * 100) / 100) : 0.5;
  }

  // ── Rankings ────────────────────────────────────────────────

  private buildRankings(
    focus: CompanyIntelligenceProfile,
    peers: PeerNode[],
  ): PeerRanking[] {
    const dimensions = [
      { key: 'roe', label: 'ROE', getValue: (p: CompanyIntelligenceProfile) => p.fundamentals.roe },
      { key: 'roic', label: 'ROIC', getValue: (p: CompanyIntelligenceProfile) => p.fundamentals.roic },
      { key: 'opMargin', label: 'Operating Margin', getValue: (p: CompanyIntelligenceProfile) => p.fundamentals.operatingMargin },
      { key: 'debtEquity', label: 'Debt/Equity', getValue: (p: CompanyIntelligenceProfile) => p.fundamentals.debtToEquity, lowerIsBetter: true },
      { key: 'revGrowth', label: 'Revenue Growth', getValue: (p: CompanyIntelligenceProfile) => p.fundamentals.revenueGrowth3y },
      { key: 'pe', label: 'PE Ratio', getValue: (p: CompanyIntelligenceProfile) => p.fundamentals.peRatio, lowerIsBetter: true },
    ];

    const allProfiles = [focus, ...peers.map(p => p.profile)];

    return dimensions.map(dim => {
      const focusVal = dim.getValue(focus);

      const peerValues = peers
        .map(p => ({ val: dim.getValue(p.profile), sym: p.symbol }))
        .filter(v => v.val !== null)
        .map(v => v.val as number);

      if (focusVal === null || peerValues.length === 0) {
        return {
          dimension: dim.label,
          focusValue: focusVal,
          peerMedian: null,
          percentile: null,
          rank: null,
          totalPeers: peerValues.length + 1,
          interpretation: 'insufficient_data',
        };
      }

      const allValues = [focusVal, ...peerValues];
      const sorted = dim.lowerIsBetter
        ? [...allValues].sort((a, b) => a - b)
        : [...allValues].sort((a, b) => b - a);

      const rank = sorted.indexOf(focusVal) + 1;
      const percentile = Math.round((1 - (rank - 1) / allValues.length) * 100);

      let interpretation: PeerRanking['interpretation'];
      if (percentile >= 80) interpretation = 'leading';
      else if (percentile >= 60) interpretation = 'above_average';
      else if (percentile >= 40) interpretation = 'average';
      else if (percentile >= 20) interpretation = 'below_average';
      else interpretation = 'lagging';

      const peerMedian = peerValues.length > 0
        ? peerValues.sort((a, b) => a - b)[Math.floor(peerValues.length / 2)]
        : null;

      return {
        dimension: dim.label,
        focusValue: focusVal,
        peerMedian,
        percentile,
        rank,
        totalPeers: allValues.length,
        interpretation,
      };
    });
  }

  // ── Stats ───────────────────────────────────────────────────

  private buildStats(
    focus: CompanyIntelligenceProfile,
    peers: PeerNode[],
    rankings: PeerRanking[],
  ): PeerStats {
    const medians: Record<string, number | null> = {};
    for (const r of rankings) {
      medians[r.dimension] = r.peerMedian;
    }

    const percentiles = rankings
      .filter(r => r.percentile !== null)
      .map(r => r.percentile as number);

    const focusPercentile = percentiles.length > 0
      ? Math.round(percentiles.reduce((s, p) => s + p, 0) / percentiles.length)
      : 50;

    let bestPerformer: string | null = null;
    let bestScore: number | null = null;
    for (const peer of peers) {
      if (peer.profile.aggregate.overall > (bestScore ?? 0)) {
        bestPerformer = peer.symbol;
        bestScore = peer.profile.aggregate.overall;
      }
    }

    return {
      peerCount: peers.length,
      medians,
      focusCompanyPercentile: focusPercentile,
      bestPerformer,
      bestPerformerScore: bestScore !== null ? Math.round(bestScore) : null,
    };
  }

  // ── Narrative ───────────────────────────────────────────────

  private buildNarrative(
    focus: CompanyIntelligenceProfile,
    rankings: PeerRanking[],
    stats: PeerStats,
  ): PeerComparisonNarrative {
    const leaders = rankings.filter(r => r.interpretation === 'leading');
    const laggards = rankings.filter(r => r.interpretation === 'lagging' || r.interpretation === 'below_average');

    const headline = `${focus.symbol} ranks in the ${stats.focusCompanyPercentile}th percentile among ${stats.peerCount} peers in the ${focus.identity.sector} sector.`;

    const strengths = leaders.map(r =>
      `${r.dimension}: ${r.focusValue} (top ${100 - (r.percentile ?? 0)}%)`
    );

    const gaps = laggards.map(r =>
      `${r.dimension}: ${r.focusValue} vs peer median ${r.peerMedian}`
    );

    const sectorPosition = stats.focusCompanyPercentile >= 70
      ? 'Strong competitive position relative to sector peers.'
      : stats.focusCompanyPercentile >= 40
        ? 'Competitive position within sector norms.'
        : 'Position may warrant deeper sector-context research.';

    return { headline, strengths, gaps, sectorPosition };
  }
}

export const peerGraphBuilder = new PeerGraphBuilder();
