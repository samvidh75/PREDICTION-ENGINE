import { describe, expect, it } from "vitest";
import { buildHindiSummary } from "../localisation/localisation";
import { analyseIpoCandidate } from "../discovery/ipoDiscovery";
import { verifyWhatsAppTip } from "./fraudShield";
import { runScenario } from "./scenarioSandbox";
import { evaluateThesisDrift, type UserThesis } from "./userThesis";

describe("research extension services", () => {
  it("evaluates thesis breaker drift alerts", () => {
    const thesis: UserThesis = {
      symbol: "TCS",
      thesis: "Quality compounder",
      createdAt: "2026-06-11T00:00:00.000Z",
      updatedAt: "2026-06-11T00:00:00.000Z",
      driftAlerts: [],
      breakers: [{ id: "b1", condition: "Health below floor", metricKey: "healthScore", operator: "lt", threshold: 70, active: true }],
    };

    expect(evaluateThesisDrift(thesis, { healthScore: 65 })).toEqual(["Health below floor triggered by healthScore=65"]);
  });

  it("creates Hindi summary with educational boundary", () => {
    const summary = buildHindiSummary({ companyName: "TCS", classification: "Healthy", confidence: "High", narrative: "Growth improved." });
    expect(summary).toContain("TCS");
    expect(summary).toContain("निवेश सलाह नहीं");
  });

  it("runs deterministic counterfactual scenario", () => {
    const result = runScenario({
      growthScore: 70,
      qualityScore: 75,
      stabilityScore: 80,
      valuationScore: 65,
      momentumScore: 60,
      riskScore: 40,
      revenueShockPct: 5,
      marginShockPct: 2,
      rateShockBps: 50,
    });
    expect(result.adjustedScore).toBeTypeOf("number");
    expect(result.explanation).toContain("Counterfactual");
  });

  it("flags risky WhatsApp tip language", () => {
    const result = verifyWhatsAppTip("Sure shot buy now, operator inside news, double in 2 days");
    expect(result.status).toBe("high-risk");
    expect(result.flags.length).toBeGreaterThan(2);
  });

  it("does not invent IPO analysis without source evidence", () => {
    expect(analyseIpoCandidate({ symbol: "IPOX", companyName: "IPO X", status: "upcoming", source: null, riskNotes: [] }))
      .toContain("Analysis unavailable");
  });
});
