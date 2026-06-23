import { describe, expect, it, beforeEach } from "vitest";
import { StockEdgeExtractionRunStore } from "../StockEdgeExtractionRunStore";

describe("StockEdgeExtractionRunStore", () => {
  let store: StockEdgeExtractionRunStore;

  beforeEach(() => {
    store = new StockEdgeExtractionRunStore();
  });

  it("starts with no runs", () => {
    expect(store.getRecentRuns()).toHaveLength(0);
    expect(store.getLastRunForSymbol("RELIANCE")).toBeUndefined();
  });

  it("records and retrieves a run", () => {
    store.recordRun({
      id: "run-1",
      symbol: "RELIANCE",
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      ok: true,
      layersAttempted: ["profile", "price"],
      layersAvailable: ["profile"],
      mappedFieldCount: 10,
      activeFactorInputCount: 5,
      errors: [],
      elapsedMs: 1000,
    });

    expect(store.getRecentRuns()).toHaveLength(1);
    expect(store.getLastRunForSymbol("RELIANCE")).toBeDefined();
    expect(store.getLastRunForSymbol("RELIANCE")!.ok).toBe(true);
  });

  it("returns undefined for unknown symbol", () => {
    expect(store.getLastRunForSymbol("UNKNOWN")).toBeUndefined();
  });

  it("limits runs to 1000", () => {
    for (let i = 0; i < 1500; i++) {
      store.recordRun({
        id: `run-${i}`,
        symbol: "TEST",
        startedAt: new Date().toISOString(),
        ok: true,
        layersAttempted: [],
        layersAvailable: [],
        mappedFieldCount: 0,
        activeFactorInputCount: 0,
        errors: [],
        elapsedMs: 0,
      });
    }
    expect(store.getRecentRuns().length).toBeLessThanOrEqual(500);
  });

  it("records and retrieves snapshots", () => {
    store.recordSnapshot({
      symbol: "TCS",
      capturedAt: new Date().toISOString(),
      layersAvailable: ["price", "fundamentals"],
      mappedFieldCount: 8,
      ttlSeconds: 3600,
    });

    const snapshot = store.getSnapshot("TCS");
    expect(snapshot).toBeDefined();
    expect(snapshot!.mappedFieldCount).toBe(8);
  });

  it("returns undefined for expired snapshot", () => {
    store.recordSnapshot({
      symbol: "EXPIRED",
      capturedAt: new Date(Date.now() - 7200_000).toISOString(),
      layersAvailable: [],
      mappedFieldCount: 0,
      ttlSeconds: 1,
    });

    expect(store.getSnapshot("EXPIRED")).toBeUndefined();
  });

  it("clears all data", () => {
    store.recordRun({ id: "r1", symbol: "TEST", startedAt: new Date().toISOString(), ok: true, layersAttempted: [], layersAvailable: [], mappedFieldCount: 0, activeFactorInputCount: 0, errors: [], elapsedMs: 0 });
    store.recordSnapshot({ symbol: "TEST", capturedAt: new Date().toISOString(), layersAvailable: [], mappedFieldCount: 0, ttlSeconds: 3600 });
    store.clearAll();
    expect(store.getRecentRuns()).toHaveLength(0);
    expect(store.getSnapshot("TEST")).toBeUndefined();
  });
});
