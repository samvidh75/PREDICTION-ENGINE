// src/services/data/types.ts

export interface StockQuote {
  symbol: string;
  exchange: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  /** Source market timestamp when the provider exposes one. */
  updatedAt?: string;
  /** Local retrieval timestamp. Must not be presented as a market update time. */
  retrievedAt?: string;
  asOf?: string | null;
  source?: "provider" | "daily_prices";
  freshness?: "current" | "delayed" | "unknown";
  delayed?: boolean;
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
  pbRatio?: number;
  eps?: number;
  dividendYield?: number;
  beta?: number;
  revenue?: number;
  netIncome?: number;
  roe?: number;
  roa?: number;
  roic?: number;
  evEbitda?: number;
  debtToEquity?: number;
  freeCashFlow?: number;
  fcfYield?: number;
  grossMargin?: number;
  operatingMargin?: number;
  netMargin?: number;
  revenueGrowth?: number;
  epsGrowth?: number;
  profitGrowth?: number;
  fcfGrowth?: number;
  currentRatio?: number;
  interestCoverage?: number;
  totalAssets?: number;
  totalLiabilities?: number;
  totalEquity?: number;
  bookValue?: number;
  freeFloat?: number;
  // Provider source metadata (never contains secrets)
  _sources?: Record<string, string>;
  _providerErrors?: string[];
  _raw?: Record<string, unknown>;
}
