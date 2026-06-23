import { describe, expect, it } from "vitest";
import { runScanner, SCANNER_PRESETS } from "./scannerEngine";
import type { ScannerCompanyInput } from "./scannerEngine";

const goodCompany: ScannerCompanyInput = {
  symbol: "TCS", companyName: "Tata Consultancy Services", sector: "IT",
  scores: { quality: 82, valuation: 48, growth: 65, risk: 70, momentum: 60, stability: 78 },
};

const weakCompany: ScannerCompanyInput = {
  symbol: "WEAK", companyName: "Weak Co", sector: "Industrial",
  scores: { quality: 30, valuation: 25, growth: 20, risk: 25, momentum: 35, stability: 30 },
};

const noDataCompany: ScannerCompanyInput = {
  symbol: "NODATA", companyName: "No Data Co", sector: "Unknown",
  scores: { quality: null, valuation: null, growth: null, risk: null, momentum: null, stability: null },
};

describe("runScanner", () => {
  it("returns sorted results for Quality compounders preset", () => {
    const results = runScanner("Quality compounders", [weakCompany, goodCompany]);
    expect(results).toHaveLength(2);
    expect(results[0].symbol).toBe("TCS");
    expect(results[0].rank).toBe(1);
  });

  it("omits companies without the required ranking evidence", () => {
    const results = runScanner("Quality compounders", [noDataCompany]);
    expect(results).toEqual([]);
  });

  it("deduplicates canonical symbols before ranking", () => {
    const results = runScanner("Quality compounders", [goodCompany, { ...goodCompany, companyName: "Duplicate" }]);
    expect(results).toHaveLength(1);
    expect(results[0].symbol).toBe("TCS");
  });

  it("all scanner presets have valid definitions", () => {
    for (const preset of Object.keys(SCANNER_PRESETS)) {
      const def = SCANNER_PRESETS[preset as keyof typeof SCANNER_PRESETS];
      expect(def.requiredFeatures.length).toBeGreaterThan(0);
      expect(def.explanation).toBeTruthy();
      expect(def.riskCaveat).toBeTruthy();
    }
  });

  it("never uses forbidden labels", () => {
    const results = runScanner("Undervalued quality", [goodCompany, weakCompany]);
    const json = JSON.stringify(results);
    expect(json).not.toMatch(/buy|sell|hold|strong buy|target|guaranteed|multibagger/i);
  });
});
