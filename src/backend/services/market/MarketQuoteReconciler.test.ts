import { describe, expect, it } from "vitest";
import { reconcileQuoteWithHistory } from "./MarketQuoteReconciler";

describe("reconcileQuoteWithHistory", () => {
  const now = new Date("2026-06-23T12:00:00.000Z");

  it("prefers a newer valid trading-session row over a stale provider quote", () => {
    const result = reconcileQuoteWithHistory("TEST", {
      symbol: "TEST", exchange: "NSE", price: 100, change: 1, changePercent: 1,
      updatedAt: "2026-06-18T10:00:00.000Z",
    }, [
      { trade_date: "2026-06-22", close: 110, volume: 10 },
      { trade_date: "2026-06-19", close: 105, volume: 9 },
      { trade_date: "2026-06-20", close: 999, volume: 99 },
    ], now);
    expect(result).toMatchObject({ price: 110, change: 5, source: "daily_prices", asOf: "2026-06-22", delayed: true });
  });

  it("keeps a provider quote when it is at least as recent as history", () => {
    const result = reconcileQuoteWithHistory("TEST", {
      symbol: "TEST", exchange: "NSE", price: 112, change: 2, changePercent: 1.82,
      updatedAt: "2026-06-23T10:00:00.000Z",
    }, [{ trade_date: "2026-06-22", close: 110, volume: 10 }], now);
    expect(result).toMatchObject({ price: 112, source: "provider", asOf: "2026-06-23", delayed: false });
  });
});
