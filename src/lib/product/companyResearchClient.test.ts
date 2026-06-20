import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../services/api/client";
import { fetchUnifiedResearch } from "./companyResearchClient";

vi.mock("../../services/api/client", () => ({
  api: { getCompanyResearch: vi.fn(), getStockStory: vi.fn() },
}));

const research = {
  ok: true as const,
  data: {
    symbol: "RELIANCE", companyName: "Reliance Industries", sector: "Energy", industry: null,
    quote: null, fundamentals: null, candles: [], history: [], risk: null,
    factorScores: [{ name: "quality", score: 82, explanation: null }],
    thesis: { status: "Healthy", thesis: "Durable operating strength", bullCase: null, bearCase: null, topStrengths: ["Business quality"], topRisks: ["Valuation context"] },
    investContext: { conviction: "High conviction", score: 73, thesis: "Durable operating strength", keyRisks: ["Valuation context"], keyStrengths: ["Business quality"], whatToWatch: ["Capital efficiency"] },
  },
};

const story = {
  ok: true as const,
  data: {
    symbol: "RELIANCE", predictionDate: "2026-06-20", predictionHorizon: 30,
    rankingScore: 71, healthScore: 73,
    healthometer: { overallScore: 73, label: "Healthy", dimensions: [{ id: "quality", label: "Business quality", score: 76, status: "verified" }] },
    classification: "Thesis improving", confidence: { level: "High", score: 84 }, confidenceLevel: "High", confidenceScore: 84,
    sector: "Energy", growth: 65, quality: 76, valuation: 54, momentum: 68, risk: 42,
    narrative: "Research context", factors: null, engineDetails: null,
  },
};

describe("companyResearchClient", () => {
  beforeEach(() => vi.clearAllMocks());

  it("merges richer research and StockStory context into one view model", async () => {
    vi.mocked(api.getCompanyResearch).mockResolvedValue(research);
    vi.mocked(api.getStockStory).mockResolvedValue(story);
    const result = await fetchUnifiedResearch("RELIANCE", "Reliance Industries", "Energy", null, false);
    expect(result.identity.symbol).toBe("RELIANCE");
    expect(result.healthometerLabel).toBe("Healthy");
    expect(result.healthometer.overallScore).toBe(73);
    expect(result.prediction.readiness).toBe("ready");
    expect(result.prediction.publicResearchStance).toBe("High conviction");
    expect(result.analysis?.thesis).toBe("Durable operating strength");
  });

  it("uses StockStory safely when richer research fails", async () => {
    vi.mocked(api.getCompanyResearch).mockRejectedValue(new Error("RESEARCH_UNAVAILABLE"));
    vi.mocked(api.getStockStory).mockResolvedValue(story);
    const result = await fetchUnifiedResearch("RELIANCE", "Reliance Industries", "Energy", null, false);
    expect(result.state).toBe("partial");
    expect(result.prediction.readiness).toBe("ready");
    expect(result.message).not.toMatch(/RESEARCH_UNAVAILABLE|backend|API/i);
  });

  it("falls back without leaking raw errors when both requests fail", async () => {
    vi.mocked(api.getCompanyResearch).mockRejectedValue(new Error("SYMBOL_NOT_IN_UNIVERSE"));
    vi.mocked(api.getStockStory).mockRejectedValue(new Error("PREDICTION_NOT_FOUND"));
    const result = await fetchUnifiedResearch("UNKNOWN", "Unknown", null, null, false);
    expect(result.message).toBe("Research context is based on available data.");
    expect(JSON.stringify(result)).not.toMatch(/SYMBOL_NOT_IN_UNIVERSE|PREDICTION_NOT_FOUND/);
  });
});
