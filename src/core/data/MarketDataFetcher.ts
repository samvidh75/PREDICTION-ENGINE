/**
 * Legacy telemetry cache.
 *
 * Network-backed legacy telemetry providers were removed in TRACK-8E. Runtime
 * live data should use ProviderCoordinator, which owns the active provider chain.
 */

import { ICompanyTelemetry, MarketDataResponse } from '../../types/market';
import { MarketConfig } from '../MarketConfig';

const telemetryCache = new Map<
  string,
  { data: ICompanyTelemetry; timestamp: number }
>();

const CACHE_TTL = MarketConfig.staleTime;

const isCacheFresh = (timestamp: number): boolean => Date.now() - timestamp < CACHE_TTL;

const disabledResponse = (): MarketDataResponse => ({
  success: false,
  data: null,
  error: 'Legacy telemetry fetcher disabled. Use ProviderCoordinator for live market data.',
});

export const fetchMarketTelemetry = async (
  symbol: string,
  forceRefresh: boolean = false,
): Promise<MarketDataResponse> => {
  if (!forceRefresh) {
    const cached = telemetryCache.get(symbol);
    if (cached && isCacheFresh(cached.timestamp)) {
      return {
        success: true,
        data: cached.data,
        cacheHit: true,
      };
    }
  }

  return disabledResponse();
};

export const fetchMultipleTelemetry = async (
  symbols: string[],
  forceRefresh: boolean = false,
): Promise<Map<string, MarketDataResponse>> => {
  const results = new Map<string, MarketDataResponse>();

  for (const symbol of symbols) {
    const cached = telemetryCache.get(symbol);
    if (!forceRefresh && cached && isCacheFresh(cached.timestamp)) {
      results.set(symbol, {
        success: true,
        data: cached.data,
        cacheHit: true,
      });
    } else {
      results.set(symbol, disabledResponse());
    }
  }

  return results;
};

export const clearTelemetryCache = (symbol?: string): void => {
  if (symbol) {
    telemetryCache.delete(symbol);
  } else {
    telemetryCache.clear();
  }
};

export const getCacheStats = () => ({
  cachedSymbols: telemetryCache.size,
  cacheEntries: Array.from(telemetryCache.entries()).map(([symbol, { timestamp }]) => ({
    symbol,
    age: Date.now() - timestamp,
    fresh: isCacheFresh(timestamp),
  })),
});
