import { describe, it, expect } from "vitest";
import { buildCompanyPageData, companyResearchToFactorScores, computeSignalFromResearchData } from "../researchDataAdapter";

describe("companyResearchToFactorScores", () => {
  it("returns null for null input", () => {
    expect(companyResearchToFactorScores(null)).toBeNull();
  });

  it("returns null for empty factorScores", () => {
    expect(companyResearchToFactorScores({ symbol: "TEST", factorScores: [] } as any)).toBeNull();
  });

  it("maps factor scores correctly", () => {
    const result = companyResearchToFactorScores({
      symbol: "TEST",
      factorScores: [
        { name: "quality", score: 85, explanation: "Strong quality" },
        { name: "growth", score: 70, explanation: "Moderate growth" },
        { name: "risk", score: 45, explanation: "Elevated risk" },
      ],
    } as any);

    expect(result).not.toBeNull();
    expect(result!.qualityScore).toBe(85);
    expect(result!.growthScore).toBe(70);
    expect(result!.riskScore).toBe(45);
    expect(result!.qualityExplanation).toBe("Strong quality");
    expect(result!.stabilityScore).toBeNull();
  });
});

describe("computeSignalFromResearchData", () => {
  it("returns pending for null input", () => {
    const signal = computeSignalFromResearchData(null);
    expect(signal.label).toBe("Research signals pending");
  });

  it("returns signal for data with factor scores", () => {
    const signal = computeSignalFromResearchData({
      symbol: "TEST",
      factorScores: [
        { name: "quality", score: 85, explanation: "Strong" },
        { name: "growth", score: 80, explanation: "Good" },
        { name: "stability", score: 75, explanation: "Stable" },
        { name: "momentum", score: 70, explanation: "Positive" },
        { name: "valuation", score: 65, explanation: "Fair" },
        { name: "risk", score: 55, explanation: "Moderate" },
      ],
    } as any);

    expect(signal.label).toBe("Very Healthy");
    expect(signal.score).not.toBeNull();
    expect(signal.tone).toBe("constructive");
  });

  it("uses thesis data when available", () => {
    const signal = computeSignalFromResearchData({
      symbol: "TEST",
      factorScores: [
        { name: "quality", score: 70, explanation: "" },
        { name: "growth", score: 65, explanation: "" },
        { name: "stability", score: 60, explanation: "" },
      ],
      thesis: {
        status: "Strengthening",
        thesis: "Strong business model",
        bullCase: "Market leader",
        bearCase: "Regulatory risk",
        topStrengths: ["Market position"],
        topRisks: ["Regulation"],
      },
    } as any);

    expect(signal.label).not.toBe("Research signals pending");
  });
});

describe("buildCompanyPageData", () => {
  it("returns data with research signal when research data is available", () => {
    const result = buildCompanyPageData(
      {
        symbol: "TEST",
        factorScores: [
          { name: "quality", score: 85, explanation: "" },
          { name: "growth", score: 80, explanation: "" },
          { name: "stability", score: 75, explanation: "" },
          { name: "momentum", score: 70, explanation: "" },
          { name: "valuation", score: 65, explanation: "" },
          { name: "risk", score: 55, explanation: "" },
        ],
        thesis: { status: "Strengthening", thesis: "Strong case", bullCase: "Bull", bearCase: "Bear", topStrengths: ["S1"], topRisks: ["R1"] },
      } as any,
      null,
      null,
    );

    expect(result.signal).not.toBeNull();
    expect(result.signal!.label).toBe("Very Healthy");
    expect(result.factors).not.toBeNull();
    expect(result.narrative).toBe("Strong case");
    expect(result.bullCase).toBe("Bull");
    expect(result.bearCase).toBe("Bear");
    expect(result.topStrengths).toEqual(["S1"]);
    expect(result.topRisks).toEqual(["R1"]);
    expect(result.hasResearch).toBe(true);
  });

  it("falls back to stock story data when research data is absent", () => {
    const result = buildCompanyPageData(null, { narrative: "Fallback narrative", classification: "Good" }, null);

    expect(result.signal).toBeNull();
    expect(result.factors).toBeNull();
    expect(result.narrative).toBe("Fallback narrative");
    expect(result.hasResearch).toBe(false);
    expect(result.classification).toBe("Good");
  });
});
