/**
 * Earnings Note Types
 */

export interface EarningsMetricsSnapshot {
  revenue?: number | null;
  profit?: number | null;
  operatingMargin?: number | null;
  netMargin?: number | null;
  revenueGrowthYoy?: number | null;
  profitGrowthYoy?: number | null;
  revenueGrowthQoq?: number | null;
  profitGrowthQoq?: number | null;
  priorRevenue?: number | null;
  priorProfit?: number | null;
  consensusAvailable?: boolean;
  beatMiss?: 'beat' | 'miss' | 'inline' | null;
  periodLabel?: string | null;
}

export interface EarningsNote {
  symbol: string;
  headline: string;
  resultSnapshot: string;
  revenueProfitMarginChange: string;
  earningsQuality: string;
  whatImproved: string[];
  whatWeakened: string[];
  thesisImpact: string;
  riskImpact: string;
  valuationContext: string;
  whatToWatchNext: string[];
  limitations: string[];
  disclaimer: string;
  generatedAt: string;
  confidence: string;
}
