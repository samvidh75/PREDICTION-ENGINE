/**
 * Quarterly Result Types
 *
 * Standardized quarterly financial results for Indian listed companies.
 * Supports consolidated and standalone results, YoY and QoQ comparisons.
 */

export type ResultType = 'consolidated' | 'standalone';
export type ResultFrequency = 'quarterly' | 'annual' | 'half_yearly';

export interface QuarterlyResult {
  id: string;
  symbol: string;
  companyName: string;
  resultType: ResultType;
  frequency: ResultFrequency;
  period: string; // e.g., "2025Q1", "FY2025"
  periodEndDate: string;
  filingDate: string;
  audited: boolean;
  currency: string; // "INR" typically

  // Revenue
  revenueFromOperations: number | null;
  otherIncome: number | null;
  totalRevenue: number | null;

  // Expenses
  rawMaterialCost: number | null;
  employeeCost: number | null;
  depreciation: number | null;
  financeCost: number | null;
  otherExpenses: number | null;
  totalExpenses: number | null;

  // Profitability
  ebitda: number | null;
  ebitdaMargin: number | null;
  profitBeforeTax: number | null;
  taxExpense: number | null;
  netProfit: number | null;
  netProfitMargin: number | null;
  eps: number | null; // basic EPS
  dilutedEps: number | null;

  // Balance Sheet items (typically only in annual/half-yearly)
  totalAssets: number | null;
  totalLiabilities: number | null;
  netWorth: number | null;
  debt: number | null;
  cashEquivalents: number | null;

  // Cash Flow items
  operatingCashFlow: number | null;
  investingCashFlow: number | null;
  financingCashFlow: number | null;

  // Segment info
  segments: SegmentResult[];

  // Extraordinary items
  exceptionalItems: number | null;

  // Source tracking
  sourceIds: string[];
  filingId: string | null;
}

export interface SegmentResult {
  segmentName: string;
  revenue: number | null;
  ebit: number | null;
  ebitMargin: number | null;
}

export interface ResultComparison {
  current: QuarterlyResult;
  previousQuarter: QuarterlyResult | null;
  sameQuarterLastYear: QuarterlyResult | null;
  metrics: ComparisonMetrics;
}

export interface ComparisonMetrics {
  revenueQoQ: number | null; // % change
  revenueYoY: number | null;
  netProfitQoQ: number | null;
  netProfitYoY: number | null;
  ebitdaMarginChangeQoQ: number | null; // bps change
  ebitdaMarginChangeYoY: number | null;
  epsQoQ: number | null;
  epsYoY: number | null;
}

export interface ResultFilter {
  symbols?: string[];
  resultType?: ResultType;
  frequency?: ResultFrequency;
  fromPeriod?: string;
  toPeriod?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}
