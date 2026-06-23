import type { StockQuote } from "../../../services/data/types";
import { isIndianTradingSessionDate } from "../../../shared/market/IndianTradingCalendar";

export interface PriceRowLike {
  trade_date?: unknown;
  close?: unknown;
  volume?: unknown;
}

export type CanonicalStockQuote = StockQuote & {
  asOf: string | null;
  source: "provider" | "daily_prices";
  freshness: "current" | "delayed" | "unknown";
  delayed: boolean;
};

function finite(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function marketDate(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export function reconcileQuoteWithHistory(
  symbol: string,
  providerQuote: StockQuote | null,
  rawRows: PriceRowLike[],
  now = new Date(),
): CanonicalStockQuote | null {
  const rows = rawRows
    .map((row) => ({ date: String(row.trade_date ?? "").slice(0, 10), close: finite(row.close), volume: finite(row.volume) }))
    .filter((row) => row.close !== null && row.close > 0 && isIndianTradingSessionDate(row.date) && row.date <= now.toISOString().slice(0, 10))
    .sort((a, b) => b.date.localeCompare(a.date));
  const latest = rows[0] ?? null;
  const previous = rows[1] ?? null;
  const providerDate = marketDate(providerQuote?.updatedAt);
  const useProvider = Boolean(providerQuote && (!latest || (providerDate && providerDate >= latest.date)));

  if (useProvider && providerQuote) {
    const ageHours = providerQuote.updatedAt ? (now.getTime() - new Date(providerQuote.updatedAt).getTime()) / 3_600_000 : Number.POSITIVE_INFINITY;
    const cleanExchange = (providerQuote.exchange && providerQuote.exchange !== "Data unavailable") ? providerQuote.exchange : "NSE";
    return {
      ...providerQuote,
      exchange: cleanExchange,
      asOf: providerDate,
      source: "provider",
      freshness: Number.isFinite(ageHours) ? (ageHours <= 18 ? "current" : "delayed") : "unknown",
      delayed: !Number.isFinite(ageHours) || ageHours > 18,
    };
  }
  if (!latest) return null;
  const change = previous ? latest.close! - previous.close! : 0;
  const changePercent = previous && previous.close ? (change / previous.close) * 100 : 0;
  return {
    symbol,
    exchange: providerQuote?.exchange || "NSE",
    price: latest.close!,
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100,
    volume: latest.volume ?? providerQuote?.volume,
    updatedAt: `${latest.date}T10:00:00.000Z`,
    retrievedAt: now.toISOString(),
    asOf: latest.date,
    source: "daily_prices",
    freshness: "delayed",
    delayed: true,
  };
}
