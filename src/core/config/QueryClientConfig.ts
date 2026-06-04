/**
 * React Query Configuration
 * Centralized setup for query client and provider configuration
 */

import { QueryClient, QueryClientConfig } from '@tanstack/react-query';
import { MarketConfig } from '../MarketConfig';

/**
 * Custom query client configuration
 * Optimized for market data with aggressive caching and refetching
 */
const queryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      // Stale time: how long data is considered fresh
      staleTime: MarketConfig.staleTime, // 1 minute
      
      // Garbage collection time: when unused data is removed
      gcTime: MarketConfig.gcTime, // 5 minutes
      
      // Retry policy for failed requests
      retry: (failureCount, error: any) => {
        // Don't retry on 404 or 401
        if (error?.status === 404 || error?.status === 401) {
          return false;
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      
      // Retry delay with exponential backoff
      retryDelay: (attemptIndex) => {
        const delay = Math.min(1000 * Math.pow(2, attemptIndex), 30000);
        return delay + Math.random() * 1000; // Add jitter
      },
      
      // Refetch on window focus
      refetchOnWindowFocus: true,
      
      // Refetch when reconnecting
      refetchOnReconnect: true,
      
      // Refetch when component remounts
      refetchOnMount: true,
    },
    mutations: {
      // Retry mutations on failure
      retry: 1,
      retryDelay: 1000,
    },
  },
};

/**
 * Create and export query client instance
 */
export const queryClient = new QueryClient(queryClientConfig);

/**
 * Clear all queries (useful for logout/reset scenarios)
 */
export const clearAllQueries = (): void => {
  queryClient.clear();
};

/**
 * Reset all queries to initial state
 */
export const resetAllQueries = (): void => {
  queryClient.resetQueries();
};

/**
 * Invalidate all market data queries
 * Call this when you need to force a full refresh
 */
export const invalidateMarketQueries = async (): Promise<void> => {
  await queryClient.invalidateQueries({
    queryKey: ['market'],
  });
};

export default queryClient;
