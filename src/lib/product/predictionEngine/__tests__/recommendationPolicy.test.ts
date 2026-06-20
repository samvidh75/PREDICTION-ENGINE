import { describe, expect, it } from "vitest";
import { mapScoreToStance } from "../recommendationPolicy";

describe("mapScoreToStance", () => {
  it("returns Not enough information for null score", () => {
    const result = mapScoreToStance(null, null);
    expect(result.stance).toBe("Not enough information");
  });

  it("returns Avoid for now when riskScore >= 75", () => {
    const result = mapScoreToStance(60, 80, 100);
    expect(result.stance).toBe("Avoid for now");
  });

  it("returns Risk rising when riskScore >= 55", () => {
    const result = mapScoreToStance(60, 60, 100);
    expect(result.stance).toBe("Risk rising");
  });

  it("returns High conviction for high score with low risk", () => {
    const result = mapScoreToStance(80, 20, 100);
    expect(result.stance).toBe("High conviction");
  });

  it("returns Watch for moderate score 55-74 with good confidence", () => {
    const result = mapScoreToStance(65, 20, 100);
    expect(result.stance).toBe("Watch");
  });

  it("returns Risk rising for score 40-54", () => {
    const result = mapScoreToStance(45, 20, 100);
    expect(result.stance).toBe("Risk rising");
  });

  it("returns Risk rising for low score", () => {
    const result = mapScoreToStance(20, 20, 100);
    expect(result.stance).toBe("Risk rising");
  });

  it("returns Watch for high score with low confidence (not High conviction)", () => {
    const result = mapScoreToStance(80, 20, 40);
    expect(result.stance).toBe("Watch");
  });

  it("does not output Buy/Sell/Hold", () => {
    const result = mapScoreToStance(80, 20, 100);
    expect(result.stance).not.toMatch(/Buy|Sell|Hold/);
  });

  it("no stance contains price targets", () => {
    const result = mapScoreToStance(75, 20, 100);
    expect(result.description).not.toMatch(/price target|₹|Rs\./);
  });

  it("Not enough information when dataCompleteness < 30", () => {
    const result = mapScoreToStance(80, 20, 20);
    expect(result.stance).toBe("Not enough information");
  });

  it("returns Needs review when high score + high risk", () => {
    const resultPos = mapScoreToStance(80, 45, 100);
    expect(resultPos.stance).toBe("Needs review");
  });

  it("returns Risk rising for moderate score with riskScore >= 55 (early risk check)", () => {
    const resultNeg = mapScoreToStance(45, 55, 100);
    expect(resultNeg.stance).toBe("Risk rising");
  });
});
