import { describe, expect, it } from "vitest";
import { assessAll, assessQuality } from "./qualityEngine";
import type { DataQualityReport } from "./dataQualityModel";

describe("assessAll", () => {
  it("returns High quality for full fresh data", () => {
    const r = assessAll({
      symbol: "TCS", hasQuote: true, hasFundamentals: true, hasHistory: true,
      quoteAgeHours: 1, fundamentalsAgeDays: 10, historyAgeDays: 1,
      quoteFundamentalsMatch: true, crossProviderMatch: true,
      invalidNumeric: [], nanFields: [], infinityFields: [],
      totalExpected: 20, totalAvailable: 18, missingCritical: [],
      inputConfidence: 90, coverageConfidence: 85, freshnessConfidence: 95,
    });
    expect(r.summary.level).toBe("High");
    expect(r.summary.pass).toBe(true);
  });

  it("returns Insufficient for no data", () => {
    const r = assessAll({
      symbol: "UNKNOWN", hasQuote: false, hasFundamentals: false, hasHistory: false,
      quoteAgeHours: null, fundamentalsAgeDays: null, historyAgeDays: null,
      quoteFundamentalsMatch: null, crossProviderMatch: null,
      invalidNumeric: [], nanFields: [], infinityFields: [],
      totalExpected: 20, totalAvailable: 0, missingCritical: ["all"],
      inputConfidence: 0, coverageConfidence: 0, freshnessConfidence: 0,
    });
    expect(r.summary.level).toBe("Insufficient");
    expect(r.summary.pass).toBe(false);
  });

  it("detects stale data", () => {
    const r = assessAll({
      symbol: "STALE", hasQuote: true, hasFundamentals: true, hasHistory: true,
      quoteAgeHours: 999, fundamentalsAgeDays: 999, historyAgeDays: 999,
      quoteFundamentalsMatch: true, crossProviderMatch: null,
      invalidNumeric: [], nanFields: [], infinityFields: [],
      totalExpected: 20, totalAvailable: 15, missingCritical: [],
      inputConfidence: 50, coverageConfidence: 50, freshnessConfidence: 10,
    });
    expect(r.freshness.overall).toBe("Stale");
    expect(r.summary.level).toBe("Low");
  });
});

describe("assessQuality", () => {
  it("returns Low for invalid numerics", () => {
    const report: DataQualityReport = {
      symbol: "X", presence: { quoteAvailable: true, fundamentalsAvailable: true, priceHistoryAvailable: true, overall: "Full" },
      freshness: { quoteAgeHours: 1, fundamentalsAgeDays: 1, priceHistoryAgeDays: 1, quoteFresh: true, fundamentalsFresh: true, priceHistoryFresh: true, overall: "Current" },
      consistency: { quoteFundamentalsConsistent: true, crossProviderMatch: true, overall: "Consistent" },
      numericValidity: { invalidNumericFields: ["price"], nanFields: [], infinityFields: [], overall: false },
      completeness: { totalExpected: 10, totalAvailable: 8, completenessRatio: 0.8, missingCritical: [], overall: "Complete" },
      confidence: { inputConfidence: 80, coverageConfidence: 80, freshnessConfidence: 80, overallConfidence: 80 },
      summary: { level: "High", pass: true, reasons: [] },
    };
    expect(assessQuality(report)).toBe("Low");
  });
});
