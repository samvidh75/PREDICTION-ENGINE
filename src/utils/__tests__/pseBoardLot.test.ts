import { describe, it, expect } from "vitest";
import {
  getBoardLotSize,
  getTickSize,
  roundToBoardLot,
  roundToTick,
  calculateTransactionCosts,
} from "../pseBoardLot";

describe("pseBoardLot", () => {
  describe("getBoardLotSize", () => {
    it("returns 1,000,000 for sub-centavo stocks", () => {
      expect(getBoardLotSize(0.005)).toBe(1_000_000);
    });
    it("returns 100 for a ₱125 stock (BDO-range)", () => {
      expect(getBoardLotSize(125)).toBe(5);
    });
    it("returns 10 for a ₱30 stock", () => {
      expect(getBoardLotSize(30)).toBe(10);
    });
    it("returns 1,000 for a ₱2 stock", () => {
      expect(getBoardLotSize(2)).toBe(1_000);
    });
    it("handles very high-priced stocks (open-ended top tier)", () => {
      expect(getBoardLotSize(5000)).toBe(5);
    });
  });

  describe("getTickSize", () => {
    it("returns 0.01 for a ₱125 stock", () => {
      expect(getTickSize(125)).toBe(0.01);
    });
    it("returns 0.0001 for a sub-centavo stock", () => {
      expect(getTickSize(0.005)).toBe(0.0001);
    });
  });

  describe("roundToBoardLot", () => {
    it("rounds down to the nearest lot multiple", () => {
      expect(roundToBoardLot(123, 125)).toBe(120); // lot=5
      expect(roundToBoardLot(1234, 2)).toBe(1000); // lot=1000
    });
  });

  describe("roundToTick", () => {
    it("rounds a price to its tier's tick size", () => {
      expect(roundToTick(125.017)).toBeCloseTo(125.02, 5);
    });
  });

  describe("calculateTransactionCosts", () => {
    it("computes a buy order with no stock transaction tax", () => {
      const result = calculateTransactionCosts(100, 125, "buy", 0.0025, 20);
      expect(result.grossAmount).toBe(12500);
      expect(result.commission).toBe(31.25); // 0.25% of 12500
      expect(result.stockTransactionTax).toBe(0);
      expect(result.netAmount).toBeGreaterThan(result.grossAmount);
    });

    it("computes a sell order including the 0.6% stock transaction tax", () => {
      const result = calculateTransactionCosts(100, 125, "sell", 0.0025, 20);
      expect(result.stockTransactionTax).toBe(75); // 0.6% of 12500
      expect(result.netAmount).toBeLessThan(result.grossAmount);
    });

    it("applies the minimum commission floor for small orders", () => {
      const result = calculateTransactionCosts(10, 5, "buy", 0.0025, 20);
      expect(result.commission).toBe(20); // 0.25% of 50 = 0.125, floored to min 20
    });
  });
});
