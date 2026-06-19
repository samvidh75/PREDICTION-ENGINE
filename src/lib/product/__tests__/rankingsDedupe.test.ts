import { describe, expect, it } from "vitest";
import { dedupeRankings } from "../rankingsDedupe";

const baseEntry = {
  companyName: "ITC Ltd",
  sector: "Consumer",
  rank: 1,
  conviction: "High",
  keyReason: "Strong fundamentals",
  riskMarker: null,
};

describe("rankingsDedupe", () => {
  it("removes duplicate symbols, keeping highest score", () => {
    const input = [
      { symbol: "ITC", score: 75, ...baseEntry },
      { symbol: "ITC", score: 82, ...baseEntry },
      { symbol: "TCS", score: 60, ...baseEntry, companyName: "TCS Ltd" },
    ];
    const result = dedupeRankings(input);
    expect(result).toHaveLength(2);
    expect(result.find((r) => r.symbol === "ITC")?.score).toBe(82);
  });

  it("keeps first occurrence when no real scores exist", () => {
    const input = [
      { symbol: "ITC", score: null, ...baseEntry },
      { symbol: "ITC", score: null, ...baseEntry },
    ];
    const result = dedupeRankings(input);
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe("ITC");
  });

  it("assigns display rank sequentially after dedupe", () => {
    const input = [
      { symbol: "TCS", score: 90, ...baseEntry, companyName: "TCS Ltd" },
      { symbol: "ITC", score: 80, ...baseEntry },
      { symbol: "ITC", score: 85, ...baseEntry },
      { symbol: "RELIANCE", score: 70, ...baseEntry, companyName: "Reliance Ind" },
    ];
    const result = dedupeRankings(input);
    expect(result).toHaveLength(3);
    expect(result[0].displayRank).toBe(1);
    expect(result[1].displayRank).toBe(2);
    expect(result[2].displayRank).toBe(3);
  });

  it("normalizes symbol casing and whitespace - keeps highest score row", () => {
    const input = [
      { symbol: " ITC ", score: 75, ...baseEntry, keyReason: "original" },
      { symbol: "itc", score: 80, ...baseEntry, keyReason: "better" },
    ];
    const result = dedupeRankings(input);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(80);
    expect(result[0].keyReason).toBe("better");
  });

  it("does not fabricate values", () => {
    const input = [
      { symbol: "XYZ", score: null, ...baseEntry, companyName: "" },
    ];
    const result = dedupeRankings(input);
    expect(result[0].score).toBeNull();
    expect(result[0].companyName).toBe("");
  });

  it("handles empty array", () => {
    const result = dedupeRankings([]);
    expect(result).toHaveLength(0);
  });

  it("preserves unique symbols unchanged", () => {
    const input = [
      { symbol: "TCS", score: 90, ...baseEntry, companyName: "TCS Ltd" },
      { symbol: "ITC", score: 85, ...baseEntry },
      { symbol: "RELIANCE", score: 70, ...baseEntry, companyName: "Reliance Ind" },
    ];
    const result = dedupeRankings(input);
    expect(result).toHaveLength(3);
  });
});
