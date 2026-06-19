import { describe, expect, it } from "vitest";
import {
  leaderboardEntryToResearchListItem, signalToProductAlert,
  alertChangeToProductAlert, scannerResultToResearchListItem,
  convictionToLabel, factorDescription, thesisToStatusText,
} from "./productViewAdapters";
import type { LeaderboardEntry, Signal } from "../../services/api/client";
import type { AlertChangeView, ScannerResultView, CompanyThesisView } from "../../research/contracts/productContracts";

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
    expect(item.conviction).toBe("Very Healthy");
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
    expect(item.sector).toBe("");
    expect(item.conviction).toBe("");
    expect(item.score).toBe("");
    expect(item.thesis).toBe("");
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

  it("alertChangeToProductAlert converts without provider wording", () => {
    const alert: AlertChangeView = {
      id: "1", symbol: "TCS", type: "thesis_change",
      title: "TCS: research thesis changed",
      body: "Thesis moved from strengthening to stable.",
      timestamp: "2024-01-01T00:00:00Z", acknowledged: false,
    };
    const r = alertChangeToProductAlert(alert);
    expect(r.title).toContain("TCS");
    const json = JSON.stringify(r);
    expect(json).not.toMatch(/provider|backend|api|source/i);
  });

  it("scannerResultToResearchListItem uses product-safe labels", () => {
    const result: ScannerResultView = {
      symbol: "TCS", companyName: "TCS Ltd", sector: "IT",
      rank: 1, conviction: "Very Healthy", score: 82,
      oneLineThesis: "Strong quality profile", keyReason: "Quality leads",
      riskMarker: null,
    };
    const item = scannerResultToResearchListItem(result);
    expect(item.conviction).toBe("Very Healthy");
    expect(JSON.stringify(item)).not.toMatch(/provider|backend|api|source/i);
  });

  it("convictionToLabel handles all score ranges", () => {
    expect(convictionToLabel(null)).toBe("");
    expect(convictionToLabel(80)).toBe("Very Healthy");
    expect(convictionToLabel(60)).toBe("Healthy");
    expect(convictionToLabel(40)).toBe("Unhealthy");
    expect(convictionToLabel(20)).toBe("Very Unhealthy");
  });

  it("factorDescription stays product-safe", () => {
    expect(factorDescription("quality", 80)).toBe("Quality: 80");
    expect(factorDescription("risk", null)).toBe("");
  });

  it("thesisToStatusText returns fallback for null thesis", () => {
    const thesis: CompanyThesisView = {
      symbol: "X", status: "Research signals pending",
      thesis: null, bullCase: null, bearCase: null,
      topStrengths: [], topRisks: [], whatWouldChange: [], priorStatus: null,
    };
    expect(thesisToStatusText(thesis)).toBe("");
  });
});
