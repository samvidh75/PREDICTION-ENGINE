import { describe, expect, it } from "vitest";
import {
  formatNumber, formatPercentage, formatINR, normalizeDate, getCleanLabel,
  formatScore, formatRank, getScoreState, normalizeFieldName, formatFreshness, formatSource,
} from "../dataFormatting";

describe("Frontend dataFormatting Utilities", () => {
  it("formats positive, negative, and invalid values safely as locale numbers", () => {
    expect(formatNumber(123456.78)).toBe("1,23,456.78");
    expect(formatNumber(-9876.5)).toBe("-9,876.5");
    expect(formatNumber(null)).toBe("—");
    expect(formatNumber(undefined)).toBe("—");
    expect(formatNumber("NaN")).toBe("—");
    expect(formatNumber(Infinity)).toBe("—");
    expect(formatNumber("")).toBe("—");
  });

  it("formats percentages with clean fraction bounds and signs", () => {
    expect(formatPercentage(0.1234)).toBe("+12.34%");
    expect(formatPercentage(-0.0567)).toBe("-5.67%");
    expect(formatPercentage(15.5)).toBe("+15.50%");
    expect(formatPercentage(null)).toBe("—");
    expect(formatPercentage(undefined)).toBe("—");
    expect(formatPercentage(NaN)).toBe("—");
    expect(formatPercentage(Infinity)).toBe("—");
    expect(formatPercentage("")).toBe("—");
    expect(formatPercentage(0)).toBe("0.00%");
  });

  it("formats currency values in Philippine Rupees with optional compact modes", () => {
    expect(formatINR(15000000)).toBe("₹1,50,00,000.00");
    expect(formatINR(15000000, true)).toBe("₹1.50 Cr");
    expect(formatINR(250000, true)).toBe("₹2.50 L");
    expect(formatINR(null)).toBe("—");
    expect(formatINR(undefined)).toBe("—");
    expect(formatINR(NaN)).toBe("—");
    expect(formatINR(Infinity)).toBe("—");
  });

  it("normalizes date bounds safely into YYYY-MM-DD format", () => {
    expect(normalizeDate("2026-06-15T12:00:00.000Z")).toBe("2026-06-15");
    expect(normalizeDate(null)).toBe("Date not yet available");
    expect(normalizeDate(undefined)).toBe("Date not yet available");
    expect(normalizeDate("")).toBe("Date not yet available");
  });

  it("converts raw snake_case or camelCase variables to clean display labels", () => {
    expect(getCleanLabel("pe_ratio")).toBe("Pe ratio");
    expect(getCleanLabel("revenueGrowth")).toBe("Revenue growth");
  });
});

describe("formatScore", () => {
  it("formats valid scores as N/100", () => {
    expect(formatScore(88)).toBe("88/100");
    expect(formatScore(0)).toBe("0/100");
  });

  it("returns not yet available for null/undefined/non-finite", () => {
    expect(formatScore(null)).toBe("Score not yet available");
    expect(formatScore(undefined)).toBe("Score not yet available");
    expect(formatScore(NaN)).toBe("Score not yet available");
    expect(formatScore(Infinity)).toBe("Score not yet available");
  });
});

describe("formatRank", () => {
  it("formats valid rank with hash prefix", () => {
    expect(formatRank(1)).toBe("#1");
    expect(formatRank(42)).toBe("#42");
  });

  it("returns em-dash for null/undefined/invalid", () => {
    expect(formatRank(null)).toBe("—");
    expect(formatRank(undefined)).toBe("—");
    expect(formatRank(0)).toBe("—");
    expect(formatRank(-1)).toBe("—");
  });
});

describe("getScoreState", () => {
  it("returns available for valid finite numbers", () => {
    expect(getScoreState(88)).toBe("available");
    expect(getScoreState(0)).toBe("available");
  });

  it("returns pending for null/undefined/non-finite", () => {
    expect(getScoreState(null)).toBe("pending");
    expect(getScoreState(undefined)).toBe("pending");
    expect(getScoreState(NaN)).toBe("pending");
  });
});

describe("normalizeFieldName", () => {
  it("converts snake_case and camelCase to title case", () => {
    expect(normalizeFieldName("revenue_growth")).toBe("Revenue growth");
    expect(normalizeFieldName("revenueGrowth")).toBe("Revenue growth");
    expect(normalizeFieldName("pe_ratio")).toBe("Pe ratio");
  });

  it("returns empty for empty input", () => {
    expect(normalizeFieldName("")).toBe("");
    expect(normalizeFieldName(null as any)).toBe("");
    expect(normalizeFieldName(undefined as any)).toBe("");
  });
});

describe("formatFreshness", () => {
  it("returns Today for recent dates", () => {
    const today = new Date().toISOString();
    expect(formatFreshness(today)).toBe("Today");
  });

  it("returns Yesterday for one day ago", () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    expect(formatFreshness(yesterday)).toBe("Yesterday");
  });

  it("returns Xd ago for dates within 30 days", () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString();
    expect(formatFreshness(fiveDaysAgo)).toBe("5d ago");
  });

  it("returns date string for older dates", () => {
    const oldDate = "2026-01-01T00:00:00Z";
    expect(formatFreshness(oldDate)).toBe("2026-01-01");
  });

  it("returns Not yet available for null/undefined", () => {
    expect(formatFreshness(null)).toBe("Not yet available");
    expect(formatFreshness(undefined)).toBe("Not yet available");
    expect(formatFreshness("")).toBe("Not yet available");
  });
});

describe("formatSource", () => {
  it("returns source for valid values", () => {
    expect(formatSource("upstox")).toBe("upstox");
  });

  it("returns dash for null/undefined", () => {
    expect(formatSource(null)).toBe("—");
    expect(formatSource(undefined)).toBe("—");
  });
});
