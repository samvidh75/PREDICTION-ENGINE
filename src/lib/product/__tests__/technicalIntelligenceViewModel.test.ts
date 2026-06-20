import { describe, it, expect } from "vitest";
import { buildTechnicalIntelligence, type TechnicalInput } from "../technicalIntelligenceViewModel";

describe("buildTechnicalIntelligence", () => {
  const baseInput: TechnicalInput = {
    priceHistory: [],
    momentumScore: null,
    volatilityScore: null,
    rsiValue: null,
    macdValue: null,
    priceChangePercent: null,
    distanceFrom52WeekHigh: null,
  };

  it("returns Not enough information when no data", () => {
    const result = buildTechnicalIntelligence(baseInput);
    expect(result.state).toBe("Not enough information");
    expect(result.score).toBeNull();
    expect(result.checks).toHaveLength(0);
  });

  it("uses momentum score when price history is insufficient", () => {
    const result = buildTechnicalIntelligence({
      ...baseInput,
      momentumScore: 75,
    });
    expect(result.state).not.toBe("Not enough information");
    expect(result.score).toBe(75);
  });

  it("computes RSI from price history", () => {
    const prices = Array.from({ length: 20 }, (_, i) => 100 + (i < 10 ? i : -i + 10));
    const result = buildTechnicalIntelligence({
      ...baseInput,
      priceHistory: prices.map((close) => ({ close })),
    });
    const rsiCheck = result.checks.find((c) => c.label === "RSI context");
    expect(rsiCheck).toBeTruthy();
  });

  it("marks RSI oversold territory as risk", () => {
    const prices = Array.from({ length: 20 }, (_, i) => Math.max(100 - i * 5, 10));
    const result = buildTechnicalIntelligence({
      ...baseInput,
      priceHistory: prices.map((close) => ({ close })),
      rsiValue: 25,
    });
    expect(result.riskFlags.some((f) => f.includes("oversold"))).toBe(true);
  });

  it("Strong momentum with many positive checks", () => {
    const prices = Array.from({ length: 60 }, (_, i) => 100 + i);
    const result = buildTechnicalIntelligence({
      ...baseInput,
      priceHistory: prices.map((close) => ({ close, volume: 1000000 })),
      priceChangePercent: 8,
      rsiValue: 68,
      macdValue: 2.5,
      distanceFrom52WeekHigh: 3,
    });
    expect(result.state).toBe("Strong momentum");
  });

  it("Risk rising when risk indicators dominate", () => {
    const result = buildTechnicalIntelligence({
      ...baseInput,
      momentumScore: 20,
      volatilityScore: 80,
      priceChangePercent: -12,
      rsiValue: 28,
      macdValue: -1.5,
      priceHistory: Array.from({ length: 60 }, (_, i) => ({ close: 200 - i })),
    });
    expect(result.state).toBe("Risk rising");
  });

  it("no NaN or Infinity values", () => {
    const result = buildTechnicalIntelligence({
      ...baseInput,
      momentumScore: 50,
      priceHistory: [{ close: 100 }],
    });
    const values = [result.score, ...result.checks.map((c) => c.label.length)];
    values.forEach((v) => {
      expect(Number.isFinite(v)).toBe(true);
    });
  });

  it("no Buy/Sell/Hold labels", () => {
    const result = buildTechnicalIntelligence({
      ...baseInput,
      momentumScore: 80,
      priceHistory: Array.from({ length: 60 }, (_, i) => ({ close: 100 + i })),
    });
    const allText = [result.state, result.explanation, ...result.topDrivers, ...result.riskFlags].join(" ");
    expect(allText).not.toMatch(/\b(Buy|Sell|Hold)\b/i);
  });

  it("no forbidden native copy", () => {
    const result = buildTechnicalIntelligence(baseInput);
    const allText = [result.state, result.explanation].join(" ");
    const forbidden = ["N/A", "undefined", "NaN", "Infinity", "backend", "database", "API"];
    forbidden.forEach((term) => {
      expect(allText).not.toContain(term);
    });
  });
});
