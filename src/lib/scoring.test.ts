import { describe, expect, it } from "vitest";
import { computeFactorScores, fromGrowth, fromLeverage, fromPE, fromROE, fromTech } from "./scoring";

describe("scoring", () => {
  it("scores roe across three fixtures", () => {
    expect(fromROE(28)).toBe(90);
    expect(fromROE(18)).toBe(65);
    expect(fromROE(7)).toBe(28);
  });

  it("scores valuation relative to industry", () => {
    expect(fromPE(12, 24)).toBe(92);
    expect(fromPE(18, 20)).toBe(68);
    expect(fromPE(36, 22)).toBe(28);
  });

  it("scores growth across accelerating and weakening cases", () => {
    expect(fromGrowth(24, 20)).toBe(78);
    expect(fromGrowth(10, 8)).toBe(52);
    expect(fromGrowth(-4, -8)).toBe(24);
  });

  it("scores leverage from debt and interest cover", () => {
    expect(fromLeverage(0.2, 9)).toBeGreaterThanOrEqual(85);
    expect(fromLeverage(0.8, 4)).toBeGreaterThanOrEqual(55);
    expect(fromLeverage(3.2, 1.2)).toBeLessThanOrEqual(25);
  });

  it("scores technicals using three inputs", () => {
    expect(fromTech(60, 1.4, true)).toBeGreaterThanOrEqual(75);
    expect(fromTech(49, 0.2, true)).toBeGreaterThanOrEqual(60);
    expect(fromTech(29, -1.4, false)).toBeLessThanOrEqual(32);
  });

  it("renormalizes health when some inputs are missing", () => {
    const result = computeFactorScores({
      roe: 24,
      pe: 18,
      industryPe: 22,
      revenueGrowth: null,
      profitGrowth: null,
      debtToEquity: 0.4,
      interestCoverage: 6,
      rsi: 58,
      macdSignal: 1.2,
      above50Dma: true,
      volatility: 0.16,
    });
    expect(result.growth).toBeNull();
    expect(result.health).not.toBe(50);
    expect(result.health).toBeGreaterThan(0);
  });
});
