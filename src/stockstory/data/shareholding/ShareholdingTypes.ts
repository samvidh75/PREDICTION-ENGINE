/**
 * Shareholding Types
 *
 * Indian equity shareholding pattern data.
 * Tracks promoter, FII, DII, and public shareholding trends.
 */

export type ShareholderCategory =
  | 'promoter'
  | 'promoter_group'
  | 'fii'
  | 'dii'
  | 'mutual_fund'
  | 'insurance'
  | 'banks'
  | 'aif'
  | 'retail'
  | 'hnw'
  | 'others'
  | 'government';

export interface ShareholdingPattern {
  id: string;
  symbol: string;
  companyName: string;
  periodEndDate: string; // quarter end
  filingDate: string;
  totalShares: number; // in crores
  holdings: ShareholderHolding[];
  promoterPledgedPercentage: number | null;
  sourceId: string;
}

export interface ShareholderHolding {
  category: ShareholderCategory;
  numberOfShareholders: number | null;
  sharesHeld: number; // in lakhs
  percentage: number;
  changeQoQ: number | null; // percentage points
  changeYoY: number | null;
}

export interface ShareholdingTrend {
  symbol: string;
  periods: ShareholdingPattern[];
  promoterTrend: 'increasing' | 'stable' | 'decreasing' | 'unknown';
  fiiTrend: 'increasing' | 'stable' | 'decreasing' | 'unknown';
  diiTrend: 'increasing' | 'stable' | 'decreasing' | 'unknown';
  retailTrend: 'increasing' | 'stable' | 'decreasing' | 'unknown';
}

export interface PromoterRisk {
  symbol: string;
  promoterHolding: number;
  pledgedPercentage: number;
  riskLevel: 'low' | 'medium' | 'high';
  flags: string[];
}

export interface ShareholdingFilter {
  symbols?: string[];
  categories?: ShareholderCategory[];
  fromDate?: string;
  toDate?: string;
  minPromoterHolding?: number;
  maxPromoterHolding?: number;
  limit?: number;
  offset?: number;
}
