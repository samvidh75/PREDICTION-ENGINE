import { describe, expect, it } from "vitest";
import type { FundamentalSnapshot, MarketPriceRecord } from "../../data/providers/types";
import { scoreSnapshot } from "../../data/scoring/scoreEngine";
import { validateMarketPriceRecords } from "../../data/validation/priceValidation";

const retrievedAt = "2026-06-12T00:00:00.000Z";

function prices(symbol: string, start: number, step: number, jitter = 0): MarketPriceRecord[] {
  return Array.from({ length: 35 }, (_, index) => {
    const close = start + step * index + (index % 2) * jitter;
    const date = new Date(Date.UTC(2026, 4, index + 1)).toISOString().slice(0, 10);
    return {
      symbol,
      tradingDate: date,
      open: close - 1,
      high: close + 2,
      low: close - 2,
      close,
      volume: 1000 + index,
      source: "fixture",
      retrievedAt,
    };
  });
}

function fundamental(symbol: string, overrides: Partial<FundamentalSnapshot>): FundamentalSnapshot {
  return {
    symbol,
    fiscalPeriod: "FY2026",
    asOfDate: "2026-03-31",
    revenue: null,
    operatingProfit: null,
    netProfit: null,
    totalAssets: null,
    totalDebt: null,
    equity: null,
    cashFlowFromOperations: null,
    eps: 10,
    peRatio: 20,
    pbRatio: 3,
    roe: 15,
    operatingMargin: 18,
    netMargin: 12,
    revenueGrowth: 10,
    earningsGrowth: 12,
    source: "fixture",
    retrievedAt,
    completenessScore: 100,
    ...overrides,
  };
}

describe("F1 score differentiation", () => {
  it("differentiates factor vectors and never fabricates missing inputs", () => {
    const highQuality = scoreSnapshot({ symbol: "HIGH", prices: prices("HIGH", 100, 2), fundamental: fundamental("HIGH", { roe: 28, operatingMargin: 32, netMargin: 22, revenueGrowth: 25, earningsGrowth: 30, peRatio: 15 }) });
    const leveragedDeclining = scoreSnapshot({ symbol: "WEAK", prices: prices("WEAK", 140, -1.5, 3), fundamental: fundamental("WEAK", { roe: 4, operatingMargin: 6, netMargin: 2, revenueGrowth: -15, earningsGrowth: -20, peRatio: 45, completenessScore: 80 }) });
    const momentumPositive = scoreSnapshot({ symbol: "MOMO", prices: prices("MOMO", 50, 3), fundamental: fundamental("MOMO", { revenueGrowth: 2, earningsGrowth: 1 }) });
    const momentumNegative = scoreSnapshot({ symbol: "DOWN", prices: prices("DOWN", 160, -2), fundamental: fundamental("DOWN", { revenueGrowth: 2, earningsGrowth: 1 }) });
    const insufficient = scoreSnapshot({ symbol: "MISS", prices: prices("MISS", 100, 1).slice(0, 5), fundamental: null });

    expect(highQuality.factors.quality_score.value).not.toEqual(leveragedDeclining.factors.quality_score.value);
    expect(highQuality.factors.growth_score.value).not.toEqual(leveragedDeclining.factors.growth_score.value);
    expect(momentumPositive.factors.momentum_score.value).not.toEqual(momentumNegative.factors.momentum_score.value);
    expect(momentumPositive.factors.risk_score.value).not.toEqual(momentumNegative.factors.risk_score.value);
    expect(insufficient.factors.quality_score.value).toBeNull();
    expect(insufficient.factors.value_score.value).toBeNull();
    expect(insufficient.factors.momentum_score.value).toBeNull();
    expect(insufficient.availability).not.toBe("real");
    expect(highQuality.confidenceScore).toBeGreaterThan(insufficient.confidenceScore);
    expect([highQuality, leveragedDeclining, momentumPositive, momentumNegative, insufficient].some((s) => s.factors.growth_score.value === -250)).toBe(false);

    const vectors = new Set([highQuality, leveragedDeclining, momentumPositive, momentumNegative, insufficient].map((s) => Object.values(s.factors).map((f) => f.value ?? "null").join("|")));
    expect(vectors.size).toBeGreaterThanOrEqual(3);
  });

  it("rejects zero price rows before scoring", () => {
    const invalid = prices("BAD", 100, 1);
    invalid.push({ ...invalid[0], tradingDate: "2026-06-07", open: 0, high: 0, low: 0, close: 0, volume: 0 });
    const validation = validateMarketPriceRecords(invalid);
    expect(validation.rejected.length).toBe(1);
    expect(validation.rejected[0].reason).toContain("open <= 0");
  });
});
