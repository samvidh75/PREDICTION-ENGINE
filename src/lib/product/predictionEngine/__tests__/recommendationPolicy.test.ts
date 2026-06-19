import { describe, expect, it } from "vitest";
import { mapScoreToStance } from "../recommendationPolicy";

describe("recommendationPolicy", () => {
  it("returns Not enough information for null score", () => {
    const result = mapScoreToStance(null, null, 0);
    expect(result.stance).toBe("Not enough information");
    expect(result.description).toBeTruthy();
    expect(result.action).toBeTruthy();
  });

  it("returns Not enough information when dataCompleteness is below 40", () => {
    const result = mapScoreToStance(80, null, 30);
    expect(result.stance).toBe("Not enough information");
  });

  it("returns Avoid for now when riskScore >= 75", () => {
    const result = mapScoreToStance(90, 80, 100);
    expect(result.stance).toBe("Avoid for now");
  });

  it("returns Risk rising when riskScore >= 55", () => {
    const result = mapScoreToStance(70, 60, 100);
    expect(result.stance).toBe("Risk rising");
  });

  it("returns High conviction for high score with low risk", () => {
    const result = mapScoreToStance(80, 20, 100);
    expect(result.stance).toBe("High conviction");
  });

  it("returns Watch for moderate score 55-74", () => {
    const result = mapScoreToStance(60, 20, 100);
    expect(result.stance).toBe("Watch");
  });

  it("returns Watch for score 40-54", () => {
    const result = mapScoreToStance(45, 20, 100);
    expect(result.stance).toBe("Watch");
  });

  it("returns Needs review for low score", () => {
    const result = mapScoreToStance(30, 20, 100);
    expect(result.stance).toBe("Needs review");
  });

  it("never outputs Buy, Sell, or Hold", () => {
    const testCases = [
      { score: 90, risk: 10, completeness: 100 },
      { score: 70, risk: 50, completeness: 80 },
      { score: 50, risk: 30, completeness: 70 },
      { score: 30, risk: 60, completeness: 60 },
      { score: null, risk: null, completeness: 0 },
    ];

    for (const tc of testCases) {
      const result = mapScoreToStance(tc.score, tc.risk, tc.completeness);
      expect(result.stance).not.toMatch(/Buy|Sell|Hold/i);
    }
  });

  it("handles NaN and Infinity gracefully", () => {
    const resultNaN = mapScoreToStance(NaN, null, 100);
    expect(resultNaN.stance).toBe("Not enough information");

    const resultInf = mapScoreToStance(Infinity, null, 100);
    expect(resultInf.stance).toBe("Not enough information");

    const resultNeg = mapScoreToStance(-1, null, 100);
    expect(resultNeg.stance).toBe("Needs review");
  });
});
