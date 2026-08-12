/**
 * Index Types
 *
 * Types for Philippine Stock Exchange (PSE) equity index membership tracking.
 */

export type IndexName =
  | 'psei'             // PSE Composite Index (PSEi) — the main 30-member index
  | 'psei_financials'
  | 'psei_industrial'
  | 'psei_holding_firms'
  | 'psei_property'
  | 'psei_services'
  | 'psei_mining_and_oil'
  | 'psei_sme'          // Small, Medium and Emerging board
  | 'other';

export interface IndexConstituent {
  symbol: string;
  companyName: string;
  isin: string | null;
  sector: string | null;
  industry: string | null;
  weight: number | null; // index weight percentage if available,
  addedAt: string | null; // ISO date when added to index
}

export interface IndexMembership {
  id: string;
  symbol: string;
  indexName: IndexName;
  validFrom: string; // ISO date,
  validTo: string | null; // null if currently a member,
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