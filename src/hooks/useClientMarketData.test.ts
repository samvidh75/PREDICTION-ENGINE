import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useClientMarketData } from "./useClientMarketData";

vi.mock("../lib/client/marketDataFetcher", () => ({
  marketDataFetcher: {
    fetch: vi.fn(),
  },
}));

import { marketDataFetcher } from "../lib/client/marketDataFetcher";

const mockFetch = marketDataFetcher.fetch as ReturnType<typeof vi.fn>;

describe("useClientMarketData", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("returns loading state initially", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useClientMarketData("RELIANCE"));
    expect(result.current.loading).toBe(true);
    expect(result.current.quote).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("returns quote data on success", async () => {
    const quote = {
      price: 2500,
      bid: 2499,
      ask: 2501,
      volume: 100000,
      open: 2480,
      high: 2520,
      low: 2470,
      prevClose: 2480,
    };
    mockFetch.mockResolvedValue(quote);

    const { result } = renderHook(() => useClientMarketData("RELIANCE"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.quote).toEqual(quote);
    expect(result.current.error).toBeNull();
  });

  it("sets error on failure", async () => {
    mockFetch.mockRejectedValue(new Error("fetch failed"));

    const { result } = renderHook(() => useClientMarketData("FAIL"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.quote).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error!.message).toBe("fetch failed");
  });

  it("refetches when symbol changes", async () => {
    mockFetch.mockResolvedValue({ price: 100 } as any);

    const { result, rerender } = renderHook(
      ({ symbol }: { symbol: string }) => useClientMarketData(symbol),
      { initialProps: { symbol: "RELIANCE" } },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.quote?.price).toBe(100);

    mockFetch.mockResolvedValue({ price: 200 } as any);
    rerender({ symbol: "TCS" });

    await waitFor(() => expect(result.current.quote?.price).toBe(200));
  });
});
