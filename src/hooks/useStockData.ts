import { useState, useEffect, useCallback, useRef } from 'react';
import { runCompanyDataPipeline, PipelineResult } from '../services/data/CompanyDataPipeline';

export interface UseStockDataResult {
  pipeline: PipelineResult | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useStockData(symbol: string | null): UseStockDataResult {
  const [pipeline, setPipeline] = useState<PipelineResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const fetchingRef = useRef(false);

  const fetchData = useCallback(async (sym: string, isFirstFetch: boolean) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    // On first fetch show loading state; on refresh keep stale data visible
    if (isFirstFetch) setLoading(true);

    try {
      const result = await runCompanyDataPipeline(sym);
      if (!isMountedRef.current) return;

      setPipeline(result);

      // Only set error when ALL providers failed and price is unavailable
      const allFailed = result.price.current === null && result.pipelineErrors.length > 0;
      setError(allFailed ? result.pipelineErrors[0] : null);
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load stock data');
    } finally {
      if (isMountedRef.current) setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  const isFirstFetchRef = useRef(true);

  const refetch = useCallback(() => {
    if (!symbol) return;
    fetchData(symbol, false);
  }, [symbol, fetchData]);

  useEffect(() => {
    isMountedRef.current = true;
    isFirstFetchRef.current = true;

    if (!symbol) {
      setPipeline(null);
      setLoading(false);
      setError(null);
      return;
    }

    // Reset state when symbol changes
    setPipeline(null);
    setError(null);
    fetchData(symbol, true);

    return () => {
      isMountedRef.current = false;
    };
  }, [symbol, fetchData]);

  return { pipeline, loading, error, refetch };
}

export default useStockData;
