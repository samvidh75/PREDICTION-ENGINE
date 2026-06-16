import { describe, expect, it } from "vitest";
import { formatNumber, formatPercentage, formatINR, normalizeDate, getCleanLabel } from "../dataFormatting";

describe("Frontend dataFormatting Utilities", () => {
  it("formats positive, negative, and invalid values safely as locale numbers", () => {
    expect(formatNumber(123456.78)).toBe("1,23,456.78");
    expect(formatNumber(-9876.5)).toBe("-9,876.5");
    expect(formatNumber(null)).toBe("Unavailable");
    expect(formatNumber(undefined)).toBe("Unavailable");
    expect(formatNumber("NaN")).toBe("Unavailable");
  });

  it("formats percentages with clean fraction bounds and signs", () => {
    expect(formatPercentage(0.1234)).toBe("+12.34%");
    expect(formatPercentage(-0.0567)).toBe("-5.67%");
    expect(formatPercentage(15.5)).toBe("+15.50%");
    expect(formatPercentage(null)).toBe("Unavailable");
  });

  it("formats currency values in Indian Rupees with optional compact modes", () => {
    expect(formatINR(15000000)).toBe("₹1,50,00,000.00");
    expect(formatINR(15000000, true)).toBe("₹1.50 Cr");
    expect(formatINR(250000, true)).toBe("₹2.50 L");
    expect(formatINR(null)).toBe("Unavailable");
  });

  it("normalizes date bounds safely into YYYY-MM-DD format", () => {
    expect(normalizeDate("2026-06-15T12:00:00.000Z")).toBe("2026-06-15");
    expect(normalizeDate(null)).toBe("Date pending");
  });

  it("converts raw snake_case or camelCase variables to clean display labels", () => {
    expect(getCleanLabel("pe_ratio")).toBe("Pe ratio");
    expect(getCleanLabel("revenueGrowth")).toBe("Revenue growth");
  });
});
