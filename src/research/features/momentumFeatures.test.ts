import { describe, expect, it } from "vitest";
import { computeMomentumFeatures } from "./momentumFeatures";
import type { NormalizedCandle } from "../normalization/types";

/**
 * Build a synthetic candle series. `closes` are interpolated into
 * sequential business-ish dates so the sorter produces a stable order.
 */
function makeCandles(closes: number[]): NormalizedCandle[] {
  const base = new Date("2026-01-01T00:00:00Z").getTime();
  return closes.map((close, i) => ({
    date: new Date(base + i * 86400000).toISOString().slice(0, 10),
    close,
    high: close,
    low: close,
    open: close,
    volume: null,
  }));
}

/** Rising series: every trailing window is strongly positive (+~10%/5d). */
const rising = makeCandles(Array.from({ length: 130 }, (_, i) => 100 * Math.pow(1.02, i)));

/** Falling series: every trailing window is strongly negative (-~14%/5d). */
const falling = makeCandles(Array.from({ length: 130 }, (_, i) => 100 * Math.pow(0.97, i)));

describe("computeMomentumFeatures", () => {
  it("computes short and medium term scores (not hardcoded null)", () => {
    const r = computeMomentumFeatures(rising, 60);
    expect(r.shortTermScore).not.toBeNull();
    expect(r.mediumTermScore).not.toBeNull();
    expect(r.priceTrendScore).not.toBeNull();
  });

  it("scores a strong uptrend high across horizons", () => {
    const r = computeMomentumFeatures(rising, 60);
    expect(r.shortTermScore).toBe(80);
    expect(r.mediumTermScore).toBe(80);
    expect(r.priceTrendScore).toBe(80);
    expect(r.overallMomentum).not.toBeNull();
    if (r.overallMomentum !== null) expect(r.overallMomentum).toBeGreaterThanOrEqual(60);
  });

  it("scores a persistent downtrend low across horizons", () => {
    const r = computeMomentumFeatures(falling, 45);
    expect(r.shortTermScore).toBe(20);
    expect(r.mediumTermScore).toBe(20);
    expect(r.priceTrendScore).toBe(20);
  });

  it("leaves short/medium null when there are too few candles", () => {
    const sparse = makeCandles([100, 101, 102, 103, 104, 105, 106, 107, 108]);
    const r = computeMomentumFeatures(sparse, 50);
    expect(r.priceTrendScore).toBeNull(); // 20-day trend needs >=40 bars
    expect(r.shortTermScore).toBeNull();  // 5-day window needs >=10 bars
    expect(r.mediumTermScore).toBeNull(); // 60-day window needs >=120 bars
  });

  it("blends mediating scores and keeps confidence proportional to data", () => {
    const full = computeMomentumFeatures(rising, 60);
    expect(full.missingInputs.length).toBe(0);
    expect(full.confidence).toBe(100);

    // 10 rising candles: short-term computable, medium/trend not, no RS.
    const partial = computeMomentumFeatures(rising.slice(0, 10), null);
    expect(partial.shortTermScore).toBe(80);
    expect(partial.mediumTermScore).toBeNull();
    expect(partial.priceTrendScore).toBeNull();
    expect(partial.relativeStrengthScore).toBeNull();
    expect(partial.missingInputs).toContain("mediumTermHistory");
    expect(partial.confidence).toBeLessThan(100);
  });

  it("handles empty candle arrays gracefully", () => {
    const r = computeMomentumFeatures([], null);
    expect(r.overallMomentum).toBeNull();
    expect(r.priceTrendScore).toBeNull();
    expect(r.shortTermScore).toBeNull();
    expect(r.mediumTermScore).toBeNull();
    expect(r.missingInputs.length).toBeGreaterThan(0);
  });
});
