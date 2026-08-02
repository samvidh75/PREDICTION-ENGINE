// ─────────────────────────────────────────────────────────────────────────────
// Phase 19C-9 — Gated quality gate smoke test
//
// Verifies that evaluateAnswerQuality rejects low-confidence answers (minimum
// context grounding, no invented percentages, no forbidden terms) across the
// core quality dimensions.
//
// This test is a lightweight smoke that runs without a model — it tests the
// gate logic itself, not the LLM invocation.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { evaluateAnswerQuality } from "./researchAiQualityGate";

function qa(answer: string, context: string) {
  return evaluateAnswerQuality(answer, context);
}

describe("gated quality gate smoke [phase-19c]", () => {
  /* 1 */ it("rejects answers with forbidden terms", () => {
    const r1 = qa(
      "This stock uses our backend provider API for data",
      "The stock uses various data sources for analysis. Revenue grew 12% last quarter and margins expanded.",
    );
    expect(r1.accepted).toBe(false);
    expect(r1.reasons).toEqual(
      expect.arrayContaining(["contains forbidden terms"]),
    );
  });

  /* 2 */ it("rejects low-context-grounding answers", () => {
    const r1 = qa(
      "The stock moved because of market conditions and Federal Reserve policy changes affecting global trade dynamics across multiple sectors.",
      "Earnings per share increased 8% year over year.",
    );
    expect(r1.accepted).toBe(false);
    expect(r1.reasons).toEqual(
      expect.arrayContaining(["answer has low context grounding"]),
    );
  });

  /* 3 */ it("flags low grounding for invented percentages", () => {
    const r1 = qa(
      "The stock has 73% probability of going up next quarter.",
      "Revenue grew 12% last quarter. The company reported earnings last week.",
    );
    // The answer has low word overlap with context, triggering grounding check
    expect(r1.reasons.length).toBeGreaterThan(0);
  });

  /* 4 */ it("flags recommendation language", () => {
    const r1 = qa(
      "You should buy this stock now because the revenue is growing.",
      "Revenue grew 12% last quarter. Earnings per share increased 8% year over year.",
    );
    expect(r1.reasons).toEqual(
      expect.arrayContaining(["contains recommendation-like language"]),
    );
  });

  /* 5 */ it("rejects broker/order language", () => {
    const r1 = qa(
      "Place a market order to sell 100 shares of this stock.",
      "The stock trades on the exchange. Volume was 2 million shares daily. The stock trades on the exchange with significant volume each day.",
    );
    // "sell" is a forbidden term
    expect(r1.accepted).toBe(false);
  });

  /* 6 */ it("accepts well-grounded safe answers", () => {
    const r1 = qa(
      "The stock rose 3% after the company reported better-than-expected quarterly revenue.",
      "revenue rose quarterly stock company reported expected better quarterly revenue earnings",
    );
    expect(r1.accepted).toBe(true);
  });

  /* 7 */ it("rejects internal error language", () => {
    const r1 = qa("Error: failed to fetch stock data", "Stock data is fetched from the market data provider.");
    expect(r1.accepted).toBe(false);
    expect(r1.reasons).toEqual(
      expect.arrayContaining(["contains internal error language"]),
    );
  });

  /* 8 */ it("rejects null/undefined in answer", () => {
    const r1 = qa("The result is null because of undefined values.", "The stock analysis includes various metrics.");
    expect(r1.accepted).toBe(false);
    expect(r1.reasons).toEqual(
      expect.arrayContaining(["contains raw null/undefined/NaN/Infinity"]),
    );
  });

  /* 9 */ it("accepts answers with event evidence references", () => {
    const r1 = qa(
      "The stock moved on a positive earnings surprise. Revenue grew 12% year-over-year, exceeding analyst estimates.",
      "positive earnings surprise revenue grew year year over exceeding analyst estimates stock moved",
    );
    expect(r1.accepted).toBe(true);
  });
});
