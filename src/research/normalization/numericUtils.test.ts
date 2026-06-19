import { describe, expect, it } from "vitest";
import { safeFinite, safeInt, safePositive, safePercent, clampScore, hasSufficientData, normalizeSymbol, normalizeDate } from "./numericUtils";

describe("safeFinite", () => {
  it("returns null for null/undefined", () => {
    expect(safeFinite(null)).toBeNull();
    expect(safeFinite(undefined)).toBeNull();
  });
  it("returns null for NaN, Infinity", () => {
    expect(safeFinite(NaN)).toBeNull();
    expect(safeFinite(Infinity)).toBeNull();
    expect(safeFinite(-Infinity)).toBeNull();
  });
  it("parses string numbers", () => {
    expect(safeFinite("123.45")).toBe(123.45);
    expect(safeFinite("₹1,234.56")).toBe(1234.56);
    expect(safeFinite("1,234")).toBe(1234);
  });
  it("returns valid numbers", () => {
    expect(safeFinite(42)).toBe(42);
    expect(safeFinite(-3.14)).toBe(-3.14);
  });
});

describe("normalizeSymbol", () => {
  it("uppercases and strips special chars", () => {
    expect(normalizeSymbol("reliance")).toBe("RELIANCE");
    expect(normalizeSymbol("hdfc bank")).toBe("HDFCBANK");
    expect(normalizeSymbol("tcs.ns")).toBe("TCSNS");
  });
});

describe("clampScore", () => {
  it("clamps to 0-100", () => {
    expect(clampScore(150)).toBe(100);
    expect(clampScore(-10)).toBe(0);
    expect(clampScore(75)).toBe(75);
  });
});

describe("hasSufficientData", () => {
  it("returns true when enough non-null values", () => {
    expect(hasSufficientData([1, 2, null, null], 2)).toBe(true);
    expect(hasSufficientData([null, null, null], 1)).toBe(false);
  });
});

describe("normalizeDate", () => {
  it("returns ISO date string", () => {
    expect(normalizeDate("2024-01-15")).toBe("2024-01-15");
    expect(normalizeDate(new Date("2024-01-15"))).toBe("2024-01-15");
    expect(normalizeDate(null)).toBeNull();
    expect(normalizeDate("invalid")).toBeNull();
  });
});
