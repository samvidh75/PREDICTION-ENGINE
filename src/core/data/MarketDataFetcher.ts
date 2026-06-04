/**
 * Unified Market Data Fetcher
 * Intelligent routing between Alpha Vantage, RapidAPI, and Mock data
 * Implements graceful degradation and fallback strategies
 */

import { ICompanyTelemetry, MarketDataResponse } from '../../types/market';
import { fetchFromAlphaVantage, fetchMultipleFromAlphaVantage } from './AlphaVantageFetcher';
import { MarketConfig } from '../MarketConfig';

/**
 * Cache for in-memory telemetry to reduce API calls
 * Maps symbol -> { data, timestamp }
 */
const telemetryCache = new Map<
  string,
  { data: ICompanyTelemetry; timestamp: number }
>();

const CACHE_TTL = MarketConfig.staleTime; // 1 minute

/**
 * Check if cached data is still fresh
 */
const isCacheFresh = (timestamp: number): boolean => {
  return Date.now() - timestamp < CACHE_TTL;
};

/**
 * Get telemetry data with intelligent source selection
 * Strategy: AlphaVantage > RapidAPI > Mock (with caching layer)
 */
export const fetchMarketTelemetry = async (
  symbol: string,
  forceRefresh: boolean = false
): Promise<MarketDataResponse> => {
  try {
    // Check cache first (unless force refresh requested)
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

    let result: MarketDataResponse;

    // Try primary sources in order
    if (MarketConfig.enableAlphaVantage) {
      result = await fetchFromAlphaVantage(symbol);
      if (result.success && result.data) {
        telemetryCache.set(symbol, { data: result.data, timestamp: Date.now() });
        return result;
      }
    }

    return {
      success: false,
      data: null,
      error: 'No data sources available',
    };
  } catch (error) {
    console.error(`Error fetching telemetry for ${symbol}:`, error);

    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Batch fetch telemetry for multiple symbols
 * Parallelizes requests efficiently
 */
export const fetchMultipleTelemetry = async (
  symbols: string[],
  forceRefresh: boolean = false
): Promise<Map<string, MarketDataResponse>> => {
  try {
    const results = new Map<string, MarketDataResponse>();

    // Separate cached vs. uncached symbols
    const uncachedSymbols: string[] = [];
    const now = Date.now();

    for (const symbol of symbols) {
      const cached = telemetryCache.get(symbol);
      if (!forceRefresh && cached && isCacheFresh(cached.timestamp)) {
        results.set(symbol, {
          success: true,
          data: cached.data,
          cacheHit: true,
        });
      } else {
        uncachedSymbols.push(symbol);
      }
    }

    // Fetch uncached symbols
    if (uncachedSymbols.length > 0) {
      if (MarketConfig.enableAlphaVantage) {
        const alphaResults = await fetchMultipleFromAlphaVantage(uncachedSymbols);
        for (const [symbol, response] of alphaResults) {
          if (response.success && response.data) {
            telemetryCache.set(symbol, { data: response.data, timestamp: now });
            results.set(symbol, response);
          }
        }
      }

    }

    return results;
  } catch (error) {
    console.error('Batch fetch error:', error);
    throw error;
  }
};

/**
 * Clear cache for a specific symbol or entire cache
 */
export const clearTelemetryCache = (symbol?: string): void => {
  if (symbol) {
    telemetryCache.delete(symbol);
  } else {
    telemetryCache.clear();
  }
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  return {
    cachedSymbols: telemetryCache.size,
    cacheEntries: Array.from(telemetryCache.entries()).map(([symbol, { timestamp }]) => ({
      symbol,
      age: Date.now() - timestamp,
      fresh: isCacheFresh(timestamp),
    })),
  };
};
