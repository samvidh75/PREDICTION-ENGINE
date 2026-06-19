import type { NormalizedQuote, NormalizationResult } from "./types";
import { safeFinite, normalizeSymbol } from "./numericUtils";

export interface RawQuoteInput {
  symbol: string;
  lastPrice?: unknown;
  change?: unknown;
  changePercent?: unknown;
  open?: unknown;
  high?: unknown;
  low?: unknown;
  close?: unknown;
  volume?: unknown;
  marketCap?: unknown;
  week52High?: unknown;
  week52Low?: unknown;
  [key: string]: unknown;
}

export function normalizeQuote(raw: RawQuoteInput): NormalizationResult<NormalizedQuote> {
  if (!raw || typeof raw !== "object") {
    return {
      data: null,
      error: "Invalid quote input: expected object",
      normalizedAt: new Date().toISOString(),
      inputValid: false,
    };
  }

  const symbol = normalizeSymbol(raw.symbol?.toString() ?? "");
  if (!symbol) {
    return {
      data: null,
      error: "Invalid quote input: missing symbol",
      normalizedAt: new Date().toISOString(),
      inputValid: false,
    };
  }

  return {
    data: {
      symbol,
      lastPrice: safeFinite(raw.lastPrice),
      change: safeFinite(raw.change),
      changePercent: safeFinite(raw.changePercent),
      open: safeFinite(raw.open),
      high: safeFinite(raw.high),
      low: safeFinite(raw.low),
      close: safeFinite(raw.close),
      volume: safeFinite(raw.volume),
      marketCap: safeFinite(raw.marketCap),
      week52High: safeFinite(raw.week52High),
      week52Low: safeFinite(raw.week52Low),
      timestamp: new Date().toISOString(),
      sourceSuccess: true,
      providerCount: 1,
    },
    error: null,
    normalizedAt: new Date().toISOString(),
    inputValid: true,
  };
}
