import { describe, it, expect } from "vitest";
import { buildProductIdentity, buildProductActionResult, runFullResearchRuntime, isEmptyMetrics } from "../productRuntime";

describe("buildProductIdentity", () => {
  it("emits one identity model with displayName", () => {
    const id = buildProductIdentity("RELIANCE", "Reliance Industries Ltd", "Energy");
    expect(id.symbol).toBe("RELIANCE");
    expect(id.companyName).toBe("Reliance Industries Ltd");
    expect(id.displayName).toBe("Reliance Industries Ltd");
    expect(id.sector).toBe("Energy");
  });

  it("collapses companyName to symbol when name equals symbol", () => {
    const id = buildProductIdentity("ITC", "ITC", null);
    expect(id.displayName).toBe("ITC");
    expect(id.companyName).toBe("ITC");
  });

  it("handles missing companyName gracefully", () => {
    const id = buildProductIdentity("TCS", null, "Technology");
    expect(id.displayName).toBe("TCS");
  });
});

describe("buildProductActionResult", () => {
  it("creates actionable state when data exists", () => {
    const actions = buildProductActionResult(false, true);
    expect(actions.canInvest).toBe(true);
    expect(actions.canTrack).toBe(true);
    expect(actions.canCompare).toBe(true);
    expect(actions.trackLabel).toBe("Track");
    expect(actions.investLabel).toBe("Invest");
  });

  it("shows tracked label when tracked", () => {
    const actions = buildProductActionResult(true, true);
    expect(actions.trackLabel).toBe("Tracked");
  });
});

describe("isEmptyMetrics", () => {
  it("returns true for null/undefined", () => {
    expect(isEmptyMetrics(null)).toBe(true);
    expect(isEmptyMetrics(undefined)).toBe(true);
  });

  it("returns true for empty object", () => {
    expect(isEmptyMetrics({})).toBe(true);
  });

  it("returns false when real data exists", () => {
    expect(isEmptyMetrics({ pe: 15.5 })).toBe(false);
  });
});

describe("runFullResearchRuntime", () => {
  it("returns product-safe state for empty input", () => {
    const result = runFullResearchRuntime("", null, null, null, null, null, false);
    expect(result.state).toBe("empty");
    expect(result.message).toContain("Not enough information");
    expect(result.prediction.readiness).toBe("limited");
    expect(result.healthometer.overallScore).toBeNull();
  });

  it("returns identity and prediction for valid input", () => {
    const result = runFullResearchRuntime("RELIANCE", "Reliance Industries Ltd", "Energy", { roe: 0.15, pe: 20 }, null, null, false);
    expect(result.identity.symbol).toBe("RELIANCE");
    expect(result.identity.displayName).toBe("Reliance Industries Ltd");
    expect(result.actions.canInvest).toBe(true);
  });
});
