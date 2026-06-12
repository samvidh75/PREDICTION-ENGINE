// src/services/data/types.ts

export interface StockQuote {
  symbol: string;
  exchange: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  updatedAt: string;
}

export interface CompanyMetadata {
  symbol: string;
  companyName: string;
  sector: string;
  industry: string;
  exchange?: string;
  marketCap?: number;
  currency?: string;
  website?: string;
  isin?: string | null;
  bseCode?: string | null;
  nseSymbol?: string | null;
  verificationStatus?: 'VERIFIED' | 'PARTIAL' | 'INVALID';
  verificationReasons?: string[];
  enrichmentSource?: 'provider' | 'registry' | 'fallback';
  // Backward compat aliases used by some providers
  name?: string;
}

export interface HistoricalPoint {
  date: string;        // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjustedClose?: number;
}

export interface FinancialSnapshot {
  symbol: string;
  periodEnd: string;  // ISO date
  marketCap?: number;
  peRatio?: number;
  eps?: number;
  dividendYield?: number;
  beta?: number;
  revenue?: number;
  netIncome?: number;
}
