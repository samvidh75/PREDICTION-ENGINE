import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { MarketDataFetcher } from "./marketDataFetcher";

const idbStore = new Map<string, any>();

vi.mock("idb", () => ({
  openDB: async () => ({
    get: async (_table: string, key: string) => idbStore.get(key) ?? null,
    put: async (_table: string, val: any) => { idbStore.set(val.symbol, val); },
    clear: async () => { idbStore.clear(); },
  }),
}));

describe("MarketDataFetcher", () => {
  let fetcher: MarketDataFetcher;

  beforeEach(() => {
    idbStore.clear();
    fetcher = new MarketDataFetcher();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns cached quote without fetching", async () => {
    const now = Date.now();
    vi.setSystemTime(now);

    (fetcher as any).cache.setQuote("RELIANCE", 2500, 2499, 2501, 100000, 2480, 2520, 2470, 2480);

    const result = await fetcher.fetch("RELIANCE");
    expect(result.price).toBe(2500);
    expect(result.bid).toBe(2499);
    expect(result.ask).toBe(2501);
  });

  it("fetches from remote when cache is empty", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        chart: {
          result: [{
            meta: {
              regularMarketPrice: 1800,
              regularMarketVolume: 50000,
              previousClose: 1790,
            },
            indicators: {
              quote: [{
                open: [1785],
                high: [1810],
                low: [1775],
                close: [1800],
              }],
            },
          }],
        },
      }),
    } as Response);

    const promise = fetcher.fetch("TCS");
    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;

    expect(result.price).toBe(1800);
    expect(result.open).toBe(1785);
    expect(result.high).toBe(1810);
    expect(result.low).toBe(1775);
    expect(fetchSpy).toHaveBeenCalled();
  });

  it("falls through providers on failure", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("yfinance down"))
      .mockRejectedValueOnce(new Error("indianapi down"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          payload: {
            lastPrice: 450,
            bid: 449,
            ask: 451,
            volume: 20000,
            open: 445,
            dayHigh: 455,
            dayLow: 442,
            previousClose: 448,
          },
        }),
      } as Response);

    const promise = fetcher.fetch("WIPRO");
    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;

    expect(result.price).toBe(450);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it("fails when all providers are down", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network error"));

    const promise = fetcher.fetch("FAIL");
    await vi.advanceTimersByTimeAsync(100);

    await expect(promise).rejects.toThrow();
  });

  it("rejects tampered cached data gracefully", async () => {
    const now = Date.now();
    vi.setSystemTime(now);

    (fetcher as any).cache.setQuote("RELIANCE", 2500, 2499, 2501, 100000, 2480, 2520, 2470, 2480);
    vi.advanceTimersByTime(4000000);

    const result = await fetcher.fetch("RELIANCE");
    expect(result.price).toBe(2500);
  });
});
