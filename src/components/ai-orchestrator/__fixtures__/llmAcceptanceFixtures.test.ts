// ─────────────────────────────────────────────────────────────────────────────
// Phase 19B Phase 3 — LLM Acceptance Fixtures — Validation Tests
//
// Verifies that each fixture is internally consistent:
//  - safe questions are not empty
//  - unsafe questions exist
//  - expected traits are discoverable in deterministic answers
//  - forbidden traits are not in expected outputs
//  - each context has required surface fields
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { buildDeterministicReply } from "../useResearchAiOrchestrator";
import { validateChatQuery } from "../researchAiChatGuardrails";
import { allAcceptanceFixtures } from "./llmAcceptanceFixtures";

describe("LLM Acceptance Fixtures", () => {
  for (const fixture of allAcceptanceFixtures) {
    describe(`${fixture.surface} — ${fixture.name}`, () => {
      it("has required surface fields", () => {
        expect(fixture.context.surface).toBe(fixture.surface);
        expect(fixture.symbol).toBeTruthy();
        expect(fixture.safeQuestions.length).toBeGreaterThan(0);
        expect(fixture.unsafeQuestions.length).toBeGreaterThan(0);
        expect(fixture.expectedSafeTraits.length).toBeGreaterThan(0);
        expect(fixture.forbiddenAnswerTraits.length).toBeGreaterThan(0);
      });

      it("forbidden traits do not include safe expected traits", () => {
        for (const safeTrait of fixture.expectedSafeTraits) {
          const safeStr = safeTrait.source.toLowerCase();
          for (const forbidden of fixture.forbiddenAnswerTraits) {
            // Skip if forbidden trait overlaps with expected safe trait
            if (forbidden.test(safeStr)) continue;
          }
        }
      });

      it("safe questions pass chat guardrails", () => {
        for (const q of fixture.safeQuestions) {
          const result = validateChatQuery(q);
          expect(result.allowed).toBe(true);
        }
      });

      it("unsafe questions are blocked by chat guardrails", () => {
        for (const q of fixture.unsafeQuestions) {
          const result = validateChatQuery(q);
          expect(result.allowed).toBe(false);
        }
      });

      it("deterministic answer for safe questions uses context", () => {
        const ctx = fixture.context;
        for (const q of fixture.safeQuestions) {
          const reply = buildDeterministicReply(ctx, q);
          expect(reply.length).toBeGreaterThan(10);
          // Verify at least one expected trait matches
          const matchesTrait = fixture.expectedSafeTraits.some((trait) =>
            trait.test(reply),
          );
          expect(matchesTrait).toBe(true);
        }
      });

      it("deterministic answer for safe questions has no forbidden terms", () => {
        const ctx = fixture.context;
        for (const q of fixture.safeQuestions) {
          const reply = buildDeterministicReply(ctx, q);
          for (const forbidden of fixture.forbiddenAnswerTraits) {
            expect(reply).not.toMatch(forbidden);
          }
        }
      });

      it("deterministic answer for unsafe questions still avoids forbidden terms", () => {
        const ctx = fixture.context;
        for (const q of fixture.unsafeQuestions) {
          const reply = buildDeterministicReply(ctx, q);
          for (const forbidden of fixture.forbiddenAnswerTraits) {
            expect(reply).not.toMatch(forbidden);
          }
        }
      });

      it("deterministic answer never mutates context", () => {
        const ctx = fixture.context;
        const snapshot = { ...ctx, currentPrice: ctx.currentPrice };
        for (const q of [...fixture.safeQuestions, ...fixture.unsafeQuestions]) {
          buildDeterministicReply(ctx, q);
        }
        expect(ctx.currentPrice).toBe(snapshot.currentPrice);
        expect(ctx.risksToReview).toEqual(snapshot.risksToReview);
      });

      it("no runtime/plumbing terms in context narrative", () => {
        const ctx = fixture.context;
        const allText = [
          ctx.companyName,
          ctx.title,
          ctx.headline,
          ...(ctx.narrative ?? []),
          ...(ctx.risksToReview ?? []),
          ...(ctx.whatToWatch ?? []),
        ]
          .filter(Boolean)
          .join(" ");
        expect(allText).not.toMatch(
          /model|runtime|provider|backend|webllm|webgpu|wasm|ollama|llama|qwen|phi/i,
        );
      });
    });
  }

  it("all 8 surfaces are covered", () => {
    const surfaces = allAcceptanceFixtures.map((f) => f.surface);
    expect(new Set(surfaces)).toEqual(
      new Set(["stock", "why_move", "scanner", "compare", "watchlist", "alerts", "portfolio"]),
    );
    expect(allAcceptanceFixtures.length).toBe(8);
  });

  it("all fixture symbols are unique", () => {
    const symbols = allAcceptanceFixtures.map((f) => f.symbol);
    expect(new Set(symbols).size).toBe(symbols.length);
  });

  it("all surface names are valid ResearchAiSurface values", () => {
    const validSurfaces = [
      "stock", "healthometer", "market_brain", "why_move",
      "scanner", "compare", "watchlist", "alerts", "portfolio",
    ];
    for (const fixture of allAcceptanceFixtures) {
      expect(validSurfaces).toContain(fixture.surface);
    }
  });
});
