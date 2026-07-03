import { describe, expect, it, beforeEach, vi } from "vitest";
import { selfLearningEngine } from "./selfLearningEngine";

describe("SelfLearningEngine", () => {
  beforeEach(() => {
    localStorage.clear();
    selfLearningEngine.reset();
  });

  it("records a view signal and returns it as an insight", () => {
    selfLearningEngine.record({ type: "view", symbol: "RELIANCE" });

    const insights = selfLearningEngine.getInsights();
    expect(insights).toHaveLength(1);
    expect(insights[0].symbol).toBe("RELIANCE");
    expect(insights[0].interactionCount).toBe(1);
  });

  it("assigns weight 5 for saves", () => {
    selfLearningEngine.record({ type: "save", symbol: "TCS" });
    const insights = selfLearningEngine.getInsights();
    expect(insights[0].affinity).toBe(5);
  });

  it("assigns weight 3 for searches", () => {
    selfLearningEngine.record({ type: "search", symbol: "INFY" });
    const insights = selfLearningEngine.getInsights();
    expect(insights[0].affinity).toBe(3);
  });

  it("assigns weight 2 for clicks", () => {
    selfLearningEngine.record({ type: "click", symbol: "HDFCBANK" });
    const insights = selfLearningEngine.getInsights();
    expect(insights[0].affinity).toBe(2);
  });

  it("assigns weight 1 for views", () => {
    selfLearningEngine.record({ type: "view", symbol: "WIPRO" });
    const insights = selfLearningEngine.getInsights();
    expect(insights[0].affinity).toBe(1);
  });

  it("assigns weight -3 for removes", () => {
    selfLearningEngine.record({ type: "remove", symbol: "ITC" });
    const insights = selfLearningEngine.getInsights();
    expect(insights[0].affinity).toBe(0);
  });

  it("accumulates multiple signals for the same symbol", () => {
    selfLearningEngine.record({ type: "view", symbol: "RELIANCE" });
    selfLearningEngine.record({ type: "click", symbol: "RELIANCE" });
    selfLearningEngine.record({ type: "view", symbol: "RELIANCE" });

    const insights = selfLearningEngine.getInsights();
    expect(insights).toHaveLength(1);
    expect(insights[0].interactionCount).toBe(3);
    expect(insights[0].affinity).toBe(4);
  });

  it("sorts insights by affinity descending", () => {
    selfLearningEngine.record({ type: "save", symbol: "TOP" });
    selfLearningEngine.record({ type: "view", symbol: "MID" });
    selfLearningEngine.record({ type: "remove", symbol: "BOTTOM" });

    const symbols = selfLearningEngine.getInsights().map((i) => i.symbol);
    expect(symbols).toEqual(["TOP", "MID", "BOTTOM"]);
  });

  it("returns top symbols via getTopSymbols", () => {
    selfLearningEngine.record({ type: "save", symbol: "A" });
    selfLearningEngine.record({ type: "save", symbol: "B" });
    selfLearningEngine.record({ type: "save", symbol: "C" });

    const top = selfLearningEngine.getTopSymbols(2);
    expect(top).toHaveLength(2);
  });

  it("resets all signals", () => {
    selfLearningEngine.record({ type: "save", symbol: "RELIANCE" });
    selfLearningEngine.reset();
    expect(selfLearningEngine.getInsights()).toHaveLength(0);
  });

  it("uses custom weight when provided", () => {
    selfLearningEngine.record({ type: "view", symbol: "CUSTOM", weight: 10 });
    const insights = selfLearningEngine.getInsights();
    expect(insights[0].affinity).toBe(10);
  });

  it("discards signals older than 90 days", () => {
    const oldSignal = { type: "save" as const, symbol: "OLD", timestamp: Date.now() - 100 * 24 * 60 * 60 * 1000 };
    localStorage.setItem("stockstory_self_learn_signals", JSON.stringify([oldSignal]));

    const insights = selfLearningEngine.getInsights();
    expect(insights).toHaveLength(0);
  });

  it("detects rising trend for recent high-activity symbols", () => {
    selfLearningEngine.record({ type: "view", symbol: "HOT" });
    selfLearningEngine.record({ type: "click", symbol: "HOT" });
    selfLearningEngine.record({ type: "save", symbol: "HOT" });

    const insights = selfLearningEngine.getInsights();
    expect(insights[0].trend).toBe("rising");
  });

  it("detects decaying trend for old last-interaction symbols", () => {
    const oldSignal = { type: "view" as const, symbol: "COLD", timestamp: Date.now() - 30 * 24 * 60 * 60 * 1000 };
    localStorage.setItem("stockstory_self_learn_signals", JSON.stringify([oldSignal]));

    const insights = selfLearningEngine.getInsights();
    expect(insights[0].trend).toBe("decaying");
  });

  it("handles empty signals gracefully", () => {
    expect(selfLearningEngine.getInsights()).toEqual([]);
    expect(selfLearningEngine.getTopSymbols()).toEqual([]);
  });
});
