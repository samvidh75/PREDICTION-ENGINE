/**
 * Corporate Actions Types
 *
 * PSE equity corporate actions including:
 * dividends, bonuses, splits, rights issues, buybacks,
 * mergers, delistings, and board meetings.
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
  | 'name_change'
  | 'face_value_change'
  | 'board_meeting'
  | 'agm_egm';

export interface CorporateAction {
  id: string;
  symbol: string;
  companyName: string;
  kind: CorporateActionKind;
  announcementDate: string;
  recordDate: string | null;
  exDate: string | null;
  effectiveDate: string | null;
  details: DividendDetails | BonusDetails | SplitDetails | RightsDetails | BuybackDetails | MergerDetails | DelistingDetails | null;
  sourceIds: string[];
  verified: boolean;
  notes?: string;
}

export interface DividendDetails {
  amountPerShare: number;
  percentage: number | null;
  dividendType: 'interim' | 'final' | 'special';
  fiscalYear: string;
  payoutDate: string | null;
}

export interface BonusDetails {
  ratio: string; // e.g., "1:1", "2:1"
  bonusShares: number;
  fiscalYear: string | null;
}

export interface SplitDetails {
  ratio: string; // e.g., "10:1" (10 for 1)
  oldFaceValue: number;
  newFaceValue: number;
}

export interface RightsDetails {
  ratio: string;
  issuePrice: number;
  premium: number | null;
  issueSize: number | null; // in crores
  issueOpenDate: string | null;
  issueCloseDate: string | null;
}

export interface BuybackDetails {
  buybackType: 'tender' | 'open_market';
  buybackPrice: number;
  buybackSize: number; // in crores
  buybackOpenDate: string | null;
  buybackCloseDate: string | null;
}

export interface MergerDetails {
  targetCompany: string;
  targetSymbol: string | null;
  swapRatio: string | null;
  schemeApprovedDate: string | null;
}

export interface DelistingDetails {
  delistingPrice: number | null;
  exitWindowOpen: string | null;
  exitWindowClose: string | null;
  reason: string | null;
}

export interface CorporateActionCalendar {
  date: string;
  actions: CorporateAction[];
}
