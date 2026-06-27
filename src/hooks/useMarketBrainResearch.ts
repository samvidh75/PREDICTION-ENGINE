import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const requestIdRef = useRef(0);
  const [data, setData] = useState<MarketBrainResearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  const loadResearch = useCallback(async (requestedSymbol: string) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError(null);

    try {
      const result = await fetchMarketBrainResearch(requestedSymbol);
      if (requestIdRef.current !== requestId) return;
      setData(result);
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Research is temporarily unavailable.');
      setData(null);
    } finally {
      if (requestIdRef.current === requestId) setLoading(false);
    }
  }, []);

  const reload = useCallback(async () => {
    if (!normalizedSymbol) {
      reset();
      return;
    }

    await loadResearch(normalizedSymbol);
  }, [loadResearch, normalizedSymbol, reset]);

  useEffect(() => {
    if (!normalizedSymbol) {
      reset();
      return;
    }

    void loadResearch(normalizedSymbol);
  }, [loadResearch, normalizedSymbol, reset]);

  return { data, loading, error, reload };
}
