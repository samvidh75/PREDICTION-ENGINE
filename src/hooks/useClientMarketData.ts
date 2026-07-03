import { useEffect, useState } from 'react';
import { marketDataFetcher } from '../lib/marketDataFetcher';

export interface ClientQuote {
  price: number;
  bid: number;
  ask: number;
  volume: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
}

export function useClientMarketData(symbol: string) {
  const [quote, setQuote] = useState<ClientQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    marketDataFetcher
      .fetch(symbol)
      .then((data) => {
        if (isMounted) {
          setQuote(data);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (isMounted) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [symbol]);

  return { quote, loading, error };
}
