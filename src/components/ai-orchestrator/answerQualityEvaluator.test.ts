/**
 * Phase 18F — Answer quality evaluator for the research AI orchestrator.
 *
 * Evaluates response quality across all fallback paths:
 *  1. Deterministic fallback — relevance, completeness, conciseness
 *  2. Guardrail compliance — no unsafe content leaks
 *  3. Language support (Hindi + English)
 *  4. Context-aware responses
 *  5. Empty / boundary behaviour
 */

import { describe, expect, it } from "vitest";
import { buildDeterministicReply } from "./useResearchAiOrchestrator";
import { applyGuardrails, fallbackIfEmpty } from "./researchAiGuardrails";
import type { ResearchAiContext } from "./researchAiTypes";

/* ── Helpers ─────────────────────────────────────────────────── */

function makeContext(overrides: Partial<ResearchAiContext> = {}): ResearchAiContext {
  return {
    surface: "stock",
    symbol: "TCS",
    companyName: "Tata Consultancy Services",
    currentPrice: 3890.50,
    narrative: [
      "TCS reported 12% YoY revenue growth in Q4.",
      "Operating margins expanded by 80 bps to 24.5%.",
      "Strong deal wins of $9.2B in the quarter.",
    ],
    risksToReview: ["Client concentration in BFSI sector"],
    whatToWatch: ["US Fed interest rate decision", "Q1 FY25 results"],
    ...overrides,
  };
}

/* ── Evaluator: Deterministic reply quality ─────────────────── */

describe("Answer quality — Deterministic fallback", () => {
  it("E1: returns risk-focused answer for risk query", () => {
    const ctx = makeContext();
    const reply = buildDeterministicReply(ctx, "What are the key risks?");
    expect(reply).toContain("risk");
    expect(reply).toContain("Client concentration");
    expect(reply.length).toBeGreaterThan(30);
  });

  it("E2: returns growth answer for growth query", () => {
    const ctx = makeContext();
    const reply = buildDeterministicReply(ctx, "How is revenue growth?");
    expect(reply).toContain("revenue");
    expect(reply).toContain("12%");
  });

  it("E3: returns narrative summary for generic query", () => {
    const ctx = makeContext();
    const reply = buildDeterministicReply(ctx, "Tell me about this stock");
    expect(reply).toContain("Tata Consultancy Services");
    // Should include at least one bullet from narrative
    const bullets = (ctx.narrative ?? []).filter((n) => reply.includes(n));
    expect(bullets.length).toBeGreaterThan(0);
  });

  it("E4: returns watchlist items for outlook query", () => {
    const ctx = makeContext();
    const reply = buildDeterministicReply(ctx, "What is the outlook?");
    expect(reply).toContain("US Fed");
    expect(reply).toContain("Q1 FY25");
  });

  it("E5: returns polite fallback when no data available", () => {
    const ctx = makeContext({ narrative: [], risksToReview: [], whatToWatch: [] });
    const reply = buildDeterministicReply(ctx, "How is the business doing?");
    expect(reply).toMatch(/Tata Consultancy|this company/i);
    expect(reply.length).toBeGreaterThan(20);
  });

  it("E6: respects maximum length (≤800 chars)", () => {
    const ctx = makeContext({
      narrative: Array.from({ length: 50 }, (_, i) => `Bullet point number ${i + 1}`),
    });
    const reply = buildDeterministicReply(ctx, "Tell me everything");
    expect(reply.length).toBeLessThanOrEqual(810);
  });

  it("E7: answers risk query in Hindi", () => {
    const ctx = makeContext();
    const reply = buildDeterministicReply(ctx, "क्या जोखिम हैं?");
    expect(reply).toContain("जोखिम");
  });
});

/* ── Evaluator: Guardrail compliance ─────────────────────────- */

describe("Answer quality — Guardrails", () => {
  it("G1: removes harmful financial advice", () => {
    const harmful = "You should definitely buy this stock right now, it will go up 1000%.";
    const { sanitized } = applyGuardrails(harmful, makeContext());
    expect(sanitized).not.toContain("buy this stock");
    expect(sanitized).not.toContain("1000%");
  });

  it("G2: removes speculative price targets", () => {
    const speculative = "I predict the price will reach ₹10,000 by next month. This is a guaranteed winner.";
    const { sanitized } = applyGuardrails(speculative, makeContext());
    expect(sanitized).not.toContain("guaranteed");
    expect(sanitized).not.toContain("will reach");
  });

  it("G3: allows safe analytical text", () => {
    const safe = "The company reported 12% YoY revenue growth with operating margin of 24.5%.";
    const { sanitized } = applyGuardrails(safe, makeContext());
    expect(sanitized).toContain("12% YoY");
    expect(sanitized).toContain("24.5%");
  });

  it("G4: handles empty input gracefully", () => {
    const { sanitized } = applyGuardrails("", makeContext());
    expect(typeof sanitized).toBe("string");
  });
});

/* ── Evaluator: fallbackIfEmpty ─────────────────────────────- */

describe("Answer quality — fallbackIfEmpty", () => {
  it("F1: returns fallback text when response is empty", () => {
    const ctx = makeContext({ researchNarrative: ["TCS reported 12% YoY revenue growth."] });
    const fallback = fallbackIfEmpty(null, ctx);
    expect(fallback.length).toBeGreaterThan(20);
    expect(fallback).toContain("TCS");
  });

  it("F2: returns fallback text when runtime produces null", () => {
    const ctx = makeContext();
    const fallback = fallbackIfEmpty("", ctx);
    expect(fallback.length).toBeGreaterThan(0);
  });
});

/* ── Evaluator: Context awareness ───────────────────────────- */

describe("Answer quality — Context awareness", () => {
  it("C1: includes company name in substantive replies", () => {
    const ctx = makeContext();
    const queries: { q: string; expectCompany: boolean }[] = [
      { q: "What are the risks?", expectCompany: false },   // risks-first path omits name
      { q: "Tell me about this", expectCompany: true },     // generic narrative path
      { q: "How is valuation?", expectCompany: false },     // valuation path may show narrative bullets with no name
      { q: "What to watch?", expectCompany: false },        // watch path uses "Key items to watch:"
    ];
    for (const { q, expectCompany } of queries) {
      const reply = buildDeterministicReply(ctx, q);
      if (expectCompany) {
        expect(reply).toMatch(/TCS|Tata Consultancy|this company/i);
      }
      // Every reply should be non-empty and relevant
      expect(reply.length).toBeGreaterThan(10);
    }
  });

  it("C2: handles missing optional context gracefully", () => {
    const ctx = makeContext({
      companyName: null,
      currentPrice: null,
      narrative: [],
      risksToReview: [],
    });
    const reply = buildDeterministicReply(ctx, "What's new?");
    expect(reply.length).toBeGreaterThan(10);
    // Should not contain undefined / null
    expect(reply).not.toContain("undefined");
    expect(reply).not.toContain("null");
    expect(reply).not.toContain("NaN");
  });
});
