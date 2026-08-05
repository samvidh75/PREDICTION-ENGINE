// src/backtest/walkForwardStrategies.test.ts
import { describe, expect, it } from "vitest";
import { buildBacktestBars, momentumStrategy } from "./walkForwardStrategies";

describe("buildBacktestBars", () => {
  it("sorts rows ascending and normalizes dates to YYYY-MM-DD", () => {
    const bars = buildBacktestBars([
      { trade_date: "2026-03-01", adjusted_close: 110 },
      { trade_date: "2026-01-01", adjusted_close: 100 },
      { trade_date: "2026-02-01", adjusted_close: 105 },
    ]);
    expect(bars.map((b) => b.close)).toEqual([100, 105, 110]);
    expect(bars.map((b) => b.date)).toEqual(["2026-01-01", "2026-02-01", "2026-03-01"]);
  });

  it("falls back to close when adjusted_close is absent", () => {
    const bars = buildBacktestBars([{ trade_date: "2026-01-01", adjusted_close: null, close: 90 } as any]);
    expect(bars[0].close).toBe(90);
  });

  it("drops rows with non-positive or non-finite closes", () => {
    const bars = buildBacktestBars([
      { trade_date: "2026-01-01", adjusted_close: 100 },
      { trade_date: "2026-01-02", adjusted_close: -5 },
      { trade_date: "2026-01-03", adjusted_close: 0 },
      { trade_date: "2026-01-04", adjusted_close: Number.NaN },
      { trade_date: "2026-01-05", adjusted_close: 120 },
    ]);
    expect(bars.map((b) => b.close)).toEqual([100, 120]);
  });

  it("handles Date objects for trade_date", () => {
    const bars = buildBacktestBars([
      { trade_date: new Date("2026-02-01T00:00:00Z"), adjusted_close: 105 },
      { trade_date: new Date("2026-01-01T00:00:00Z"), adjusted_close: 100 },
    ]);
    expect(bars.map((b) => b.close)).toEqual([100, 105]);
  });

  it("returns empty array for empty or all-invalid input", () => {
    expect(buildBacktestBars([])).toEqual([]);
    expect(buildBacktestBars([{ trade_date: "2026-01-01", adjusted_close: 0 }])).toEqual([]);
  });
});

describe("momentumStrategy", () => {
  it("goes fully long when training-window mean return is positive", () => {
    expect(momentumStrategy([0.001, 0.002, 0.001])).toBe(1);
  });

  it("stays in cash when the mean return is non-positive", () => {
    expect(momentumStrategy([-0.001, 0.001, -0.002])).toBe(0);
    expect(momentumStrategy([-0.01, -0.01])).toBe(0);
  });

  it("returns 0 for empty training window", () => {
    expect(momentumStrategy([])).toBe(0);
  });
});
