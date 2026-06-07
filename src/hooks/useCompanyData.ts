import { useState, useEffect } from 'react';
import { CompanyTelemetry } from '../types/stock';
import { orchestrator } from '../services/api/MarketDataOrchestrator';

export const useCompanyData = (symbol: string) => {
  const [data, setData] = useState<CompanyTelemetry | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await orchestrator.fetchCompanyData(symbol);
        if (isMounted) setData(result);
      } catch (err) {
        if (isMounted) setError('Failed to retrieve intelligence.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, [symbol]);

  return { data, loading, error };
};

export default useCompanyData;
