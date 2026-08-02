import { describe, expect, it } from "vitest";
import { buildWatchlistAiExplanationContext } from "./watchlistAiExplanationContext";

const thesisItem = {
  symbol: "RELIANCE",
  companyName: "Reliance Industries",
  currentStatus: "Needs review" as const,
  previousStatus: "Stable" as const,
  conviction: "Caution",
  score: 54,
  lastUpdated: "2026-06-30T09:00:00.000Z",
  scoreDirection: "declining" as const,
  lastThesis: "Margins need review after recent operating pressure.",
};

const alert = {
  id: "RELIANCE-risk-change-test",
  symbol: "RELIANCE",
  type: "risk_change" as const,
  title: "RELIANCE thesis needs review",
  body: "Margin pressure should be reviewed before the next thesis update.",
  timestamp: "2026-06-30T09:10:00.000Z",
  acknowledged: false,
};

const unsafeCopy = /provider|backend|adapter|diagnostic|coverage|freshness|lineage|migration|backfill|rag|vector|embedding|chunk|webllm|webgpu|wasm|ollama|llama|qwen|phi|guaranteed|sure shot|multibagger|buy|sell|hold|target/i;

describe("buildWatchlistAiExplanationContext", () => {
  it("merges thesis changes and alerts into one safe watchlist context", () => {
    const context = buildWatchlistAiExplanationContext({
      thesisItems: [thesisItem],
      alerts: [alert],
    });

    expect(context?.surface).toBe("watchlist");
    expect(context?.title).toBe("Watchlist research explanation");
    expect(context?.symbol).toBe("RELIANCE");
    expect(context?.watchlistContext).toContain("Margins need review after recent operating pressure.");
    expect(context?.alertContext).toContain("Margin pressure should be reviewed before the next thesis update.");
    expect(context?.whatChanged).toEqual(["RELIANCE: Needs review"]);
  });

  it("returns null when no useful safe context is available", () => {
    expect(buildWatchlistAiExplanationContext({ thesisItems: [], alerts: [] })).toBeNull();
    expect(buildWatchlistAiExplanationContext({})).toBeNull();
  });

  it("drops unsafe public copy before AI explanation context is exposed", () => {
    const context = buildWatchlistAiExplanationContext({
      thesisItems: [
        {
          ...thesisItem,
          conviction: "Buy now",
          lastThesis: "backend provider diagnostic payload",
        },
      ],
      alerts: [
        {
          ...alert,
          title: "API provider alert",
          body: "Guaranteed multibagger target from backend adapter",
        },
      ],
    });

    const renderedContext = JSON.stringify(context);
    expect(renderedContext).not.toMatch(unsafeCopy);
    expect(context?.whatChanged).toEqual(["RELIANCE: Needs review"]);
  });

  it("caps merged lists and dedupes repeated context", () => {
    const context = buildWatchlistAiExplanationContext({
      thesisItems: new Array(8).fill(thesisItem),
      alerts: new Array(8).fill(alert),
    });

    expect(context?.watchlistContext?.length).toBeLessThanOrEqual(5);
    expect(context?.alertContext?.length).toBeLessThanOrEqual(5);
    expect(context?.whatChanged).toEqual(["RELIANCE: Needs review"]);
  });
});
