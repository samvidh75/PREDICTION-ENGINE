/**
 * Disclosure Types
 *
 * Types for bulk/block deals, insider transactions, SAST disclosures,
 * and other regulatory disclosures in the PSX market.
 */

export type DisclosureKind =
  | 'bulk_deal'
  | 'block_deal'
  | 'insider_trade'
  | 'sast_disclosure'
  | 'pledge_creation'
  | 'pledge_release'
  | 'promoter_transaction'
  | 'institutional_transaction';

export type DisclosureClassification =
  | 'acquisition'
  | 'disposal'
  | 'pledge'
  | 'pledge_release'
  | 'insider_buy'
  | 'insider_sell'
  | 'institutional_buy'
  | 'institutional_sell'
  | 'other';

export interface MarketDisclosure {
  id: string;
  symbol: string;
  companyName: string;
  disclosureKind: DisclosureKind;
  classification: DisclosureClassification;
  transactionDate: string;
  filingDate: string;
  transactingEntity: string;
  transactedQuantity: number | null;
  transactedValue: number | null;
  previousHolding: number | null;
  postHolding: number | null;
  price: number | null;
  isBuy: boolean;
  sourceId: string;
  notes: string | null;
}

export interface DisclosureEvent {
  id: string;
  symbol: string;
  disclosureKind: DisclosureKind;
  classification: DisclosureClassification;
  filingDate: string;
  description: string;
  impact: 'positive' | 'negative' | 'mixed' | 'neutral' | 'needs_review' | 'unknown';
  label: string;
  sourceId: string;
}
