import { describe, expect, it } from "vitest";
import { generateAlerts } from "./alertsEngine";

describe("generateAlerts", () => {
  it("generates thesis change alert", () => {
    const alerts = generateAlerts({
      symbol: "TCS",
      previousThesisStatus: "Strengthening",
      currentThesisStatus: "Weakening",
      previousRiskLevel: null,
      currentRiskLevel: "Low",
      scoreChange: -15,
      priceChangePercent: null,
      peerBecameMoreAttractive: false,
      hasResultEvent: false,
    });
    expect(alerts.length).toBeGreaterThanOrEqual(1);
    expect(alerts.some(a => a.type === "thesis_change")).toBe(true);
  });

  it("generates risk change alert", () => {
    const alerts = generateAlerts({
      symbol: "RISK",
      previousThesisStatus: "Stable",
      currentThesisStatus: "Weakening",
      previousRiskLevel: "Low",
      currentRiskLevel: "High",
      scoreChange: null,
      priceChangePercent: null,
      peerBecameMoreAttractive: false,
      hasResultEvent: false,
    });
    expect(alerts.some(a => a.type === "risk_change")).toBe(true);
  });

  it("generates price move alert", () => {
    const alerts = generateAlerts({
      symbol: "P",
      previousThesisStatus: null,
      currentThesisStatus: "Tracking begins now",
      previousRiskLevel: null,
      currentRiskLevel: "Moderate",
      scoreChange: null,
      priceChangePercent: 8.5,
      peerBecameMoreAttractive: false,
      hasResultEvent: false,
    });
    expect(alerts.some(a => a.type === "price_move")).toBe(true);
  });

  it("returns empty for no changes", () => {
    const alerts = generateAlerts({
      symbol: "STABLE",
      previousThesisStatus: "Stable",
      currentThesisStatus: "Stable",
      previousRiskLevel: "Low",
      currentRiskLevel: "Low",
      scoreChange: 2,
      priceChangePercent: 1,
      peerBecameMoreAttractive: false,
      hasResultEvent: false,
    });
    expect(alerts).toHaveLength(0);
  });

  it("no forbidden labels in alerts", () => {
    const alerts = generateAlerts({
      symbol: "T", previousThesisStatus: "Strengthening", currentThesisStatus: "Stable",
      previousRiskLevel: "Low", currentRiskLevel: "Low",
      scoreChange: null, priceChangePercent: null,
      peerBecameMoreAttractive: true, hasResultEvent: true,
    });
    const json = JSON.stringify(alerts);
    expect(json).not.toMatch(/buy|sell|hold|provider|backend/i);
  });
});
