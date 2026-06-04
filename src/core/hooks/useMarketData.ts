/**
 * React Query Hooks for Market Telemetry
 * Manages server state with intelligent caching, refetching, and error handling
 */

import { useQuery, useQueries, UseQueryResult } from '@tanstack/react-query';
import { ICompanyTelemetry, MarketDataResponse } from '../../types/market';
import { fetchMarketTelemetry, fetchMultipleTelemetry } from '../data/MarketDataFetcher';
import { MarketConfig } from '../MarketConfig';

/**
 * Query key factory for market data
 */
const marketQueryKeys = {
  all: ['market'] as const,
  telemetry: (symbol: string) => [...marketQueryKeys.all, 'telemetry', symbol] as const,
  batch: (symbols: string[]) =>
    [...marketQueryKeys.all, 'batch', symbols.sort().join(',')] as const,
};

/**
 * Hook: Fetch single company telemetry
 * Automatically refetches based on staleTime configuration
 */
export const useMarketTelemetry = (
  symbol: string | null,
  options?: {
    enabled?: boolean;
    forceRefresh?: boolean;
    refetchInterval?: number;
  }
) => {
  return useQuery<ICompanyTelemetry | null, Error>({
    queryKey: marketQueryKeys.telemetry(symbol || ''),
    queryFn: async () => {
      if (!symbol) return null;

      const result = await fetchMarketTelemetry(symbol, options?.forceRefresh);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch telemetry');
      }
      return result.data || null;
    },
    enabled: !!symbol && (options?.enabled !== false),
    staleTime: MarketConfig.staleTime, // 1 minute
    gcTime: MarketConfig.gcTime, // 5 minutes
    refetchInterval: options?.refetchInterval || MarketConfig.staleTime,
    refetchIntervalInBackground: true, // Keep fetching even if tab is not in focus
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
  });
};

/**
 * Hook: Fetch multiple company telemetries in parallel
 * Returns an array of query results matching the input symbols
 */
export const useMultipleTelemetry = (
  symbols: string[] | null,
  options?: {
    enabled?: boolean;
    forceRefresh?: boolean;
  }
) => {
  const queries = useQueries({
    queries:
      symbols && symbols.length > 0
        ? symbols.map((symbol) => ({
            queryKey: marketQueryKeys.telemetry(symbol),
            queryFn: async () => {
              const result = await fetchMarketTelemetry(symbol, options?.forceRefresh);
              if (!result.success) {
                throw new Error(result.error || `Failed to fetch ${symbol}`);
              }
              return result.data || null;
            },
            staleTime: MarketConfig.staleTime,
            gcTime: MarketConfig.gcTime,
            refetchInterval: MarketConfig.staleTime,
            retry: 1,
            enabled: options?.enabled !== false,
          }))
        : [],
  });

  return {
    queries,
    data: queries.map((q) => q.data || null),
    isLoading: queries.some((q) => q.isLoading),
    isError: queries.some((q) => q.isError),
    errors: queries.filter((q) => q.error).map((q) => q.error),
  };
};

/**
 * Hook: Fetch and track market data with live status
 * Returns telemetry + connection state for real-time indication
 */
export const useMarketTelemetryWithStatus = (symbol: string | null) => {
  const telemetryQuery = useMarketTelemetry(symbol);

  // Simulate live connection state
  // In production, this would connect to a WebSocket
  const isLiveConnected =
    telemetryQuery.isSuccess &&
    telemetryQuery.data &&
    Date.now() - (telemetryQuery.data.timestamp || 0) < 60000; // Live if updated in last minute

  return {
    telemetry: telemetryQuery.data,
    isLoading: telemetryQuery.isLoading,
    isError: telemetryQuery.isError,
    error: telemetryQuery.error,
    isLive: isLiveConnected,
    lastUpdated: telemetryQuery.data?.lastUpdated || null,
    refetch: telemetryQuery.refetch,
  };
};

/**
 * Hook: Batch telemetry with status aggregation
 */
export const useBatchTelemetryWithStatus = (symbols: string[] | null) => {
  const { queries, data, isLoading, isError } = useMultipleTelemetry(symbols);

  const isLiveConnected =
    data.some((d) => d && Date.now() - (d.timestamp || 0) < 60000) &&
    queries.every((q) => q.isSuccess || q.isLoading);

  return {
    telemetries: data,
    symbols: symbols || [],
    isLoading,
    isError,
    isLive: isLiveConnected,
    successCount: queries.filter((q) => q.isSuccess).length,
    errorCount: queries.filter((q) => q.isError).length,
  };
};

export { marketQueryKeys };
