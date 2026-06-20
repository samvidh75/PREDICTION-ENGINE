import { describe, it, expect } from "vitest";
import {
  FACTOR_REGISTRY,
  getActiveFactors,
  getFactorById,
  getActiveFactorCount,
  getCategoryCounts,
  getDimensionCounts,
} from "./FactorRegistry";

describe("FactorRegistry", () => {
  it("has at least 200 factor definitions", () => {
    expect(FACTOR_REGISTRY.length).toBeGreaterThanOrEqual(200);
  });

  it("has unique factor IDs", () => {
    const ids = FACTOR_REGISTRY.map((f) => f.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("every factor has required metadata properties", () => {
    for (const f of FACTOR_REGISTRY) {
      expect(f.id).toBeTruthy();
      expect(f.publicName).toBeTruthy();
      expect(f.description).toBeTruthy();
      expect(f.category).toBeTruthy();
      expect(f.dimension).toBeTruthy();
      expect(f.directionality).toBeTruthy();
      expect(f.requiredRawInputs).toBeInstanceOf(Array);
      expect(f.unit).toBeTruthy();
      expect(f.normalization).toBeTruthy();
      expect(f.missingDataBehavior).toBeTruthy();
      expect(f.status).toBeTruthy();
      expect(typeof f.displayable).toBe("boolean");
      expect(typeof f.minDataDays).toBe("number");
      expect(f.confidenceImpact).toBeTruthy();
      expect(typeof f.staleAfterDays).toBe("number");
    }
  });

  it("every factor has valid category", () => {
    const valid = [
      "profitability_and_margins",
      "growth_quality",
      "balance_sheet_and_solvency",
      "cash_flow_quality",
      "valuation_context",
      "price_momentum_and_trend",
      "volatility_and_risk",
      "liquidity_and_market_quality",
      "capital_allocation_and_dividend",
      "sector_and_peer_relative",
      "data_quality_and_confidence",
    ];
    for (const f of FACTOR_REGISTRY) {
      expect(valid).toContain(f.category);
    }
  });

  it("every factor has valid dimension", () => {
    const valid = [
      "business_quality", "financial_strength", "growth_quality",
      "valuation_context", "risk_context", "momentum",
      "stability", "capital_efficiency", "data_confidence",
    ];
    for (const f of FACTOR_REGISTRY) {
      expect(valid).toContain(f.dimension);
    }
  });

  it("every factor has valid status", () => {
    const valid = ["active", "inactive_missing_data", "inactive_not_supported", "experimental_internal", "deprecated"];
    for (const f of FACTOR_REGISTRY) {
      expect(valid).toContain(f.status);
    }
  });

  it("every factor has valid directionality", () => {
    const valid = ["higher_is_better", "lower_is_better", "range_is_better", "context_dependent"];
    for (const f of FACTOR_REGISTRY) {
      expect(valid).toContain(f.directionality);
    }
  });

  it("active factors have displayable property", () => {
    for (const f of getActiveFactors()) {
      expect(typeof f.displayable).toBe("boolean");
    }
  });

  it("inactive factors cannot affect score (status check)", () => {
    const inactive = FACTOR_REGISTRY.filter(
      (f) => f.status !== "active"
    );
    for (const f of inactive) {
      expect(f.status).toMatch(/^inactive_|experimental_|deprecated/);
    }
  });

  it("getFactorById returns correct factor", () => {
    const f = getFactorById("gross_margin");
    expect(f).toBeDefined();
    expect(f!.id).toBe("gross_margin");
  });

  it("getFactorById returns undefined for missing", () => {
    expect(getFactorById("nonexistent_factor")).toBeUndefined();
  });

  it("getActiveFactorCount returns at least 50 active factors", () => {
    expect(getActiveFactorCount()).toBeGreaterThanOrEqual(50);
  });

  it("factor coverage ratio is computable", () => {
    const total = FACTOR_REGISTRY.length;
    const active = getActiveFactorCount();
    const ratio = active / total;
    expect(ratio).toBeGreaterThan(0);
    expect(ratio).toBeLessThanOrEqual(1);
  });

  it("no factor has NaN or Infinity in numeric fields", () => {
    for (const f of FACTOR_REGISTRY) {
      expect(Number.isFinite(f.minDataDays)).toBe(true);
      expect(Number.isFinite(f.staleAfterDays)).toBe(true);
      if (f.winsorizeMin !== undefined) expect(Number.isFinite(f.winsorizeMin)).toBe(true);
      if (f.winsorizeMax !== undefined) expect(Number.isFinite(f.winsorizeMax)).toBe(true);
    }
  });

  it("getCategoryCounts returns expected categories", () => {
    const counts = getCategoryCounts();
    expect(Object.keys(counts).length).toBe(11);
    for (const [cat, c] of Object.entries(counts)) {
      expect(c.total).toBeGreaterThanOrEqual(10);
      expect(c.active).toBeGreaterThanOrEqual(0);
    }
  });

  it("getDimensionCounts returns expected dimensions", () => {
    const counts = getDimensionCounts();
    expect(Object.keys(counts).length).toBe(9);
    for (const [, c] of Object.entries(counts)) {
      expect(c.total).toBeGreaterThanOrEqual(5);
    }
  });

  it("every category has at least its minimum target count", () => {
    const counts = getCategoryCounts();
    const minTargets: Record<string, number> = {
      profitability_and_margins: 20,
      growth_quality: 25,
      balance_sheet_and_solvency: 25,
      cash_flow_quality: 20,
      valuation_context: 30,
      price_momentum_and_trend: 30,
      volatility_and_risk: 25,
      liquidity_and_market_quality: 15,
      capital_allocation_and_dividend: 15,
      sector_and_peer_relative: 20,
      data_quality_and_confidence: 20,
    };
    for (const [cat, min] of Object.entries(minTargets)) {
      expect(counts[cat]?.total ?? 0).toBeGreaterThanOrEqual(min);
    }
  });
});
