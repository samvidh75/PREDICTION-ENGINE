// src/components/ai-orchestrator/anomalyAiContext.test.ts
// Phase 19A-5 — Tests for the "Why did this move?" AI context adapter.

import { describe, it, expect } from "vitest";
import { toAnomalyResearchAiContext } from "./anomalyAiContext";
import type { MarketAnomalyEvidencePack } from "../../systems/market-brain/anomalyEvidencePack";

function makePack(overrides: Partial<MarketAnomalyEvidencePack> = {}): MarketAnomalyEvidencePack {
  return {
    symbol: "TCS",
    timeframe: "1d",
    anomalyType: "Stock-specific move",
    severity: "High",
    evidence: [
      "Price moved +5.2% over 1d",
      "Volume at 2.8x the 20-day average",
      "Sector moved +0.8% in the same period",
      "Index moved +0.3% in the same period",
    ],
    missingEvidence: [],
    narrativePromptPayload: JSON.stringify({
      anomalyType: "Stock-specific move",
      severity: "High",
      evidenceCount: 4,
    }),
    ...overrides,
  };
}

describe("toAnomalyResearchAiContext", () => {
  it("returns a valid context for a full anomaly pack", () => {
    const pack = makePack();
    const ctx = toAnomalyResearchAiContext(pack);

    expect(ctx).not.toBeNull();
    expect(ctx!.surface).toBe("why_move");
    expect(ctx!.symbol).toBe("TCS");
    expect(ctx!.companyName).toBeNull();
    expect(ctx!.headline).toContain("5.2%");
    expect(ctx!.researchNarrative).toBeDefined();
    expect(ctx!.evidenceToReview).toBeDefined();
    expect(ctx!.evidenceToReview!.length).toBeGreaterThanOrEqual(4);
    expect(ctx!.risksToReview).toBeUndefined();
    expect(ctx!.whatToWatch).toBeUndefined();
  });

  it("returns null when pack is null", () => {
    expect(toAnomalyResearchAiContext(null)).toBeNull();
  });

  it("returns null when pack is undefined", () => {
    expect(toAnomalyResearchAiContext(undefined)).toBeNull();
  });

  it("returns null when pack has no evidence and no missing evidence", () => {
    const pack = makePack({ evidence: [], missingEvidence: [] });
    expect(toAnomalyResearchAiContext(pack)).toBeNull();
  });

  it("strips forbidden recommendation terms from text", () => {
    const pack = makePack({
      evidence: [
        "Price moved +3% on what looks like a Strong Buy opportunity with target of 5000",
        "guaranteed multibagger returns expected",
      ],
    });
    const ctx = toAnomalyResearchAiContext(pack);
    expect(ctx).not.toBeNull();
    // The auto-derived headline also gets the evidence text cleaned
    expect(ctx!.headline).not.toMatch(/buy|target/i);
    expect(ctx!.evidenceToReview?.[0]).not.toMatch(/buy|target/i);
    expect(ctx!.evidenceToReview?.[1]).not.toMatch(/guaranteed|multibagger/i);
  });

  it("includes missing evidence items with safe wording", () => {
    const pack = makePack({
      missingEvidence: ["Delivery volume", "Open interest change"],
    });
    const ctx = toAnomalyResearchAiContext(pack);
    expect(ctx).not.toBeNull();
    expect(ctx!.evidenceToReview?.some((e) => e.includes("needs more context"))).toBe(true);
    // risksToReview is also sourced from missingEvidence
    expect(ctx!.risksToReview?.some((r) => r.includes("needs more context"))).toBe(true);
  });

  it("does not include backend/provider/model terms", () => {
    const pack = makePack({
      narrativePromptPayload: JSON.stringify({
        backend: "yahoo",
        provider: "yahoo-finance",
        model: "gpt-4",
        runtime: "browser_local",
      }),
    });
    const ctx = toAnomalyResearchAiContext(pack);
    expect(ctx).not.toBeNull();
    if (ctx?.extraContext) {
      expect(ctx.extraContext).not.toMatch(/backend|provider|model|runtime/i);
    }
  });

  it("caps string and array lengths", () => {
    const pack = makePack({
      symbol: "A".repeat(100),
      evidence: Array.from({ length: 20 }, (_, i) => `Evidence item ${i}`),
    });
    const ctx = toAnomalyResearchAiContext(pack);
    expect(ctx).not.toBeNull();
    expect(ctx!.symbol!.length).toBeLessThanOrEqual(24);
    expect(ctx!.evidenceToReview!.length).toBeLessThanOrEqual(8);
  });
});
