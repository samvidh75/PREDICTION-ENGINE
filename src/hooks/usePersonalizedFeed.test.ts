import { describe, expect, it, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePersonalizedFeed } from "./usePersonalizedFeed";

describe("usePersonalizedFeed", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("stockstory_self_learn_signals", JSON.stringify([]));
  });

  it("returns empty insights and topSymbols initially", () => {
    const { result } = renderHook(() => usePersonalizedFeed());
    expect(result.current.insights).toEqual([]);
    expect(result.current.topSymbols).toEqual([]);
  });

  it("returns top symbols from self-learning signals", () => {
    localStorage.setItem(
      "stockstory_self_learn_signals",
      JSON.stringify([
        { type: "save", symbol: "RELIANCE", timestamp: Date.now() },
        { type: "save", symbol: "TCS", timestamp: Date.now() },
      ]),
    );

    const { result } = renderHook(() => usePersonalizedFeed());
    expect(result.current.insights).toHaveLength(2);
    expect(result.current.insights[0].symbol).toBe("RELIANCE");
    expect(result.current.insights[1].symbol).toBe("TCS");
  });

  it("returns symbols sorted by affinity descending", () => {
    localStorage.setItem(
      "stockstory_self_learn_signals",
      JSON.stringify([
        { type: "save", symbol: "TOP", timestamp: Date.now() },
        { type: "view", symbol: "MID", timestamp: Date.now() },
        { type: "remove", symbol: "BOTTOM", timestamp: Date.now() },
      ]),
    );

    const { result } = renderHook(() => usePersonalizedFeed());
    expect(result.current.topSymbols[0]).toBe("TOP");
    expect(result.current.topSymbols[1]).toBe("MID");
  });
});
