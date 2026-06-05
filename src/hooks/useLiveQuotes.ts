import { useEffect, useMemo, useState } from "react";
import type { StockQuote } from "../services/data/types";

export type LiveQuoteState = {
  quote: StockQuote | null;
  loading: boolean;
  error: string | null;
};

const emptyQuoteState: LiveQuoteState = {
  quote: null,
  loading: false,
  error: null,
};

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase().replace(/\.(NS|BO)$/i, "");
}

async function fetchLiveQuote(symbol: string, signal: AbortSignal): Promise<StockQuote> {
  const response = await fetch(`/api/market-data/quote/${encodeURIComponent(symbol)}`, {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("QUOTE_UNAVAILABLE");
  }
  const body = await response.json().catch(() => null);

  if (!body || typeof body.price !== "number" || !Number.isFinite(body.price) || body.price <= 0) {
    throw new Error("QUOTE_UNAVAILABLE");
  }

  return body as StockQuote;
}

export function useLiveQuote(symbol?: string): LiveQuoteState {
  const quotes = useLiveQuotes(symbol ? [symbol] : []);
  return symbol ? quotes[normalizeSymbol(symbol)] ?? emptyQuoteState : emptyQuoteState;
}

export function useLiveQuotes(symbols: string[]): Record<string, LiveQuoteState> {
  const normalizedSymbols = useMemo(() => {
    return Array.from(new Set(symbols.map(normalizeSymbol).filter(Boolean))).sort();
  }, [symbols.join("|")]);

  const [states, setStates] = useState<Record<string, LiveQuoteState>>({});

  useEffect(() => {
    if (normalizedSymbols.length === 0) {
      setStates({});
      return;
    }

    const controller = new AbortController();
    setStates((prev) => {
      const next: Record<string, LiveQuoteState> = {};
      normalizedSymbols.forEach((symbol) => {
        next[symbol] = {
          quote: prev[symbol]?.quote ?? null,
          loading: true,
          error: null,
        };
      });
      return next;
    });

    normalizedSymbols.forEach((symbol) => {
      fetchLiveQuote(symbol, controller.signal)
        .then((quote) => {
          setStates((prev) => ({
            ...prev,
            [symbol]: { quote, loading: false, error: null },
          }));
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setStates((prev) => ({
            ...prev,
            [symbol]: { quote: null, loading: false, error: "Quote data is temporarily unavailable." },
          }));
        });
    });

    return () => controller.abort();
  }, [normalizedSymbols.join("|")]);

  return states;
}

export function formatINR(value?: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Unavailable";
  return `Rs ${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPercent(value?: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Unavailable";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}
