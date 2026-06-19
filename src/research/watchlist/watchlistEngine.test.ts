import { describe, expect, it } from "vitest";
import { trackThesis } from "./watchlistEngine";

describe("trackThesis", () => {
  it("returns Research signals pending for null score", () => {
    const r = trackThesis({ symbol: "NEW", companyName: "New Co", currentScore: null, previousScore: null, factorChanges: [], riskChanges: [], lastUpdated: null });
    expect(r.currentStatus).toBe("Research signals pending");
  });

  it("tracks strengthening thesis", () => {
    const r = trackThesis({ symbol: "TCS", companyName: "TCS", currentScore: 80, previousScore: 70, factorChanges: ["quality"], riskChanges: [], lastUpdated: "2024-01-01" });
    expect(r.currentStatus).toBe("Strengthening");
    expect(r.conviction).toBe("Very Healthy");
  });

  it("flags Needs review when risks change", () => {
    const r = trackThesis({ symbol: "RISK", companyName: "Risk Co", currentScore: 60, previousScore: 65, riskChanges: ["New regulation"], factorChanges: [], lastUpdated: new Date().toISOString() });
    expect(r.currentStatus).toBe("Needs review");
  });

  it("detects weakening thesis", () => {
    const r = trackThesis({ symbol: "WEAK", companyName: "Weak Co", currentScore: 30, previousScore: 50, factorChanges: ["quality", "growth"], riskChanges: [], lastUpdated: null });
    expect(r.currentStatus).toBe("Weakening");
  });

  it("no provider/backend wording", () => {
    const r = trackThesis({ symbol: "T", companyName: "Test", currentScore: 60, previousScore: 55, factorChanges: [], riskChanges: [], lastUpdated: null });
    expect(JSON.stringify(r)).not.toMatch(/provider|backend|api|source/i);
  });
});
