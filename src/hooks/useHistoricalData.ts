import { useState, useEffect, useCallback, useRef } from 'react';

interface HistoryPoint {
  date: string;
  close: number;
}

interface HistoryResponse {
  symbol: string;
  range: string;
  count: number;
  data: HistoryPoint[];
}

export function useHistoricalData(symbol: string | null, range: string = '1Y') {
  const [data, setData] = useState<HistoryPoint[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, HistoryPoint[]>>(new Map());

  const fetch_ = useCallback(async (sym: string, rng: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const cacheKey = `${sym}_${rng}`;
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setData(cached);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/historical/${sym}?range=${rng}`, {
        signal: abortRef.current.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d: HistoryResponse = await res.json();
      const points = d.data ?? [];
      cacheRef.current.set(cacheKey, points);
      setData(points);
      setError(null);
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!symbol) return;
    fetch_(symbol, range);
    return () => { abortRef.current?.abort(); };
  }, [symbol, range, fetch_]);

  return { data, loading, error };
}
