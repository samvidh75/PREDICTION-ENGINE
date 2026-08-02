/**
 * Watchlist Review Brief Types
 */

export interface WatchlistReviewBrief {
  symbol: string;
  savedCompanySummary: string;
  thesisState: string;
  whatChangedSinceLastReview: string[];
  risksRequiringAttention: string[];
  valuationChanges: string;
  earningsChanges: string;
  filingEventChanges: string[];
  peerAlternatives: Array<{ symbol: string; note: string }>;
  scenarioPrompts: string[];
  reviewChecklist: string[];
  limitations: string[];
  disclaimer: string;
  generatedAt: string;
}

export interface WatchlistReviewInput {
  symbol: string;
  companyName?: string | null;
  thesisState?: string | null;
  priorReviewAt?: string | null;
  whatChanged?: string[];
  riskRising?: boolean;
  valuationChange?: string | null;
  earningsChange?: string | null;
  filingEvents?: string[];
  peerAlternatives?: Array<{ symbol: string; note: string }>;
}
