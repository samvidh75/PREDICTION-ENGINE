import { describe, it, expect } from "vitest";
import { computeResearchSignal, type ResearchSignalView } from "../researchSignalModel";
import type { CompanyFactorScoresView } from "../../../research/contracts/productContracts";

function makeFactors(overrides: Partial<CompanyFactorScoresView> = {}): CompanyFactorScoresView {
  return {
    symbol: "TEST",
    qualityScore: null,
    growthScore: null,
    stabilityScore: null,
    momentumScore: null,
    valuationScore: null,
    riskScore: null,
    convictionScore: null,
    qualityExplanation: null,
    valuationExplanation: null,
    growthExplanation: null,
    riskExplanation: null,
    momentumExplanation: null,
    stabilityExplanation: null,
    ...overrides,
  };
}

describe("computeResearchSignal", () => {
  it("returns pending state when factorScores is null", () => {
    const result = computeResearchSignal(null, null);
    expect(result.label).toBe("Research signals pending");
    expect(result.score).toBeNull();
    expect(result.confidence).toBe(0);
    expect(result.dataSufficiency).toBe("Insufficient");
  });

  it("returns pending state when all factor scores are null", () => {
    const result = computeResearchSignal(makeFactors(), null);
    expect(result.label).toBe("Research signals pending");
    expect(result.score).toBeNull();
    expect(result.confidence).toBe(0);
    expect(result.dataSufficiency).toBe("Insufficient");
  });

  it("returns High conviction research case for high scores with sufficient data", () => {
    const result = computeResearchSignal(makeFactors({
      qualityScore: 85,
      growthScore: 80,
      stabilityScore: 75,
      momentumScore: 70,
      valuationScore: 65,
      riskScore: 60,
    }), null);
    expect(result.label).toBe("High conviction research case");
    expect(result.tone).toBe("constructive");
    expect(result.action).toBe("Research deeper");
    expect(result.score).not.toBeNull();
    expect(result.confidence).toBeGreaterThanOrEqual(60);
  });

  it("returns Worth researching for moderate scores", () => {
    const result = computeResearchSignal(makeFactors({
      qualityScore: 68,
      growthScore: 65,
      stabilityScore: 60,
      momentumScore: 55,
      valuationScore: 50,
      riskScore: 45,
    }), null);
    expect(result.label).toBe("Worth researching");
    expect(result.tone).toBe("constructive");
    expect(result.action).toBe("Research deeper");
  });

  it("returns Track for average scores", () => {
    const result = computeResearchSignal(makeFactors({
      qualityScore: 55,
      growthScore: 50,
      stabilityScore: 45,
      momentumScore: 40,
    }), null);
    expect(result.label).toBe("Track");
    expect(result.tone).toBe("neutral");
  });

  it("returns Needs review for low scores", () => {
    const result = computeResearchSignal(makeFactors({
      qualityScore: 40,
      growthScore: 35,
      stabilityScore: 30,
      momentumScore: 25,
    }), null);
    expect(result.label).toBe("Needs review");
    expect(result.tone).toBe("caution");
  });

  it("returns Risk rising when risk score is low", () => {
    const result = computeResearchSignal(makeFactors({
      qualityScore: 70,
      growthScore: 65,
      stabilityScore: 60,
      momentumScore: 55,
      valuationScore: 50,
      riskScore: 35,
    }), null);
    expect(result.label).toBe("Risk rising");
    expect(result.tone).toBe("caution");
    expect(result.action).toBe("Review risks");
  });

  it("returns Avoid for now when risk score is very low", () => {
    const result = computeResearchSignal(makeFactors({
      qualityScore: 70,
      growthScore: 65,
      stabilityScore: 60,
      momentumScore: 55,
      valuationScore: 50,
      riskScore: 20,
    }), null);
    expect(result.label).toBe("Avoid for now");
    expect(result.tone).toBe("severe");
    expect(result.action).toBe("Review risks");
  });

  it("handles partial data with reduced confidence", () => {
    const result = computeResearchSignal(makeFactors({
      qualityScore: 80,
      growthScore: 75,
      stabilityScore: null,
      momentumScore: null,
      valuationScore: null,
      riskScore: null,
    }), null);
    expect(result.label).not.toBe("Research signals pending");
    expect(result.confidence).toBeLessThan(60);
    expect(result.dataSufficiency).toBe("Partial");
  });

  it("never returns Buy/Hold/Sell labels", () => {
    const labels = [
      "High conviction research case",
      "Worth researching",
      "Track",
      "Needs review",
      "Risk rising",
      "Avoid for now",
      "Research signals pending",
    ];
    const resultLabels = [
      computeResearchSignal(null, null).label,
      computeResearchSignal(makeFactors({ qualityScore: 80, growthScore: 75, stabilityScore: 70, momentumScore: 65, valuationScore: 60, riskScore: 55 }), null).label,
      computeResearchSignal(makeFactors({ qualityScore: 65, growthScore: 60, stabilityScore: 55, momentumScore: 50, valuationScore: 45, riskScore: 40 }), null).label,
      computeResearchSignal(makeFactors({ qualityScore: 40, growthScore: 35, stabilityScore: 30, momentumScore: 25 }), null).label,
    ];
    for (const label of resultLabels) {
      expect(labels).toContain(label);
    }
  });

  it("produces top drivers from highest factor scores", () => {
    const result = computeResearchSignal(makeFactors({
      qualityScore: 90,
      growthScore: 40,
      stabilityScore: 30,
    }), null);
    expect(result.topDrivers.length).toBeGreaterThanOrEqual(1);
    expect(result.topDrivers[0]).toContain("Quality");
  });

  it("produces top risks from lowest factor scores", () => {
    const result = computeResearchSignal(makeFactors({
      qualityScore: 90,
      growthScore: 30,
      stabilityScore: 30,
    }), null);
    expect(result.topRisks.length).toBeGreaterThanOrEqual(1);
  });

  it("has deterministic output for same inputs", () => {
    const factors = makeFactors({ qualityScore: 75, growthScore: 70, stabilityScore: 65, momentumScore: 60, valuationScore: 55, riskScore: 50 });
    const r1 = computeResearchSignal(factors, null);
    const r2 = computeResearchSignal(factors, null);
    expect(r1.label).toBe(r2.label);
    expect(r1.score).toBe(r2.score);
    expect(r1.confidence).toBe(r2.confidence);
    expect(r1.tone).toBe(r2.tone);
  });
});
