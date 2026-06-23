import { describe, expect, it } from "vitest";
import { FREE_SCANS, PREMIUM_SCANS, ALL_CATEGORIES, categoryLabel, getScanById, getScansByCategory } from "../scanCatalogue";

describe("scanCatalogue", () => {
  it("has at least 5 free scans", () => {
    expect(FREE_SCANS.length).toBeGreaterThanOrEqual(5);
  });

  it("has at least 10 premium scans", () => {
    expect(PREMIUM_SCANS.length).toBeGreaterThanOrEqual(10);
  });

  it("all scans have required fields", () => {
    const all = [...FREE_SCANS, ...PREMIUM_SCANS];
    for (const scan of all) {
      expect(scan.id).toBeTruthy();
      expect(scan.title).toBeTruthy();
      expect(scan.description).toBeTruthy();
      expect(scan.whyUseful).toBeTruthy();
      expect(scan.category).toBeTruthy();
      expect(typeof scan.free).toBe("boolean");
    }
  });

  it("free scans are marked free", () => {
    for (const scan of FREE_SCANS) {
      expect(scan.free).toBe(true);
    }
  });

  it("premium scans are marked not free", () => {
    for (const scan of PREMIUM_SCANS) {
      expect(scan.free).toBe(false);
    }
  });

  it("premium scans cover multiple categories", () => {
    const cats = new Set(PREMIUM_SCANS.map((s) => s.category));
    expect(cats.size).toBeGreaterThanOrEqual(5);
  });

  it("getScanById works", () => {
    const found = getScanById("increasing-profitability");
    expect(found).toBeTruthy();
    expect(found?.title).toBe("Increasing profitability");
  });

  it("getScanById returns undefined for unknown id", () => {
    expect(getScanById("nonexistent")).toBeUndefined();
  });

  it("ALL_CATEGORIES contains expected categories", () => {
    expect(ALL_CATEGORIES).toContain("quality");
    expect(ALL_CATEGORIES).toContain("profitability");
    expect(ALL_CATEGORIES).toContain("valuation");
    expect(ALL_CATEGORIES).toContain("momentum");
  });

  it("categoryLabel returns readable label", () => {
    expect(categoryLabel("profitability")).toBe("Profitability");
    expect(categoryLabel("balance_sheet")).toBe("Balance sheet");
  });

  it("getScansByCategory returns scans for a given category", () => {
    const qualityScans = getScansByCategory("quality");
    expect(qualityScans.length).toBeGreaterThan(0);
    for (const s of qualityScans) {
      expect(s.category).toBe("quality");
    }
  });

  it("no scan has forbidden recommendation language", () => {
    const all = [...FREE_SCANS, ...PREMIUM_SCANS];
    const forbidden = ["buy", "sell", "hold", "target price", "multibagger", "guaranteed"];
    for (const scan of all) {
      const text = `${scan.title} ${scan.description} ${scan.whyUseful}`.toLowerCase();
      for (const word of forbidden) {
        expect(text).not.toContain(word);
      }
    }
  });

  it("each scan has unique id", () => {
    const ids = [...FREE_SCANS, ...PREMIUM_SCANS].map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
