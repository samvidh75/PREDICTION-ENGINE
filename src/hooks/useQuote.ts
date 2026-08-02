import { useState, useEffect } from 'react';
import type { UnifiedQuote } from '../clients/types';
import { providerAggregator } from '../clients/ProviderAggregator';

export interface UseQuoteOptions {
  symbol: string;
  refreshInterval?: number; // ms, default 5000 (5 seconds)
  enabled?: boolean;
  preferredSources?: string[];
}

export interface UseQuoteResult {
  quote: UnifiedQuote | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * React hook to fetch and auto-update stock quotes.
 * Handles caching, retries, and real-time updates.
 */
export function useQuote({
  symbol,
  refreshInterval = 5000,
  enabled = true,
  preferredSources,
}: UseQuoteOptions): UseQuoteResult {
  const [quote, setQuote] = useState<UnifiedQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = async () => {
    if (!symbol || !enabled) return;

    setLoading(true);
    try {
      const result = await providerAggregator.getQuote(symbol, { preferredSources });
      if (result) {
        setQuote(result);
        setError(null);
      } else {
        setError(new Error(`Failed to fetch quote for ${symbol}`));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) return;

    // Initial fetch
    refresh();

    // Auto-refresh interval
    const interval = setInterval(refresh, refreshInterval);
    return () => clearInterval(interval);
  }, [symbol, enabled, refreshInterval, preferredSources]);

  return { quote, loading, error, refresh };
}

/**
 * Hook to fetch multiple quotes at once.
 */
export function useQuotes(symbols: string[], refreshInterval = 5000) {
  const [quotes, setQuotes] = useState<Map<string, UnifiedQuote>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = async () => {
    if (symbols.length === 0) return;

    setLoading(true);
    try {
      const result = await providerAggregator.getQuotes({
        symbols,
        timeout: 5000,
      });

      const quoteMap = new Map<string, UnifiedQuote>();
      for (const quote of result.quotes) {
        quoteMap.set(quote.symbol, quote);
      }
      setQuotes(quoteMap);

      if (result.errors.length > 0) {
        setError(new Error(`Failed to fetch ${result.errors.length} quotes`));
      } else {
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (symbols.length === 0) return;

    refresh();
    const interval = setInterval(refresh, refreshInterval);
    return () => clearInterval(interval);
  }, [symbols.join(','), refreshInterval]);

  return { quotes, loading, error, refresh };
}
