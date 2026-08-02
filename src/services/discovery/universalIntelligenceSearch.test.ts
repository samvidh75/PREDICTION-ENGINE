import { describe, expect, it } from "vitest";
import { universalIntelligenceSearch } from "./universalIntelligenceSearch";

const base = {
  confidenceState: "NEUTRAL_ENVIRONMENT" as const,
  marketStateLabel: "NEUTRAL_MARKET",
  narrativeKey: 7,
};

describe("universalIntelligenceSearch", () => {
  // JFC (Jollibee Foods Corporation) is a verified PSE registry entry.
  it("ranks an exact ticker match ahead of narratives", () => {
    const results = universalIntelligenceSearch({ ...base, query: "JFC" });
    expect(results[0]).toMatchObject({ kind: "stock", ticker: "JFC" });
  });

  it("ranks an exact company-name match as a stock", () => {
    const results = universalIntelligenceSearch({ ...base, query: "Jollibee Foods Corporation" });
    expect(results[0]).toMatchObject({ kind: "stock", ticker: "JFC" });
  });
});
