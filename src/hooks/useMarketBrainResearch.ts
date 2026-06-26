import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchMarketBrainResearch,
  type MarketBrainResearchResponse,
} from '../services/marketBrainResearch';

export interface UseMarketBrainResearchResult {
  data: MarketBrainResearchResponse | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const normalizeSymbol = (symbol: string | null | undefined): string => (symbol ?? '').trim().toUpperCase();

export function useMarketBrainResearch(symbol: string | null | undefined): UseMarketBrainResearchResult {
  const normalizedSymbol = useMemo(() => normalizeSymbol(symbol), [symbol]);
  const [data, setData] = useState<MarketBrainResearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!normalizedSymbol) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const result = await fetchMarketBrainResearch(normalizedSymbol, { signal: controller.signal });
      setData(result);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Research is temporarily unavailable.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [normalizedSymbol]);

  useEffect(() => {
    let active = true;
    if (!normalizedSymbol) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    fetchMarketBrainResearch(normalizedSymbol)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Research is temporarily unavailable.');
        setData(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [normalizedSymbol]);

  return { data, loading, error, reload };
}
