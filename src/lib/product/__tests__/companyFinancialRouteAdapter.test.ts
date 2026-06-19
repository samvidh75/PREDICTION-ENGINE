import { describe, expect, it } from "vitest";
import { buildCompanyRouteData } from "../companyFinancialRouteAdapter";

describe("companyFinancialRouteAdapter", () => {
  it("returns empty sections for null data", () => {
    const result = buildCompanyRouteData(null, null, 0);
    expect(result.sections.fundamentals).toBe(false);
    expect(result.sections.valuation).toBe(false);
    expect(result.sections.risk).toBe(false);
    expect(result.groups.length).toBe(0);
  });

  it("builds fundamentals from available data", () => {
    const result = buildCompanyRouteData(
      { grossMargin: 0.35, operatingMargin: 0.2, netMargin: 0.12, roe: 0.18, roic: 0.14,
        peRatio: null, pbRatio: null, evEbitda: null, dividendYield: null,
        revenueGrowth: null, profitGrowth: null, epsGrowth: null,
        debtToEquity: null, currentRatio: null },
      null, 0,
    );
    expect(result.sections.fundamentals).toBe(true);
    expect(result.groups.length).toBeGreaterThan(0);
  });

  it("builds valuation context when metrics exist", () => {
    const result = buildCompanyRouteData(
      { grossMargin: null, operatingMargin: null, netMargin: null, roe: null, roic: null,
        peRatio: 20, pbRatio: 3, evEbitda: 12, dividendYield: 0.02,
        revenueGrowth: null, profitGrowth: null, epsGrowth: null,
        debtToEquity: null, currentRatio: null },
      null, 0,
    );
    expect(result.valuation).not.toBeNull();
    expect(result.valuation!.peRatio).not.toBeNull();
    expect(result.sections.valuation).toBe(true);
  });

  it("builds risk context from factor scores", () => {
    const result = buildCompanyRouteData(
      { grossMargin: null, operatingMargin: null, netMargin: null, roe: null, roic: null,
        peRatio: null, pbRatio: null, evEbitda: null, dividendYield: null,
        revenueGrowth: null, profitGrowth: null, epsGrowth: null,
        debtToEquity: null, currentRatio: null },
      { risk: 35, quality: 80, growth: 70, momentum: 60, valuation: 50 },
      0,
    );
    expect(result.risk).not.toBeNull();
    expect(result.sections.risk).toBe(true);
    expect(result.risk!.keyRiskFlags.length).toBeGreaterThan(0);
  });

  it("detects peers when count > 0", () => {
    const result = buildCompanyRouteData(null, null, 5);
    expect(result.sections.peers).toBe(true);
  });

  it("does not leak provider/backend vocabulary", () => {
    const result = buildCompanyRouteData(
      { grossMargin: 0.35, operatingMargin: 0.2, netMargin: 0.12, roe: 0.18, roic: 0.14,
        peRatio: 20, pbRatio: 3, evEbitda: 12, dividendYield: 0.02,
        revenueGrowth: 0.1, profitGrowth: 0.08, epsGrowth: 0.12,
        debtToEquity: 0.5, currentRatio: 1.5 },
      { risk: 50, quality: 80, growth: 70, momentum: 60, valuation: 50 },
      5,
    );
    const json = JSON.stringify(result);
    expect(json).not.toMatch(/provider|backend|api|source/i);
  });
});
