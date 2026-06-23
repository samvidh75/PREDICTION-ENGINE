import { describe, expect, it } from "vitest";
import { universalIntelligenceSearch } from "./universalIntelligenceSearch";

const base = {
  confidenceState: "NEUTRAL_ENVIRONMENT" as const,
  marketStateLabel: "NEUTRAL_MARKET",
  narrativeKey: 7,
};

describe("universalIntelligenceSearch", () => {
  it("ranks an exact ticker match ahead of narratives", () => {
    const results = universalIntelligenceSearch({ ...base, query: "RELIANCE" });
    expect(results[0]).toMatchObject({ kind: "stock", ticker: "RELIANCE" });
  });

  it("ranks an exact company-name match as a stock", () => {
    const results = universalIntelligenceSearch({ ...base, query: "Reliance Industries Ltd" });
    expect(results[0]).toMatchObject({ kind: "stock", ticker: "RELIANCE" });
  });
});
