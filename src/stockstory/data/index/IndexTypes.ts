/**
 * Index Types
 *
 * Types for PSE equity index membership tracking.
 * Covers NSE and BSE indices.
 */

export type IndexName =
  | 'pse-index50'
  | 'pse-index_next_50'
  | 'pse-index_100'
  | 'pse-index_200'
  | 'pse-index_500'
  | 'pse-index_midcap_100'
  | 'pse-index_smallcap_100'
  | 'pse-index_bank'
  | 'pse-index_it'
  | 'pse-index_pharma'
  | 'pse-index_fmcg'
  | 'pse-index_auto'
  | 'pse-composite'
  | 'bse_100'
  | 'bse_200'
  | 'bse_500'
  | 'bse_midcap'
  | 'bse_smallcap'
  | 'other';

export interface IndexConstituent {
  symbol: string;
  companyName: string;
  isin: string | null;
  sector: string | null;
  industry: string | null;
  weight: number | null; // index weight percentage if available
  addedAt: string | null; // ISO date when added to index
}

export interface IndexMembership {
  id: string;
  symbol: string;
  indexName: IndexName;
  validFrom: string; // ISO date
  validTo: string | null; // null if currently a member
  sourceId: string;
  createdAt: string;
}

export interface IndexChangeEvent {
  id: string;
  indexName: IndexName;
  symbol: string;
  companyName: string;
  changeType: 'added' | 'removed' | 'rebalanced';
  effectiveDate: string;
  previousWeight: number | null;
  newWeight: number | null;
  reason: string | null;
  sourceId: string;
  detectedAt: string;
}