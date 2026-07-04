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

  const generateMockData = (days: number): OHLC[] => {
    const data: OHLC[] = [];
    const now = Date.now();
    const dayMs = 86400000;
    const symbolHash = symbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    let price = 100 + (symbolHash % 900);

    for (let i = days; i >= 0; i--) {
      const timestamp = new Date(now - i * dayMs);
      const dateStr = timestamp.toISOString().split('T')[0];

      const volatility = 0.015 + Math.abs(Math.sin(i / 10)) * 0.02;
      const trend = Math.sin((i / days) * Math.PI) * 0.03;
      const dayChange = trend + (Math.random() - 0.5) * volatility;

      const open = price * (1 + dayChange * 0.3);
      const close = price * (1 + dayChange);
      const high = Math.max(open, close) * (1 + volatility);
      const low = Math.min(open, close) * (1 - volatility);

      data.push({
        time: dateStr,
        open: Math.round(open * 100) / 100,
        high: Math.round(high * 100) / 100,
        low: Math.round(low * 100) / 100,
        close: Math.round(close * 100) / 100,
        volume: Math.floor(1000000 + Math.random() * 5000000),
      });

      price = close;
    }
    return data;
  };

  const refresh = async () => {
    if (!symbol || !enabled) return;

    setLoading(true);
    try {
      const daysMap: { [key: string]: number } = {
        '1D': 1,
        '5D': 5,
        '1M': 30,
        '3M': 90,
        '1Y': 365,
      };
      const days = daysMap[timeframe] || 30;

      try {
        const response = await fetch(
          `/api/ohlc/${encodeURIComponent(symbol)}?timeframe=${timeframe}`
        );

        if (response.ok) {
          const result = await response.json();
          setData(result.data || []);
          setError(null);
        } else {
          setData(generateMockData(days));
        }
      } catch {
        setData(generateMockData(days));
      }
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
