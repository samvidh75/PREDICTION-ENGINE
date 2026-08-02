// src/services/providers/unified/types.ts
// Unified provider types — single interface across all market data sources

/** Real-time or near-real-time quote data */
export interface QuoteData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  timestamp: string;
  source: string;
  isRealtime?: boolean;
}

/** Fundamental / financial data for a company */
export interface FundamentalData {
  // Valuation
  pe?: number;
  pb?: number;
  evEbitda?: number;

  // Quality
  roe?: number;
  roa?: number;
  roic?: number;

  // Leverage
  debtToEquity?: number;

  // Growth
  revenueGrowth?: number;
  profitGrowth?: number;
  epsGrowth?: number;

  // Returns
  operatingMargin?: number;
  netMargin?: number;

  // Dividends
  dividendYield?: number;

  // Source tracking
  source: string;
  symbol: string;
  companyName?: string;
  sector?: string;
  isin?: string;
  lastUpdated?: string;
  /** Raw provider response for debugging */
  _raw?: Record<string, unknown>;
}

/** Health status of a data provider */
export interface ProviderHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  lastCheck: string;
  responseTimeMs: number;
  failureCount: number;
  successRate: number;
  lastError?: string;
}

/** Unified market data provider interface */
export interface IMarketDataProvider {
  name: string;
  priority: number;

  getQuote(symbol: string): Promise<QuoteData>;
  getFundamentals(symbol: string): Promise<FundamentalData>;
  search(query: string): Promise<{ symbol: string; name: string }[]>;
  getHealth(): Promise<ProviderHealth>;
}
