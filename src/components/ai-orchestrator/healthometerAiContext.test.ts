import { describe, expect, it } from "vitest";
import { toHealthometerAiContext } from "./healthometerAiContext";

describe("healthometerAiContext", () => {
  it("accepts safe Healthometer context without recalculating score", () => {
    const context = toHealthometerAiContext({
      symbol: "TCS",
      score: 74,
      state: "Healthy",
      explanation: ["Quality remains supportive."],
      factors: [{ label: "Quality", summary: "Strong cash generation." }],
    });

    expect(context?.healthometer?.score).toBe(74);
    expect(context?.healthometer?.factors).toEqual(["Quality", "Strong cash generation."]);
  });

  it("does not invent reasons", () => {
    const context = toHealthometerAiContext({
      symbol: "TCS",
      score: 74,
    });

    expect(context?.healthometer?.explanation).toBeUndefined();
    expect(context?.healthometer?.factors).toBeUndefined();
  });
});
