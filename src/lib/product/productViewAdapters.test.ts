import { describe, expect, it } from "vitest";
import { leaderboardEntryToResearchListItem, signalToProductAlert } from "./productViewAdapters";
import type { LeaderboardEntry, Signal } from "../../services/api/client";

const baseEntry: LeaderboardEntry = {
  rank: 1,
  symbol: "TCS",
  companyName: "Tata Consultancy Services",
  sector: "IT",
  industry: null,
  predictionDate: null,
  rankingScore: 78.4,
  classification: "research",
  confidenceScore: 68,
  confidenceLevel: null,
  factors: {
    quality: 82,
    growth: 64,
    value: 48,
    momentum: 57,
    risk: 72,
    sector: 61,
  },
};

describe("product view adapters", () => {
  it("maps leaderboard entries into product-facing research items", () => {
    const item = leaderboardEntryToResearchListItem(baseEntry);

    expect(item.company).toBe("Tata Consultancy Services");
    expect(item.symbol).toBe("TCS");
    expect(item.conviction).toBe("High conviction");
    expect(item.score).toBe("78");
    expect(item.keyReason).toContain("Quality");
    expect(JSON.stringify(item)).not.toMatch(/undefined|null|NaN|\[object Object\]/);
  });

  it("uses quiet states for missing leaderboard fields", () => {
    const item = leaderboardEntryToResearchListItem({
      ...baseEntry,
      companyName: "",
      sector: null,
      rankingScore: null,
      confidenceScore: null,
      factors: { quality: null, growth: null, value: null, momentum: null, risk: null, sector: null },
    });

    expect(item.company).toBe("TCS");
    expect(item.sector).toBe("Sector pending");
    expect(item.conviction).toBe("Needs research");
    expect(item.score).toBe("Research signals pending");
    expect(item.thesis).toBe("Awaiting research signals.");
  });

  it("maps research changes without exposing internal fields", () => {
    const signal: Signal = {
      symbol: "RELIANCE",
      type: "factor_change",
      severity: "important",
      explanation: "Risk changed after the latest review.",
    };

    expect(signalToProductAlert(signal)).toEqual({
      title: "RELIANCE: what changed",
      body: "Risk changed after the latest review.",
      tone: "caution",
    });
  });
});
