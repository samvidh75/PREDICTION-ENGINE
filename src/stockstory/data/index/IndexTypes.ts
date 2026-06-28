/**
 * Index Types
 *
 * Types for Indian equity index membership tracking.
 * Covers NSE and BSE indices.
 */

export type IndexName =
  | 'nifty50'
  | 'nifty_next_50'
  | 'nifty_100'
  | 'nifty_200'
  | 'nifty_500'
  | 'nifty_midcap_100'
  | 'nifty_smallcap_100'
  | 'nifty_bank'
  | 'nifty_it'
  | 'nifty_pharma'
  | 'nifty_fmcg'
  | 'nifty_auto'
  | 'sensex'
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