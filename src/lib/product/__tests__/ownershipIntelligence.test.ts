import { describe, it, expect } from "vitest";
import { buildOwnershipIntelligence, type OwnershipInput } from "../ownershipIntelligence";

describe("buildOwnershipIntelligence", () => {
  it("returns Not enough information with no snapshots", () => {
    const result = buildOwnershipIntelligence({ snapshots: [] });
    expect(result.state).toBe("Not enough information");
    expect(result.promoterHolding).toBeNull();
  });

  it("handles single snapshot correctly", () => {
    const input: OwnershipInput = {
      snapshots: [
        { date: "2024-12-31", promoter: 55, fii: 12, dii: 8, public: 25, pledge: 5 },
      ],
    };
    const result = buildOwnershipIntelligence(input);
    expect(result.state).toBe("Promoter confidence stable");
    expect(result.promoterHolding).toBe(55);
    expect(result.fiiHolding).toBe(12);
    expect(result.promoterTrend).toBeNull();
  });

  it("detects multi-period trends", () => {
    const input: OwnershipInput = {
      snapshots: [
        { date: "2024-06-30", promoter: 50, fii: 8, dii: 10, public: 32, pledge: null },
        { date: "2024-09-30", promoter: 52, fii: 10, dii: 9, public: 29, pledge: null },
        { date: "2024-12-31", promoter: 55, fii: 15, dii: 7, public: 23, pledge: null },
      ],
    };
    const result = buildOwnershipIntelligence(input);
    expect(result.fiiTrend).toBe("rising");
    expect(result.state).toBe("Institutional support improving");
  });

  it("flags risk when FII is falling", () => {
    const input: OwnershipInput = {
      snapshots: [
        { date: "2024-06-30", promoter: 50, fii: 15, dii: 10, public: 25, pledge: null },
        { date: "2024-09-30", promoter: 48, fii: 8, dii: 12, public: 32, pledge: null },
        { date: "2024-12-31", promoter: 45, fii: 5, dii: 14, public: 36, pledge: null },
      ],
    };
    const result = buildOwnershipIntelligence(input);
    expect(result.riskFlags.some((f) => f.includes("selling"))).toBe(true);
    expect(result.state).toBe("Risk rising");
  });

  it("handles missing shareholding data safely", () => {
    const input: OwnershipInput = {
      snapshots: [
        { date: "2024-12-31", promoter: null, fii: null, dii: null, public: null, pledge: null },
      ],
    };
    const result = buildOwnershipIntelligence(input);
    expect(result.state).toBe("Stable ownership");
  });

  it("no NaN/Infinity", () => {
    const input: OwnershipInput = {
      snapshots: [
        { date: "2024-12-31", promoter: 55, fii: 12, dii: 8, public: 25, pledge: 5 },
      ],
    };
    const result = buildOwnershipIntelligence(input);
    const numericValues = [result.promoterHolding, result.fiiHolding, result.diiHolding, result.pledgePercent];
    numericValues.forEach((v) => {
      if (v !== null) expect(Number.isFinite(v)).toBe(true);
    });
  });

  it("flags high pledge", () => {
    const input: OwnershipInput = {
      snapshots: [
        { date: "2024-12-31", promoter: 50, fii: 10, dii: 8, public: 32, pledge: 60 },
      ],
    };
    const result = buildOwnershipIntelligence(input);
    expect(result.riskFlags.some((f) => f.includes("pledge"))).toBe(true);
  });
});
