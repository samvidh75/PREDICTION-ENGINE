import { useState, useEffect } from 'react';
import type { OHLC } from '../components/StockChart';

export interface UseOHLCDataOptions {
  symbol: string;
  timeframe?: '1D' | '5D' | '1M' | '3M' | '1Y';
  enabled?: boolean;
  refreshInterval?: number;
}

export interface UseOHLCDataResult {
  data: OHLC[] | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * React hook to fetch OHLC candlestick data for charting
 */
export function useOHLCData({
  symbol,
  timeframe = '1M',
  enabled = true,
  refreshInterval = 60000, // Refresh every minute
}: UseOHLCDataOptions): UseOHLCDataResult {
  const [data, setData] = useState<OHLC[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = async () => {
    if (!symbol || !enabled) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/ohlc/${encodeURIComponent(symbol)}?timeframe=${timeframe}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch OHLC data: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled || !symbol) return;

    // Initial fetch
    refresh();

    // Optional: Auto-refresh interval
    if (refreshInterval > 0) {
      const interval = setInterval(refresh, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [symbol, timeframe, enabled, refreshInterval]);

  return { data, loading, error, refresh };
}
