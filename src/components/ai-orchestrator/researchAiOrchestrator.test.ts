import { describe, expect, it } from "vitest";
import { answerResearchQuestion } from "./researchAiOrchestrator";

describe("researchAiOrchestrator", () => {
  it("returns deterministic answer without local AI", async () => {
    const response = await answerResearchQuestion({
      surface: "stock",
      question: "Explain this view",
      context: {
        surface: "stock",
        headline: "Research is improving.",
        risksToReview: ["Valuation needs review."],
      },
    });

    expect(response.runtime).toBe("deterministic");
    expect(response.ok).toBe(true);
  });

  it("falls back when browser-local runtime is unavailable", async () => {
    const response = await answerResearchQuestion({
      surface: "stock",
      question: "What changed?",
      preferredRuntime: "browser_local",
      context: {
        surface: "stock",
        headline: "Research is improving.",
      },
    });

    expect(response.runtime).toBe("deterministic");
  });
});
