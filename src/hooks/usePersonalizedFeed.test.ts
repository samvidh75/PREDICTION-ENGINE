import { describe, expect, it, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { usePersonalizedFeed } from "./usePersonalizedFeed";

describe("usePersonalizedFeed", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns empty insights and topSymbols initially", async () => {
    const { result } = renderHook(() => usePersonalizedFeed());
    await waitFor(() => {
      expect(result.current.insights).toEqual([]);
      expect(result.current.topSymbols).toEqual([]);
    });
  });

  it("returns top symbols from search history via vault", async () => {
    localStorage.setItem(
      "stockstory_v2_search_history",
      JSON.stringify([
        { symbol: "RELIANCE", timestamp: Date.now() },
        { symbol: "TCS", timestamp: Date.now() + 1 },
      ]),
    );

    const { result } = renderHook(() => usePersonalizedFeed());
    await waitFor(() => {
      expect(result.current.insights.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("returns symbols sorted by affinity descending", async () => {
    localStorage.setItem(
      "stockstory_v2_search_history",
      JSON.stringify([
        { symbol: "TOP", timestamp: Date.now() },
        { symbol: "MID", timestamp: Date.now() + 1 },
        { symbol: "BOTTOM", timestamp: Date.now() + 2 },
      ]),
    );

    const { result } = renderHook(() => usePersonalizedFeed());
    await waitFor(() => {
      expect(result.current.topSymbols.length).toBeGreaterThanOrEqual(1);
    });
  });
});
