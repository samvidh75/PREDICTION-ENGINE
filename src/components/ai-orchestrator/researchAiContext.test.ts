import { describe, expect, it } from "vitest";
import {
  buildAlertContext,
  buildCompareContext,
  buildScannerContext,
  buildStockResearchContext,
  buildWatchlistContext,
  compressResearchAiContext,
  compressResearchContext,
  toResearchAiContext,
} from "./researchAiContext";
import type { ResearchAiContext } from "./researchAiTypes";

describe("researchAiContext", () => {
  it("accepts safe Market Brain context", () => {
    const context = toResearchAiContext(
      {
        symbol: "TCS",
        companyName: "TCS",
        currentPrice: 4020,
        research: {
          headline: "Research is improving.",
          thesis: ["Margin quality remains steady."],
          risksToReview: ["Demand is worth reviewing."],
          whatToWatch: ["Next result cadence."],
          evidenceReview: { summary: "Required research evidence is available for this view." },
          methodNote: "Summary based on the signals shown on this page.",
          sector: "Technology",
        },
      },
      "market_brain",
    );

    expect(context?.headline).toBe("Research is improving.");
    expect(context?.researchNarrative).toEqual(["Margin quality remains steady."]);
    expect(context?.sector).toBe("Technology");
    expect(context?.currentPrice).toBe(4020);
  });

  it("drops unsafe internal fields", () => {
    const context = toResearchAiContext(
      {
        symbol: "TCS",
        research: {
          headline: "Ollama provider failed",
          thesis: ["Margin quality remains steady."],
          whatToWatch: ["source verified"],
        },
      },
      "market_brain",
    );

    expect(context?.headline).toBeUndefined();
    expect(context?.researchNarrative).toEqual(["Margin quality remains steady."]);
    expect(context?.whatToWatch).toBeUndefined();
  });

  it("bounds compressed context", () => {
    const context = toResearchAiContext(
      {
        symbol: "TCS",
        companyName: "TCS",
        research: {
          headline: "Research is improving.",
          thesis: new Array(20).fill("A very long but safe line about research context."),
        },
      },
      "market_brain",
    );

    expect(compressResearchAiContext(context!, 120).length).toBeLessThanOrEqual(120);
  });
});

describe("build context helpers", () => {
  it("builds stock-detail compatibility context", () => {
    const context = buildStockResearchContext("stock", " tcs ", "", {
      currentPrice: 4020,
      changeAbs: 12,
      changePercent: 0.3,
      research: {
        thesis: ["Revenue growth remains steady."],
        risksToReview: ["Demand is worth reviewing."],
        whatToWatch: ["Order momentum next quarter."],
        sector: "Technology",
      },
    });

    expect(context?.symbol).toBe("TCS");
    expect(context?.companyName).toBe("TCS");
    expect(context?.narrative).toEqual(["Revenue growth remains steady."]);
    expect(context?.currentPrice).toBe(4020);
  });

  it("builds scanner/watchlist/alert contexts without leaking unsafe copy", () => {
    const scanner = buildScannerContext("INFY", "Infosys", null);
    const watchlist = buildWatchlistContext("HDFCBANK", "HDFC Bank", {
      thesis: "Deposit growth remains steady.",
      bullCase: "Margin mix is improving.",
      bearCase: "Credit costs need review.",
      stance: "Watch",
      currentPrice: 1700,
    });
    const alert = buildAlertContext("TATASTEEL", "provider backend", {
      change: "API provider diagnostics should not reach users",
      summary: ["Cost discipline improved."],
      risks: ["backend adapter failed", "Input costs remain volatile."],
      nextSteps: ["RAG vector chunk", "Review export demand."],
      changeType: "source verified",
    });

    expect(scanner?.symbol).toBe("INFY");
    expect(scanner?.currentPrice).toBe(0);
    expect(watchlist?.extraContext).toBe("Watch");
    expect(watchlist?.narrative).toContain("Deposit growth remains steady.");
    expect(alert?.companyName).toBe("TATASTEEL");
    expect(alert?.narrative).toEqual(["Cost discipline improved."]);
    expect(alert?.risksToReview).toEqual(["Input costs remain volatile."]);
    expect(alert?.whatToWatch).toEqual(["Review export demand."]);
  });

  it("builds compare context with compact identifiers", () => {
    const compare = buildCompareContext(
      ["TCS", "INFY", "WIPRO", "HCLTECH"],
      ["TCS", "Infosys", "Wipro", "HCLTech"],
      {
        companies: [],
        factorComparison: [],
        missingDataCaveat: "Some research fields are still under review.",
      },
    );

    expect(compare?.symbol).toBe("TCS/INFY/WIPRO");
    expect(compare?.companyName).toBe("TCS vs Infosys vs Wipro");
  });
});

describe("compressResearchContext", () => {
  it("returns a compact compatibility narrative", () => {
    const context: ResearchAiContext = {
      surface: "stock",
      symbol: "LARGE",
      companyName: "LargeCorp",
      narrative: ["A".repeat(300), "B".repeat(300)],
      risksToReview: ["C".repeat(200)],
      whatToWatch: ["D".repeat(200)],
      researchNarrative: ["Revenue quality is improving."],
    };

    const compressed = compressResearchContext(context, 180);
    expect(compressed.narrative?.length).toBeGreaterThan(0);
    expect(compressed.narrative?.length).toBeLessThanOrEqual(5);
  });
});
