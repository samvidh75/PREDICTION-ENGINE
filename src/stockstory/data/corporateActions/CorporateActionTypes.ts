/**
 * Corporate Action Types (new module)
 *
 * Types for the unified corporate action ingestion pipeline.
 * Works alongside corporate-actions/ to provide end-to-end
 * ingestion, normalization, and event mapping.
 */

export type CorporateActionKind =
  | 'dividend'
  | 'bonus'
  | 'split'
  | 'rights'
  | 'buyback'
  | 'merger'
  | 'demerger'
  | 'delisting'
  | 'suspension'
  | 'name_change'
  | 'symbol_change'
  | 'face_value_change'
  | 'board_meeting'
  | 'agm_egm';

export type CorporateActionSubKind =
  | 'interim_dividend'
  | 'final_dividend'
  | 'special_dividend'
  | 'bonus_issue'
  | 'stock_split'
  | 'rights_issue'
  | 'open_market_buyback'
  | 'tender_buyback'
  | 'amalgamation'
  | 'arrangement'
  | 'voluntary_delisting'
  | 'compulsory_delisting';

export interface RawCorporateAction {
  symbol: string;
  companyName: string;
  kind: CorporateActionKind;
  subKind?: CorporateActionSubKind;
  announcementDate: string;
  exDate?: string;
  recordDate?: string;
  effectiveDate?: string;
  details: Record<string, unknown>;
  sourceId: string;
}

export interface CorporateAction {
  id: string;
  symbol: string;
  companyName: string;
  kind: CorporateActionKind;
  subKind?: CorporateActionSubKind;
  announcementDate: string;
  exDate: string | null;
  recordDate: string | null;
  effectiveDate: string | null;
  details: CorporateActionDetails | null;
  sourceIds: string[];
  verified: boolean;
  createdAt: string;
}

export interface CorporateActionDetails {
  amount?: number;
  percentage?: number;
  ratio?: string;
  price?: number;
  size?: number;
  type?: string;
  description?: string;
}

export interface CorporateActionAlert {
  symbol: string;
  kind: CorporateActionKind;
  announcementDate: string;
  exDate: string | null;
  summary: string;
  impact: 'positive' | 'negative' | 'neutral' | 'needs_review' | 'unknown';
}

export interface PublicCorporateActionSummary {
  kind: CorporateActionKind;
  date: string;
  summary: string;
}
