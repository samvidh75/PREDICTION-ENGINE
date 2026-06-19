import { describe, expect, it } from "vitest";
import { compareCompanies } from "./compareEngine";

describe("compareCompanies", () => {
  it("compares two companies and identifies the stronger case", () => {
    const r = compareCompanies([
      { symbol: "TCS", companyName: "Tata Consultancy Services", scores: { quality: 82, valuation: 48, growth: 65, risk: 70, momentum: 60, stability: 78 } },
      { symbol: "INFY", companyName: "Infosys Ltd", scores: { quality: 75, valuation: 55, growth: 60, risk: 65, momentum: 55, stability: 70 } },
    ]);
    expect(r.companies).toHaveLength(2);
    expect(r.recommendation).toContain("Tata Consultancy Services");
    expect(r.factorComparison.length).toBeGreaterThan(0);
  });

  it("returns null recommendation for insufficient data", () => {
    const r = compareCompanies([
      { symbol: "A", companyName: "Company A", scores: { quality: null, valuation: null, growth: null, risk: null, momentum: null, stability: null } },
      { symbol: "B", companyName: "Company B", scores: { quality: null, valuation: null, growth: null, risk: null, momentum: null, stability: null } },
    ]);
    expect(r.recommendation).toBeNull();
    expect(r.missingDataCaveat).not.toBeNull();
  });

  it("handles single company input", () => {
    const r = compareCompanies([{ symbol: "TCS", companyName: "TCS", scores: { quality: 80, valuation: 50, growth: 60, risk: 65, momentum: 55, stability: 70 } }]);
    expect(r.missingDataCaveat).toContain("at least two");
  });

  it("no forbidden labels in compare output", () => {
    const r = compareCompanies([
      { symbol: "TCS", companyName: "TCS", scores: { quality: 82, valuation: 48, growth: 65, risk: 70, momentum: 60, stability: 78 } },
      { symbol: "INFY", companyName: "Infosys", scores: { quality: 75, valuation: 55, growth: 60, risk: 65, momentum: 55, stability: 70 } },
    ]);
    const json = JSON.stringify(r);
    expect(json).not.toMatch(/buy|sell|hold|strong buy|provider|backend/i);
  });
});
