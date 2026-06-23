import { useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError, type StockQuote } from "../services/api/client";

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

const quoteCache = new Map<string, { data: StockQuote; ts: number }>();
const CACHE_TTL = 30_000;

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase().replace(/\.(NS|BO)$/i, "");
}

function getCached(symbol: string): StockQuote | null {
  const entry = quoteCache.get(symbol);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}

function setCached(symbol: string, quote: StockQuote): void {
  quoteCache.set(symbol, { data: quote, ts: Date.now() });
}

export function useLiveQuote(symbol?: string): LiveQuoteState {
  const quotes = useLiveQuotes(symbol ? [symbol] : []);
  return symbol ? quotes[normalizeSymbol(symbol)] ?? emptyQuoteState : emptyQuoteState;
}

export function useLiveQuotes(symbols: string[]): Record<string, LiveQuoteState> {
  const key = useMemo(() => symbols.map(normalizeSymbol).filter(Boolean).sort().join("|"), [symbols]);
  const normalizedSymbols = useMemo(() => key ? key.split("|") : [], [key]);

  const [states, setStates] = useState<Record<string, LiveQuoteState>>(() => {
    const initial: Record<string, LiveQuoteState> = {};
    for (const sym of normalizedSymbols) {
      const cached = getCached(sym);
      initial[sym] = cached
        ? { quote: cached, loading: false, error: null }
        : { quote: null, loading: true, error: null };
    }
    return initial;
  });

  const fetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (normalizedSymbols.length === 0) {
      setStates({});
      return;
    }

    const controller = new AbortController();
    const toFetch = normalizedSymbols.filter((sym) => {
      if (fetchedRef.current.has(sym)) return false;
      if (getCached(sym)) return false;
      return true;
    });

    if (toFetch.length === 0) return;

    setStates((prev) => {
      const next = { ...prev };
      for (const sym of toFetch) {
        if (!next[sym]) next[sym] = { quote: null, loading: true, error: null };
      }
      return next;
    });

    toFetch.forEach((symbol) => {
      api.getQuote(symbol)
        .then((quote) => {
          if (controller.signal.aborted) return;
          setCached(symbol, quote);
          setStates((prev) => ({ ...prev, [symbol]: { quote, loading: false, error: null } }));
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setStates((prev) => ({
            ...prev,
            [symbol]: { quote: prev[symbol]?.quote ?? null, loading: false, error: "Quote data is temporarily unavailable." },
          }));
        });
    });

    return () => controller.abort();
  }, [key]);

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
