import { useEffect, useMemo, useState } from "react";
import type { StockData } from "./useStockData";

export interface UnifiedQuote {
  price: number;
  change: number;
  changePercent: number;
  updatedAt?: string;
}

export interface UnifiedQuoteState {
  quote: UnifiedQuote | null;
  loading: boolean;
  error: string | null;
}

const EMPTY_STATE: UnifiedQuoteState = { quote: null, loading: false, error: null };

const normalize = (symbol: string) => symbol.trim().toUpperCase().replace(/\.(NS|BO)$/i, "");

export function useUnifiedQuotes(symbols: string[]): Record<string, UnifiedQuoteState> {
  const key = useMemo(() => symbols.map(normalize).filter(Boolean).sort().join("|"), [symbols]);
  const normalizedSymbols = useMemo(() => (key ? key.split("|") : []), [key]);
  const [states, setStates] = useState<Record<string, UnifiedQuoteState>>({});

  useEffect(() => {
    const controller = new AbortController();
    setStates(Object.fromEntries(normalizedSymbols.map((symbol) => [symbol, { ...EMPTY_STATE, loading: true }])));

    void Promise.all(
      normalizedSymbols.map(async (symbol) => {
        try {
          const response = await fetch(`/api/stock/${encodeURIComponent(symbol)}`, { signal: controller.signal });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const data = (await response.json()) as StockData;
          const quote = data.price.current === null
            ? null
            : {
                price: data.price.current,
                change: data.price.changeAbs ?? 0,
                changePercent: data.price.change ?? 0,
                updatedAt: data.fetchedAt,
              };
          setStates((current) => ({ ...current, [symbol]: { quote, loading: false, error: null } }));
        } catch (error: unknown) {
          if (controller.signal.aborted) return;
          setStates((current) => ({
            ...current,
            [symbol]: {
              quote: null,
              loading: false,
              error: error instanceof Error ? error.message : "Quote unavailable",
            },
          }));
        }
      }),
    );

    return () => controller.abort();
  }, [key]);

  return states;
}

export function useUnifiedQuote(symbol?: string): UnifiedQuoteState {
  const quotes = useUnifiedQuotes(symbol ? [symbol] : []);
  return symbol ? quotes[normalize(symbol)] ?? EMPTY_STATE : EMPTY_STATE;
}
