import { describe, it, expect } from "vitest";
import { buildResearchChecklist, type ChecklistInput } from "../researchChecklist";

describe("buildResearchChecklist", () => {
  const baseInput: ChecklistInput = {
    healthometerScores: [],
    momentumScore: null,
    riskScore: null,
    peContext: null,
    pbContext: null,
    debtWarning: null,
    volatilityNote: null,
    promoterHolding: null,
    fiiHolding: null,
    revenueGrowth: null,
    profitGrowth: null,
    roce: null,
    roe: null,
    debtToEquity: null,
    currentRatio: null,
    hasPeerData: false,
  };

  it("returns checklist with all categories", () => {
    const result = buildResearchChecklist(baseInput);
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.categories.length).toBe(10);
  });

  it("handles pass/watch/fail mapping correctly", () => {
    const result = buildResearchChecklist({
      ...baseInput,
      healthometerScores: [
        { id: "quality", label: "Business quality", score: 85 },
        { id: "financial_strength", label: "Financial strength", score: 75 },
      ],
      momentumScore: 70,
      riskScore: 25,
      roe: 18,
      roce: 22,
      revenueGrowth: 15,
      profitGrowth: 12,
      debtToEquity: 0.3,
      currentRatio: 2.0,
      promoterHolding: 60,
      fiiHolding: 15,
    });
    expect(result.passCount).toBeGreaterThan(2);
    expect(result.items.some((i) => i.status === "pass")).toBe(true);
    expect(result.items.some((i) => i.status === "not_enough_information")).toBe(true);
  });

  it("handles missing data safely", () => {
    const result = buildResearchChecklist(baseInput);
    const notEnoughInfo = result.items.filter((i) => i.status === "not_enough_information");
    expect(notEnoughInfo.length).toBeGreaterThan(0);
    expect(result.notEnoughInfoCount).toBeGreaterThan(0);
  });

  it("no fake passes when data is missing", () => {
    const result = buildResearchChecklist(baseInput);
    const passItems = result.items.filter((i) => i.status === "pass");
    expect(passItems.length).toBeLessThanOrEqual(2);
  });

  it("no Buy/Sell/Hold labels", () => {
    const result = buildResearchChecklist({
      ...baseInput,
      healthometerScores: [
        { id: "quality", label: "Business quality", score: 80 },
        { id: "financial_strength", label: "Financial strength", score: 70 },
      ],
    });
    const allText = [result.explanation, ...result.items.map((i) => i.label + " " + i.evidence)].join(" ");
    expect(allText).not.toMatch(/\b(Buy|Sell|Hold)\b/i);
  });

  it("no forbidden native copy", () => {
    const result = buildResearchChecklist(baseInput);
    const allText = [result.explanation].join(" ");
    const forbidden = ["N/A", "undefined", "NaN", "Infinity", "backend"];
    forbidden.forEach((term) => {
      expect(allText).not.toContain(term);
    });
  });

  it("identifies strongest and weakest categories", () => {
    const result = buildResearchChecklist({
      ...baseInput,
      healthometerScores: [
        { id: "quality", label: "Business quality", score: 85 },
        { id: "financial_strength", label: "Financial strength", score: 80 },
      ],
    });
    expect(result.strongestCategory).toBeTruthy();
    expect(result.weakestCategory).toBeTruthy();
  });
});
