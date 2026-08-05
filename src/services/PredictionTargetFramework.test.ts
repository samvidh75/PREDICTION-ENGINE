// src/services/PredictionTargetFramework.test.ts
import { describe, expect, it } from "vitest";
import { predictionTargetFramework, PredictionTargetFramework } from "./PredictionTargetFramework";

describe("PredictionTargetFramework.estimateDrawdownProbability", () => {
  it("is deterministic for a fixed seed", () => {
    const a = predictionTargetFramework.estimateDrawdownProbability(0.3, 30, 0.05, 4000, 123);
    const b = predictionTargetFramework.estimateDrawdownProbability(0.3, 30, 0.05, 4000, 123);
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThanOrEqual(1);
  });

  it("returns a continuous (non-binary) probability", () => {
    const p = predictionTargetFramework.estimateDrawdownProbability(0.5, 30, 0.05, 8000, 7);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });

  it("higher volatility implies a higher drawdown probability", () => {
    const low = predictionTargetFramework.estimateDrawdownProbability(0.1, 30, 0.05, 4000, 5);
    const high = predictionTargetFramework.estimateDrawdownProbability(0.8, 30, 0.05, 4000, 5);
    expect(high).toBeGreaterThan(low);
  });

  it("a tighter threshold yields a higher drawdown probability", () => {
    const loose = predictionTargetFramework.estimateDrawdownProbability(0.3, 30, 0.15, 4000, 9);
    const tight = predictionTargetFramework.estimateDrawdownProbability(0.3, 30, 0.02, 4000, 9);
    expect(tight).toBeGreaterThan(loose);
  });

  it("handles tiny/near-zero volatility without NaN", () => {
    const p = predictionTargetFramework.estimateDrawdownProbability(0, 30, 0.05, 1000, 3);
    expect(Number.isFinite(p)).toBe(true);
  });
});

describe("PredictionTargetFramework.calculateTargets", () => {
  const framework = new PredictionTargetFramework();

  it("returns null when there is no 7-day look-ahead", () => {
    const prices = Array.from({ length: 10 }, (_, i) => ({ close: 100 + i }));
    expect(framework.calculateTargets(prices, [0.15, 0.15, 0.15], 9)).toBeNull();
  });

  it("computes correct forward returns", () => {
    // prices go 100,101,...,107 => 7D return = +7%, 30D/90D unavailable (only 10 bars)
    const prices = Array.from({ length: 10 }, (_, i) => ({ close: 100 + i }));
    const t = framework.calculateTargets(prices, [0.2], 0)!;
    expect(t.return7D).toBeCloseTo((107 - 100) / 100, 6);
    expect(t.drawdownProbability30D).toBeGreaterThan(0);
    expect(t.drawdownProbability30D).toBeLessThanOrEqual(1);
  });

  it("produces a bounded, finite 30-day drawdown probability", () => {
    const prices = Array.from({ length: 120 }, (_, i) => ({ close: 100 + i * 0.5 }));
    const t = framework.calculateTargets(prices, [0.25], 0)!;
    expect(Number.isFinite(t.drawdownProbability30D)).toBe(true);
    expect(Number.isFinite(t.riskAdjustedReturn30D)).toBe(true);
  });
});
