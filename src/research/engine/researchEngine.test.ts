import { describe, expect, it } from "vitest";
import { computeResearchConviction } from "./researchEngine";
import { DEFAULT_WEIGHTS, validateWeights } from "./scoringMethodology";

describe("computeResearchConviction", () => {
  it("returns deterministic output for same input", () => {
    const a = computeResearchConviction({ quality: 80, valuation: 60, growth: 70, risk: 50, momentum: 65, stability: 75 });
    const b = computeResearchConviction({ quality: 80, valuation: 60, growth: 70, risk: 50, momentum: 65, stability: 75 });
    expect(a.overallScore).toBe(b.overallScore);
    expect(a.conviction).toBe(b.conviction);
  });

  it("returns Research signals pending for all-null factors", () => {
    const r = computeResearchConviction({ quality: null, valuation: null, growth: null, risk: null, momentum: null, stability: null });
    expect(r.overallScore).toBeNull();
    expect(r.conviction).toBe("Research signals pending");
  });

  it("returns Research signals pending for insufficient inputs", () => {
    const r = computeResearchConviction({ quality: 80, valuation: null, growth: null, risk: null, momentum: null, stability: null });
    expect(r.overallScore).toBeNull();
  });

  it("computes score when enough inputs present", () => {
    const r = computeResearchConviction({ quality: 80, valuation: 60, growth: 70, risk: 50, momentum: 65, stability: 75 });
    expect(r.overallScore).not.toBeNull();
    expect(r.topContributors.length).toBeGreaterThan(0);
    expect(r.explanation).not.toBeNull();
  });

  it("never uses Buy/Sell labels", () => {
    const r = computeResearchConviction({ quality: 90, valuation: 70, growth: 80, risk: 60, momentum: 75, stability: 85 });
    const json = JSON.stringify(r);
    expect(json).not.toMatch(/buy|sell|hold|strong buy|target price|guaranteed|multibagger/i);
  });

  it("reduces confidence with missing data", () => {
    const full = computeResearchConviction({ quality: 80, valuation: 60, growth: 70, risk: 50, momentum: 65, stability: 75 });
    const partial = computeResearchConviction({ quality: 80, valuation: null, growth: null, risk: 50, momentum: null, stability: null });
    if (partial.overallScore !== null && full.overallScore !== null) {
      expect(partial.confidence).toBeLessThanOrEqual(full.confidence);
    }
  });

  it("generates explanations from real inputs only", () => {
    const r = computeResearchConviction({ quality: 85, valuation: null, growth: 70, risk: null, momentum: null, stability: null });
    if (r.overallScore !== null) {
      expect(r.topContributors.every(c => c.includes("Quality") || c.includes("Growth"))).toBe(true);
    }
  });
});

describe("validateWeights", () => {
  it("returns true for valid weights", () => {
    expect(validateWeights(DEFAULT_WEIGHTS)).toBe(true);
  });

  it("returns false for invalid weights", () => {
    expect(validateWeights({ quality: 1, growth: 1 })).toBe(false);
  });
});
