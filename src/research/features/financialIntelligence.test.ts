import { describe, expect, it } from "vitest";
import {
  computeROAScore,
  computeDividendYieldScore,
  computeMarketCapScore,
  computeFinancialIntelligence,
} from "./financialIntelligence";
import type { NormalizedFundamentals } from "../normalization/types";

function makeF(overrides: Partial<NormalizedFundamentals> = {}): NormalizedFundamentals {
  return {
    symbol: "TEST", peRatio: null, pbRatio: null, evEbitda: null, dividendYield: null,
    eps: null, bookValue: null, roe: null, roa: null, roic: null, debtToEquity: null,
    currentRatio: null, grossMargin: null, operatingMargin: null, netMargin: null,
    revenueGrowth: null, profitGrowth: null, epsGrowth: null, sales: null, netProfit: null,
    operatingProfit: null, totalAssets: null, totalDebt: null, equity: null, cashFlow: null,
    freeCashFlow: null, timestamp: "", sourceSuccess: true, ...overrides,
  };
}

describe("computeROAScore", () => {
  it("returns null for null input", () => {
    expect(computeROAScore(null)).toBeNull();
  });

  it("returns 85 for ROA >= 15", () => {
    expect(computeROAScore(20)).toBe(85);
    expect(computeROAScore(15)).toBe(85);
  });

  it("returns 70 for ROA 10-14.99", () => {
    expect(computeROAScore(12)).toBe(70);
    expect(computeROAScore(10)).toBe(70);
  });

  it("returns 55 for ROA 7-9.99", () => {
    expect(computeROAScore(8)).toBe(55);
    expect(computeROAScore(7)).toBe(55);
  });

  it("returns 40 for ROA 4-6.99", () => {
    expect(computeROAScore(5)).toBe(40);
  });

  it("returns 25 for ROA 0-3.99", () => {
    expect(computeROAScore(2)).toBe(25);
    expect(computeROAScore(0)).toBe(25);
  });

  it("returns 10 for negative ROA", () => {
    expect(computeROAScore(-5)).toBe(10);
  });

  it("handles non-finite values", () => {
    expect(computeROAScore(NaN)).toBeNull();
    expect(computeROAScore(Infinity)).toBeNull();
  });
});

describe("computeDividendYieldScore", () => {
  it("returns null for null input", () => {
    expect(computeDividendYieldScore(null)).toBeNull();
  });

  it("returns 85 for yield 4-5.99%", () => {
    expect(computeDividendYieldScore(5)).toBe(85);
    expect(computeDividendYieldScore(4)).toBe(85);
  });

  it("returns 75 for yield 3-3.99%", () => {
    expect(computeDividendYieldScore(3.5)).toBe(75);
    expect(computeDividendYieldScore(3)).toBe(75);
  });

  it("returns 60 for yield 2-2.99%", () => {
    expect(computeDividendYieldScore(2.5)).toBe(60);
  });

  it("returns 45 for yield 1-1.99%", () => {
    expect(computeDividendYieldScore(1.5)).toBe(45);
  });

  it("returns 30 for yield >0 to 0.99%", () => {
    expect(computeDividendYieldScore(0.5)).toBe(30);
  });

  it("returns 10 for zero yield", () => {
    expect(computeDividendYieldScore(0)).toBe(10);
  });

  it("returns 70 for very high yield (>=6%) as potential distress signal", () => {
    expect(computeDividendYieldScore(8)).toBe(70);
    expect(computeDividendYieldScore(6)).toBe(70);
  });
});

describe("computeMarketCapScore", () => {
  it("returns null for null input", () => {
    expect(computeMarketCapScore(null)).toBeNull();
  });

  it("returns null for non-positive market cap", () => {
    expect(computeMarketCapScore(0)).toBeNull();
    expect(computeMarketCapScore(-100)).toBeNull();
  });

  it("returns 90 for mega-cap (>= 200K Cr)", () => {
    expect(computeMarketCapScore(200000 * 10000000)).toBe(90);
  });

  it("returns 80 for large-cap (50K-200K Cr)", () => {
    expect(computeMarketCapScore(100000 * 10000000)).toBe(80);
    expect(computeMarketCapScore(50000 * 10000000)).toBe(80);
  });

  it("returns 55 for mid-cap (5K-20K Cr)", () => {
    expect(computeMarketCapScore(10000 * 10000000)).toBe(55);
  });

  it("returns 40 for small-cap (1K-5K Cr)", () => {
    expect(computeMarketCapScore(2000 * 10000000)).toBe(40);
  });

  it("returns 15 for nano-cap (< 100 Cr)", () => {
    expect(computeMarketCapScore(50 * 10000000)).toBe(15);
  });
});

describe("computeFinancialIntelligence", () => {
  it("returns all scores for complete inputs", () => {
    const f = makeF({ roa: 12, dividendYield: 3.5 });
    const r = computeFinancialIntelligence(f, 100000 * 10000000);
    expect(r.roaScore).toBe(70);
    expect(r.dividendYieldScore).toBe(75);
    expect(r.marketCapScore).toBe(80);
    expect(r.overallFinancialScore).not.toBeNull();
    expect(r.confidence).toBe(100);
    expect(r.missingInputs.length).toBe(0);
  });

  it("returns null overall when no inputs", () => {
    const r = computeFinancialIntelligence(makeF());
    expect(r.roaScore).toBeNull();
    expect(r.dividendYieldScore).toBeNull();
    expect(r.marketCapScore).toBeNull();
    expect(r.overallFinancialScore).toBeNull();
    expect(r.confidence).toBe(0);
  });

  it("computes overall from partial data (≥2 inputs)", () => {
    const r = computeFinancialIntelligence(makeF({ roa: 8, dividendYield: 2 }));
    expect(r.roaScore).toBe(55);
    expect(r.dividendYieldScore).toBe(60);
    expect(r.marketCapScore).toBeNull();
    // 2 inputs present → enough for overall
    expect(r.overallFinancialScore).not.toBeNull();
    expect(r.confidence).toBe(67);
  });

  it("returns null overall with only 1 input", () => {
    const r = computeFinancialIntelligence(makeF({ roa: 12 }));
    expect(r.roaScore).toBe(70);
    expect(r.dividendYieldScore).toBeNull();
    expect(r.marketCapScore).toBeNull();
    expect(r.overallFinancialScore).toBeNull();
    expect(r.confidence).toBe(33);
  });

  it("uses marketCap from fundamentals when external not provided", () => {
    const f = makeF({ roa: 12, dividendYield: 3, marketCap: 50000 * 10000000 });
    const r = computeFinancialIntelligence(f);
    expect(r.marketCapScore).toBe(80);
  });

  it("prefers external marketCap over fundamentals", () => {
    const f = makeF({ roa: 12, dividendYield: 3, marketCap: 100 * 10000000 });
    const r = computeFinancialIntelligence(f, 50000 * 10000000);
    expect(r.marketCapScore).toBe(80);
  });

  it("reports missing inputs", () => {
    const r = computeFinancialIntelligence(makeF({ roa: 10 }));
    expect(r.missingInputs).toContain("dividendYield");
    expect(r.missingInputs).toContain("marketCap");
    expect(r.missingInputs).not.toContain("roa");
  });

  it("no Buy/Sell/provider wording in output", () => {
    const f = makeF({ roa: 15, dividendYield: 4, marketCap: 200000 * 10000000 });
    const r = computeFinancialIntelligence(f);
    const json = JSON.stringify(r);
    expect(json).not.toMatch(/buy|sell|hold|strong buy|target price|guaranteed|multibagger|provider|backend|source|diagnostic/i);
  });
});
