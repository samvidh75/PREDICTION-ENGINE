/**
 * Filing Types
 *
 * Exchange filing intelligence for Philippine listed companies.
 * Covers PSE/PSE announcements, SEC filings, annual reports,
 * and insider trading disclosures.
 */

export type FilingType =
  | 'annual_report'
  | 'quarterly_result'
  | 'corp_announcement'
  | 'shareholding_pattern'
  | 'insider_trading'
  | 'board_meeting_notice'
  | 'agm_egm_notice'
  | 'press_release'
  | 'analyst_call_transcript'
  | 'credit_rating'
  | 'pledge_disclosure'
  | 'other';

export type FilingExchange = 'PSE' | 'PSE' | 'SEC' | 'MCA';

export interface ExchangeFiling {
  id: string;
  symbol: string;
  companyName: string;
  filingType: FilingType;
  exchange: FilingExchange;
  filingDate: string;
  filingNumber: string | null;
  subject: string;
  summary: string | null;
  pdfUrl: string | null;
  xbrlUrl: string | null;
  attachmentUrls: string[];
  tags: string[];
  sourceId: string;
  isProcessed: boolean;
}

export interface FilingBatch {
  id: string;
  date: string;
  exchange: FilingExchange;
  totalFilings: number;
  processedFilings: number;
  status: 'pending' | 'processing' | 'complete' | 'error';
  errors: string[];
}

export interface FilingFilter {
  symbols?: string[];
  filingTypes?: FilingType[];
  exchanges?: FilingExchange[];
  fromDate?: string;
  toDate?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}
