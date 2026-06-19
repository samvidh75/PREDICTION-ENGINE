import { describe, expect, it } from "vitest";
import { computeFreshness, getStorageStatus } from "../workspaceModels";
import { changeDetection } from "../changeDetection";
import type { ThesisSnapshot } from "../workspaceModels";

describe("workspaceModels", () => {
  describe("computeFreshness", () => {
    it("returns unknown for null timestamp", () => {
      expect(computeFreshness(null).label).toBeNull();
    });

    it("returns updated_today for recent timestamp", () => {
      const recent = new Date(Date.now() - 1000 * 60 * 60).toISOString();
      expect(computeFreshness(recent).label).toBe("Updated today");
    });

    it("returns updated_yesterday for ~25 hours ago", () => {
      const yesterday = new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString();
      expect(computeFreshness(yesterday).label).toBe("Updated yesterday");
    });

    it("returns updated_recently for 3 days ago", () => {
      const old = new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString();
      const result = computeFreshness(old);
      expect(result.label).toContain("days ago");
    });

    it("returns needs_review for stale timestamp", () => {
      const stale = new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString();
      expect(computeFreshness(stale).label).toBe("Needs review");
    });

    it("returns awaiting_cycle for very old timestamp", () => {
      const old = new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString();
      expect(computeFreshness(old).label).toBe("Awaiting latest research cycle");
    });
  });

  describe("getStorageStatus", () => {
    it("returns local status", () => {
      const s = getStorageStatus("local");
      expect(s.label).toContain("Saved on this device");
    });
    it("returns cloud status", () => {
      const s = getStorageStatus("cloud");
      expect(s.label).toContain("Saved to your account");
    });
  });
});

describe("changeDetection", () => {
  const baseSnapshot: ThesisSnapshot = {
    symbol: "RELIANCE",
    signalLabel: "Very Healthy",
    score: 80,
    confidence: 75,
    qualityScore: 85,
    valuationScore: 70,
    growthScore: 75,
    riskScore: 60,
    momentumScore: 65,
    topDrivers: ["Quality is a key contributor"],
    topRisks: [],
    timestamp: new Date().toISOString(),
  };

  it("returns no_prior_snapshot when no previous snapshot exists", () => {
    const events = changeDetection.detectChanges(null, baseSnapshot);
    expect(events.length).toBe(1);
    expect(events[0].type).toBe("no_prior_snapshot");
    expect(events[0].details[0]).toContain("Tracking begins now");
  });

  it("returns signal_changed when score changes", () => {
    const prior = { ...baseSnapshot, score: 70 };
    const events = changeDetection.detectChanges(prior, baseSnapshot);
    const signal = events.find((e) => e.type === "signal_changed");
    expect(signal).toBeDefined();
  });

  it("returns risk_rising when risk decreases below 40", () => {
    const prior = { ...baseSnapshot, riskScore: 50 };
    const current = { ...baseSnapshot, riskScore: 35 };
    const events = changeDetection.detectChanges(prior, current);
    const risk = events.find((e) => e.type === "risk_rising");
    expect(risk).toBeDefined();
  });

  it("returns factor_changed when factor scores change", () => {
    const prior = { ...baseSnapshot, qualityScore: 90 };
    const events = changeDetection.detectChanges(prior, baseSnapshot);
    const factor = events.find((e) => e.type === "factor_changed");
    expect(factor).toBeDefined();
  });

  it("does not leak provider/backend wording", () => {
    const events = changeDetection.detectChanges(null, baseSnapshot);
    const json = JSON.stringify(events);
    expect(json).not.toMatch(/provider|backend|api|source/i);
  });
});
