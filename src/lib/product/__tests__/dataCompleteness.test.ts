import { describe, expect, it } from "vitest";
import {
  getFinancialCompleteness,
  getValuationCompleteness,
  getRiskCompleteness,
  getPeerCompleteness,
  getHistoryCompleteness,
} from "../dataCompleteness";

describe("dataCompleteness", () => {
  describe("getFinancialCompleteness", () => {
    it("returns Limited when all null", () => {
      const result = getFinancialCompleteness(null, null, null, null, null);
      expect(result.hasData).toBe(false);
      expect(result.label).toBe("Limited");
      expect(result.fallbackCopy).toBeTruthy();
    });

    it("returns Sufficient when all present", () => {
      const result = getFinancialCompleteness(0.3, 0.2, 0.1, 15, 12);
      expect(result.hasData).toBe(true);
      expect(result.label).toBe("Sufficient");
    });
  });

  describe("getValuationCompleteness", () => {
    it("returns Sufficient when all present", () => {
      const result = getValuationCompleteness(20, 3, 12, 0.02);
      expect(result.hasData).toBe(true);
    });

    it("returns Limited when none present", () => {
      const result = getValuationCompleteness(null, null, null, null);
      expect(result.hasData).toBe(false);
    });
  });

  describe("getRiskCompleteness", () => {
    it("returns Partial for some fields", () => {
      const result = getRiskCompleteness(0.5, null, null);
      expect(result.hasData).toBe(true);
    });
  });

  describe("getPeerCompleteness", () => {
    it("returns Limited for zero peers", () => {
      const result = getPeerCompleteness(0);
      expect(result.hasData).toBe(false);
    });
  });

  describe("getHistoryCompleteness", () => {
    it("returns Limited for zero snapshots", () => {
      const result = getHistoryCompleteness(0);
      expect(result.hasData).toBe(false);
    });
  });
});
