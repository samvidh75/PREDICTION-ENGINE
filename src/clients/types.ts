/**
 * Unified quote interface across all data providers.
 * Normalizes yfinance, NSE, screener.in, etc. to a single format.
 */
export interface UnifiedQuote {
  symbol: string;
  exchange: 'PSE' | 'NASDAQ' | 'NYSE';
  timestamp: number; // ms since epoch

  // Price data
  price: number; // last traded price
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;

  // Order book depth
  bid?: number; // best bid price
  ask?: number; // best ask price
  bidSize?: number; // quantity at bid
  askSize?: number; // quantity at ask

  // Intraday change
  change: number; // absolute price change
  changePercent: number; // percentage change

  // Additional context
  source: 'yfinance' | 'pse' | 'screener' | 'cached';
  fetched: number; // when this quote was fetched (ms since epoch)
  cached: boolean; // true if from IndexedDB
}

export interface QuoteError {
  symbol: string;
  error: string;
  source: string;
  timestamp: number;
}

export interface QuoteResult {
  success: boolean;
  quote?: UnifiedQuote;
  error?: QuoteError;
}

export interface BatchQuoteRequest {
  symbols: string[];
  timeout?: number; // ms to wait for responses
  preferredSources?: ('yfinance' | 'jugasad' | 'screener')[];
}

export interface BatchQuoteResponse {
  quotes: UnifiedQuote[];
  errors: QuoteError[];
  fetchedAt: number;
  totalTime: number;
}

// Cache entry stored in IndexedDB
export interface CachedQuote {
  symbol: string;
  quote: UnifiedQuote;
  expiresAt: number; // timestamp when cache expires
  source: UnifiedQuote['source'];
}

export interface CacheConfig {
  priceExpiry: number; // ms, default 5 min (300000)
  fundamentalExpiry: number; // ms, default 1 hour (3600000)
  technicalExpiry: number; // ms, default 1 day (86400000)
}
