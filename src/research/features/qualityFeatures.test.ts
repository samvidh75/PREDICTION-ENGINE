import { describe, expect, it } from "vitest";
import { computeQualityFeatures } from "./qualityFeatures";
import type { NormalizedFundamentals } from "../normalization/types";

function makeF(overrides: Partial<NormalizedFundamentals> = {}): NormalizedFundamentals {
  return { symbol: "TEST", peRatio: null, pbRatio: null, evEbitda: null, dividendYield: null, eps: null, bookValue: null, roe: null, roa: null, roic: null, debtToEquity: null, currentRatio: null, grossMargin: null, operatingMargin: null, netMargin: null, revenueGrowth: null, profitGrowth: null, epsGrowth: null, sales: null, netProfit: null, operatingProfit: null, totalAssets: null, totalDebt: null, equity: null, cashFlow: null, freeCashFlow: null, timestamp: "", sourceSuccess: true, ...overrides };
}

describe("computeQualityFeatures", () => {
  it("returns null overallQuality for all-null inputs", () => {
    const r = computeQualityFeatures(makeF({ roe: null, roa: null }));
    expect(r.overallQuality).toBeNull();
    expect(r.confidence).toBe(0);
  });

  it("scores high ROE", () => {
    const r = computeQualityFeatures(makeF({ roe: 25, roa: 15, grossMargin: 60, operatingMargin: 25, debtToEquity: 0.2 }));
    expect(r.overallQuality).not.toBeNull();
    if (r.overallQuality !== null) {
      expect(r.overallQuality).toBeGreaterThanOrEqual(60);
    }
    expect(r.missingInputs.length).toBe(0);
  });

  it("handles partial data gracefully", () => {
    const r = computeQualityFeatures(makeF({ roe: 18, grossMargin: 45 }));
    expect(r.overallQuality).not.toBeNull();
    expect(r.missingInputs.length).toBeGreaterThan(0);
  });
});
