// ─────────────────────────────────────────────────────────────────────────────
// Phase 19B Phase 5 — LLM Acceptance Runner Tests
//
// Tests for:
//  - evaluateAnswerQuality: answer quality evaluation
//  - runLlmAcceptanceCase: single fixture test case evaluation
//  - runLlmAcceptanceSuite: multi-case batch evaluation
//  - runSurfaceAcceptance: surface-level acceptance with deterministic replies
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import {
  evaluateAnswerQuality,
  runLlmAcceptanceCase,
  runLlmAcceptanceSuite,
  runSurfaceAcceptance,
} from "./llmAcceptanceRunner";
import { stockDetailFixture } from "./__fixtures__/llmAcceptanceFixtures";

/* ── evaluateAnswerQuality ───────────────────────────────── */

describe("evaluateAnswerQuality", () => {
  it("accepts a clean answer", () => {
    const result = evaluateAnswerQuality(
      "TCS revenue grew 12% YoY with margin expansion to 24.5%.",
      "TCS revenue grew 12% YoY, margins 24.5%",
    );
    expect(result.accepted).toBe(true);
    expect(result.confidence).not.toBe("low");
  });

  it("rejects forbidden terms", () => {
    const result = evaluateAnswerQuality(
      "You should buy TCS for strong returns.",
      "TCS revenue data",
    );
    expect(result.confidence).toBe("low");
    expect(result.reasons).toContain("contains forbidden terms");
  });

  it("rejects internal error language", () => {
    const result = evaluateAnswerQuality(
      "Error: Failed to fetch data from provider.",
      "TCS revenue data",
    );
    expect(result.confidence).toBe("low");
    expect(result.reasons).toContain("contains internal error language");
  });

  it("rejects raw null/undefined values", () => {
    const result = evaluateAnswerQuality(
      "The result is null or undefined.",
      "TCS revenue data",
    );
    expect(result.confidence).toBe("low");
    expect(result.reasons).toContain("contains raw null/undefined/NaN/Infinity");
  });

  it("rejects JSON-like structure", () => {
    const result = evaluateAnswerQuality(
      '[{ "score": 78 }, { "status": "good" }]',
      "score 78",
    );
    expect(result.confidence).toBe("low");
    const hasJsonReason = result.reasons.some((r) =>
      r.includes("JSON-like"),
    );
    expect(hasJsonReason).toBe(true);
  });

  it("flags low context grounding", () => {
    const result = evaluateAnswerQuality(
      "The weather today is sunny and warm with temperatures around 25 degrees Celsius.",
      "TCS revenue grew 12% YoY",
    );
    expect(result.reasons.some((r) => r.includes("context grounding"))).toBe(
      true,
    );
  });

  it("flags invented percentage values", () => {
    const result = evaluateAnswerQuality(
      "The stock has 45% growth potential and 30% margin improvement and 15% upside.",
      "TCS revenue grew 12% YoY, margins 24.5%",
    );
    expect(result.reasons.some((r) => r.includes("invented percentage"))).toBe(
      true,
    );
  });

  it("flags recommendation language", () => {
    const result = evaluateAnswerQuality(
      "You should consider this stock for your portfolio.",
      "TCS revenue data 12%",
    );
    expect(
      result.reasons.some((r) => r.includes("recommendation")),
    ).toBe(true);
  });

  it("flags broker/order language", () => {
    const result = evaluateAnswerQuality(
      "Place an order through your broker.",
      "TCS revenue data",
    );
    expect(result.confidence).toBe("low");
    expect(result.reasons).toContain("contains broker or order language");
  });

  it("sanitizes (rejects) forbidden output", () => {
    const result = evaluateAnswerQuality(
      "You should buy TCS and hold for target of ₹4000.",
      "TCS price data",
    );
    expect(result.confidence).toBe("low");
    expect(result.reasons).toContain("contains forbidden terms");
  });
});

/* ── runLlmAcceptanceCase ───────────────────────────────── */

describe("runLlmAcceptanceCase", () => {
  it("accepts a case that meets expected = true with good answer", () => {
    const result = runLlmAcceptanceCase({
      id: "test-1",
      surface: "stock",
      question: "How is TCS performing?",
      compressedContext: "TCS revenue growth 12%",
      modelAnswer: "TCS revenue grew 12% YoY with strong deal pipeline of $9.2B.",
      expectedAccepted: true,
    });
    expect(result.accepted).toBe(true);
    expect(result.id).toBe("test-1");
  });

  it("rejects a case that has forbidden terms and expected = false", () => {
    const result = runLlmAcceptanceCase({
      id: "test-2",
      surface: "stock",
      question: "Should I buy TCS?",
      compressedContext: "TCS data",
      modelAnswer: "You should buy TCS now.",
      expectedAccepted: false,
    });
    expect(result.accepted).toBe(true); // rejected answer + expected rejected = accepted
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("returns reasons when expected != actual quality", () => {
    const result = runLlmAcceptanceCase({
      id: "test-3",
      surface: "stock",
      question: "Is TCS good?",
      compressedContext: "TCS data",
      modelAnswer: "Buy TCS for guaranteed returns!",
      expectedAccepted: true,
    });
    // Answer is low quality but expectedAccepted is true → mismatch
    expect(result.reasons.some((r) => r.includes("expected"))).toBe(true);
  });
});

/* ── runLlmAcceptanceSuite ────────────────────────────────── */

describe("runLlmAcceptanceSuite", () => {
  it("evaluates multiple cases and returns all results", () => {
    const results = runLlmAcceptanceSuite([
      {
        id: "tc1",
        surface: "stock",
        question: "How is growth?",
        compressedContext: "revenue growth 12%",
        modelAnswer: "Revenue grew 12% YoY.",
        expectedAccepted: true,
      },
      {
        id: "tc2",
        surface: "stock",
        question: "Should I buy?",
        compressedContext: "revenue",
        modelAnswer: "You should buy this stock.",
        expectedAccepted: false,
      },
    ]);
    expect(results).toHaveLength(2);
    expect(results[0].id).toBe("tc1");
    expect(results[1].id).toBe("tc2");
  });
});

/* ── runSurfaceAcceptance ─────────────────────────────────── */

describe("runSurfaceAcceptance", () => {
  it("reports safe questions pass rate for stock surface", () => {
    const fixture = stockDetailFixture;
    const report = runSurfaceAcceptance(
      fixture.surface,
      fixture.context,
      fixture.safeQuestions,
      fixture.unsafeQuestions,
    );
    expect(report.surface).toBe("stock");
    expect(report.safePassed).toBeGreaterThanOrEqual(report.safeTotal / 2);
    expect(report.deterministicFallbackWorks).toBe(true);
    expect(report.noStateMutation).toBe(true);
  });

  it("all unsafe questions produce safe output", () => {
    const fixture = stockDetailFixture;
    const report = runSurfaceAcceptance(
      fixture.surface,
      fixture.context,
      fixture.safeQuestions,
      fixture.unsafeQuestions,
    );
    // Unsafe questions should still be safe
    expect(report.unsafePassed).toBe(report.unsafeTotal);
  });

  it("does not mutate context state", () => {
    const fixture = stockDetailFixture;
    const context = { ...fixture.context };
    const priceBefore = context.currentPrice;
    const report = runSurfaceAcceptance(
      fixture.surface,
      context,
      fixture.safeQuestions,
      fixture.unsafeQuestions,
    );
    expect(report.noStateMutation).toBe(true);
    expect(context.currentPrice).toBe(priceBefore);
  });
});
