import { describe, expect, it } from "vitest";
import { computeTechnicalIndicators } from "./TechnicalIndicatorComputer";

describe("computeTechnicalIndicators session integrity", () => {
  it("rejects weekend and future candles and deduplicates dates", () => {
    const candles = [
      { date: "2026-06-18", open: 100, high: 103, low: 99, close: 102, volume: 10 },
      { date: "2026-06-19", open: 102, high: 104, low: 101, close: 103, volume: 12 },
      { date: "2026-06-19", open: 103, high: 105, low: 102, close: 104, volume: 13 },
      { date: "2026-06-20", open: 104, high: 104, low: 104, close: 104, volume: 20 },
      { date: "2099-06-22", open: 104, high: 106, low: 103, close: 105, volume: 14 },
    ];
    const result = computeTechnicalIndicators("TEST", candles);
    expect(result.snapshot.asOf).toBe("2026-06-19");
  });
});
