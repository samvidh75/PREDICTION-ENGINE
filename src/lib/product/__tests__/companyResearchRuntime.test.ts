import { describe, it, expect } from "vitest";
import { buildCompanyResearch } from "../companyResearchRuntime";

describe("companyResearchRuntime", () => {
  it("emits one identity model", () => {
    const result = buildCompanyResearch("ITC", "ITC Ltd", "Consumer", { pe: 25, roe: 0.18 }, false);
    expect(result.identity.symbol).toBe("ITC");
    expect(result.identity.companyName).toBe("ITC Ltd");
    expect(result.identity.displayName).toBe("ITC Ltd");
    expect(result.identity.sector).toBe("Consumer");
  });

  it("collapses duplicate name/symbol", () => {
    const result = buildCompanyResearch("ITC", "ITC", "Consumer", { pe: 25 }, false);
    expect(result.identity.displayName).toBe("ITC");
    expect(result.identity.companyName).toBe("ITC");
  });

  it("handles unknown symbol with product-safe state", () => {
    const result = buildCompanyResearch("", null, null, null, false);
    expect(result.state).toBe("empty");
    expect(result.message).toContain("Not enough information");
    expect(result.prediction.overallScore).toBeNull();
    expect(result.healthometer.overallScore).toBeNull();
  });

  it("does not fabricate thesis when no data", () => {
    const result = buildCompanyResearch("UNKNOWN", null, null, null, false);
    expect(result.prediction.topPositiveDrivers).toHaveLength(0);
    expect(result.prediction.topRiskDrivers).toHaveLength(0);
  });

  it("returns valuation context when PE available", () => {
    const result = buildCompanyResearch("RELIANCE", "Reliance", "Energy", { pe: 12, pb: 1.5 }, false);
    expect(result.valuationContext.peContext).not.toBeNull();
    expect(result.valuationContext.pbContext).not.toBeNull();
  });

  it("returns risk context when debtEquity available", () => {
    const result = buildCompanyResearch("RELIANCE", "Reliance", "Energy", { debtEquity: 2.0 }, false);
    expect(result.riskContext.debtWarning).not.toBeNull();
  });

  it("returns methodology note", () => {
    const result = buildCompanyResearch("TCS", "TCS", "Tech", { pe: 30 }, false);
    expect(result.methodologyNote).toContain("Research scores");
  });

  it("shows ready state when real metrics exist", () => {
    const result = buildCompanyResearch("TCS", "TCS", "Tech", { pe: 30, roe: 0.25, marketCap: 15000000000 }, false);
    expect(result.state).toBe("ready");
  });
});
