/**
 * Peer Graph Types — Peer comparison and ranking
 */

import type { CompanyIntelligenceProfile } from '../company/CompanyTypes';

export interface PeerGraph {
  focusCompany: string;
  focusExchange: string;
  generatedAt: string;

  /** List of peers ranked by similarity */
  peers: PeerNode[];

  /** Focus company's ranking on each dimension */
  rankings: PeerRanking[];

  /** Peer group statistics */
  peerStats: PeerStats;

  /** Product-facing comparison narrative */
  comparison: PeerComparisonNarrative;
}

export interface PeerNode {
  symbol: string;
  exchange: string;
  similarityScore: number;        // 0-1 (how similar to focus company)
  profile: CompanyIntelligenceProfile;
}

export interface PeerRanking {
  dimension: string;               // e.g. "ROE", "Revenue Growth", "Operating Margin"
  focusValue: number | null;
  peerMedian: number | null;
  percentile: number | null;      // Where focus company ranks (0-100)
  rank: number | null;            // Absolute rank (1-based)
  totalPeers: number;
  interpretation: 'leading' | 'above_average' | 'average' | 'below_average' | 'lagging' | 'insufficient_data';
}

export interface PeerStats {
  peerCount: number;
  medians: Record<string, number | null>;
  focusCompanyPercentile: number;  // Overall composite percentile
  bestPerformer: string | null;
  bestPerformerScore: number | null;
}

export interface PeerComparisonNarrative {
  headline: string;
  strengths: string[];
  gaps: string[];
  sectorPosition: string;
}
