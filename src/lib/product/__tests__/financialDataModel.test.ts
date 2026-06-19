import { describe, expect, it } from "vitest";
import {
  buildFinancialGroups,
  interpretValuation,
  interpretMargin,
  formatRatio,
  formatPercent,
  formatCurrency,
} from "../financialDataModel";

describe("financialDataModel", () => {
  describe("interpretValuation", () => {
    it("returns limited context when all null", () => {
      const result = interpretValuation(null, null, null);
      expect(result).toContain("limited");
    });

    it("interprets high PE", () => {
      const result = interpretValuation(45, null, null);
      expect(result).toContain("elevated");
    });

    it("interprets moderate PE", () => {
      const result = interpretValuation(30, null, null);
      expect(result).toContain("moderately above");
    });

    it("interprets low PE", () => {
      const result = interpretValuation(8, null, null);
      expect(result).toContain("below typical");
    });

    it("interprets high PB", () => {
      const result = interpretValuation(null, 6, null);
      expect(result).toContain("premium");
    });
  });

  describe("interpretMargin", () => {
    it("returns strong for high margin", () => {
      expect(interpretMargin(0.35, "Gross margin")).toContain("strong");
    });

    it("returns healthy for moderate margin", () => {
      expect(interpretMargin(0.2, "Operating margin")).toContain("healthy");
    });

    it("returns negative for negative margin", () => {
      expect(interpretMargin(-0.05, "Net margin")).toContain("negative");
    });

    it("returns null for null margin", () => {
      expect(interpretMargin(null, "Test")).toBeNull();
    });
  });

  describe("formatRatio", () => {
    it("formats valid number", () => {
      expect(formatRatio(25.5)).toBe("25.50");
    });
    it("returns null for null", () => {
      expect(formatRatio(null)).toBeNull();
    });
    it("returns null for Infinity", () => {
      expect(formatRatio(Infinity)).toBeNull();
    });
  });

  describe("formatPercent", () => {
    it("formats decimal as percentage", () => {
      expect(formatPercent(0.15)).toBe("15.0%");
    });
    it("returns null for null", () => {
      expect(formatPercent(null)).toBeNull();
    });
  });

  describe("formatCurrency", () => {
    it("formats in crore", () => {
      const result = formatCurrency(150000000);
      expect(result).toContain("Cr");
    });
    it("formats in lakh", () => {
      const result = formatCurrency(500000);
      expect(result).toContain("L");
    });
    it("returns null for null", () => {
      expect(formatCurrency(null)).toBeNull();
    });
  });

  describe("buildFinancialGroups", () => {
    it("returns empty array for null snapshot", () => {
      expect(buildFinancialGroups(null)).toEqual([]);
    });

    it("builds groups from snapshot data", () => {
      const groups = buildFinancialGroups({
        symbol: "TEST", marketCap: 100000, peRatio: 20, pbRatio: 3, evEbitda: 12,
        dividendYield: 0.02, eps: 10, bookValue: 50, roe: 0.18, roa: 0.08, roic: 0.14,
        debtToEquity: 0.5, currentRatio: 1.5, grossMargin: 0.35, operatingMargin: 0.2,
        netMargin: 0.12, revenueGrowth: 0.1, profitGrowth: 0.08, epsGrowth: 0.12,
        sales: 500000, netProfit: 60000,
      });
      expect(groups.length).toBeGreaterThan(0);
      const allMetrics = groups.flatMap((g) => g.metrics);
      expect(allMetrics.length).toBeGreaterThan(0);
    });

    it("omits missing fields from groups", () => {
      const groups = buildFinancialGroups({
        symbol: "TEST", marketCap: null, peRatio: null, pbRatio: null, evEbitda: null,
        dividendYield: null, eps: null, bookValue: null, roe: null, roa: null, roic: null,
        debtToEquity: null, currentRatio: null, grossMargin: null, operatingMargin: null,
        netMargin: null, revenueGrowth: null, profitGrowth: null, epsGrowth: null,
        sales: null, netProfit: null,
      });
      expect(groups.length).toBe(0);
    });

    it("does not leak provider/backend terms", () => {
      const groups = buildFinancialGroups({
        symbol: "TEST", marketCap: 100000, peRatio: 20, pbRatio: 3, evEbitda: 12,
        dividendYield: 0.02, eps: 10, bookValue: 50, roe: 0.18, roa: 0.08, roic: 0.14,
        debtToEquity: 0.5, currentRatio: 1.5, grossMargin: 0.35, operatingMargin: 0.2,
        netMargin: 0.12, revenueGrowth: 0.1, profitGrowth: 0.08, epsGrowth: 0.12,
        sales: 500000, netProfit: 60000,
      });
      const json = JSON.stringify(groups);
      expect(json).not.toMatch(/provider|backend|api|source/i);
    });
  });
});
