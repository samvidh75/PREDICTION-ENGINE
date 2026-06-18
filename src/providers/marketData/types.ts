/**
 * marketData/types.ts — Provider broker types for market data (`quotes` and `historical`).
 *
 * All providers implement the same interfaces so the broker can fall back seamlessly.
 */

export interface NormalizedQuote {
  symbol: string;
  exchange: string;
  lastPrice: number;
  previousClose: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  timestamp: string;
  provider: ProviderId;
  sourceQuality: 'live' | 'delayed' | 'snapshot' | 'fallback';
}

export interface NormalizedCandle {
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  provider: ProviderId;
  sourceQuality: 'exchange' | 'adjusted' | 'fallback';
}

export type ProviderId = 'indianapi' | 'yahoo' | 'unavailable' | 'dhan' | 'upstox';

export type ProviderHealthStatus =
  | 'healthy'
  | 'missing_optional'
  | 'expired'
  | 'expired_or_unauthorized'
  | 'provider_error'
  | 'rate_limited'
  | 'provider_unreachable';

export interface ProviderHealth {
  provider: ProviderId;
  status: ProviderHealthStatus;
  latencyMs: number | null;
  checkedAt: string;
}

export interface MarketDataProvider {
  readonly providerId: ProviderId;
  getQuote(symbol: string): Promise<NormalizedQuote>;
  getHistoricalDaily(symbol: string, fromDate: string, toDate: string): Promise<NormalizedCandle[]>;
  checkHealth(): Promise<ProviderHealth>;
}

export interface ProviderBrokerResult<T> {
  data: T | null;
  provider: ProviderId;
  latencyMs: number;
  error: string | null;
  fallbackChain: ProviderId[];
}
