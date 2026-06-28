/**
 * Analyst Memo Types
 */

export type AnalystMemoType =
  | 'company_research_memo'
  | 'earnings_memo'
  | 'filing_memo'
  | 'sector_memo'
  | 'watchlist_review_memo'
  | 'risk_review_memo'
  | 'scenario_memo';

export type ReviewStatusLabel = 'pending_review' | 'approved' | 'auto_published' | 'limited';

export interface AnalystMemo {
  id: string;
  memoType: AnalystMemoType;
  symbol?: string;
  sector?: string;
  title: string;
  summary: string;
  keyFacts: string[];
  thesisImpact: string;
  riskImpact: string;
  valuationContext: string;
  evidenceBasis: string;
  limitations: string[];
  reviewStatus: ReviewStatusLabel;
  generatedAt: string;
  disclaimer: string;
}
