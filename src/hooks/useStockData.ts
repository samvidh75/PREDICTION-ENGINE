import { useCallback, useEffect, useState } from "react";
import { getCache, setCache } from "../lib/cache";

export interface StockData {
  symbol: string;
  price: {
    current: number | null;
    change: number | null;
    changeAbs: number | null;
    open: number | null;
    high: number | null;
    low: number | null;
    volume: number | null;
    weekHigh52: number | null;
    weekLow52: number | null;
    marketCap: number | null;
    exchange: string;
    companyName: string;
    sector: string | null;
    source: string;
    priceError: string | null;
  };
  fundamentals: {
    peRatio: number | null;
    pbRatio: number | null;
    roe: number | null;
    roce: number | null;
    debtToEquity: number | null;
    currentRatio: number | null;
    dividendYield: number | null;
    eps: number | null;
    revenueGrowth: number | null;
    profitGrowth: number | null;
    netMargin: number | null;
    operatingMargin: number | null;
    marketCap: number | null;
    fundamentalSource: string;
    fundamentalError: string | null;
  };
  historical: {
    closes: number[];
    timestamps: number[];
    source: string;
    error: string | null;
  };
  dataCompleteness: number;
  fetchedAt: string;
  errors: string[];
}

export function useStockData(symbol: string | null) {
  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStock = useCallback(async () => {
    if (!symbol) return;

    // Cache-first: try to load from cache immediately
    const cacheKey = `stock_${symbol}`;
    const cached = getCache<StockData>(cacheKey);
    if (cached.data) {
      setData(cached.data);
      setLoading(false);
      // If stale, refresh in background
      if (!cached.isStale) return;
    }

    setLoading(!cached.data); // Only show loading if no cached data
    try {
      const response = await fetch(`/api/stock/${encodeURIComponent(symbol)}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const nextData = (await response.json()) as StockData;
      setData(nextData);
      setCache(cacheKey, nextData);
      setError(null);
      setLoading(false);
    } catch (nextError: unknown) {
      if (!cached.data) {
        setError(nextError instanceof Error ? nextError.message : "Failed to load stock data");
        setLoading(false);
      }
    }
  }, [symbol]);

  useEffect(() => { void fetchStock(); }, [fetchStock]);

  return { data, loading, error, refetch: fetchStock };
}

export default useStockData;
