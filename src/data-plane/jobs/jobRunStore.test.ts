import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryJobRunStore } from "./jobRunStore";
import type { DataPlaneJobRun } from "./jobContracts";

function makeRun(overrides: Partial<DataPlaneJobRun> = {}): DataPlaneJobRun {
  return {
    id: "run-1",
    kind: "eod_refresh",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    status: "running",
    symbolsProcessed: 0,
    providerCalls: 0,
    cacheHits: 0,
    cacheWrites: 0,
    ...overrides,
  };
}

describe("InMemoryJobRunStore", () => {
  let store: InMemoryJobRunStore;

  beforeEach(() => {
    store = new InMemoryJobRunStore();
  });

  it("returns null for unknown kind", async () => {
    expect(await store.getLastRun("eod_refresh")).toBeNull();
  });

  it("returns empty array for recent unknown kind", async () => {
    expect(await store.getRecentRuns("eod_refresh")).toEqual([]);
  });

  it("stores and retrieves runs", async () => {
    const run = makeRun({ id: "r1" });
    await store.saveRun(run);
    const last = await store.getLastRun("eod_refresh");
    expect(last?.id).toBe("r1");
    expect(last?.status).toBe("running");
  });

  it("returns runs newest-first", async () => {
    await store.saveRun(makeRun({ id: "r1", status: "succeeded" }));
    await store.saveRun(makeRun({ id: "r2", status: "failed" }));
    const recent = await store.getRecentRuns("eod_refresh", 5);
    expect(recent[0].id).toBe("r2");
    expect(recent[1].id).toBe("r1");
  });

  it("separates runs by kind", async () => {
    await store.saveRun(makeRun({ id: "r1", kind: "eod_refresh" }));
    await store.saveRun(makeRun({ id: "r2", kind: "scanner_snapshot" }));
    expect((await store.getRecentRuns("eod_refresh")).length).toBe(1);
    expect((await store.getRecentRuns("scanner_snapshot")).length).toBe(1);
  });

  it("caps at 100 runs per kind", async () => {
    for (let i = 0; i < 150; i++) {
      await store.saveRun(makeRun({ id: `r${i}` }));
    }
    expect((await store.getRecentRuns("eod_refresh", 200)).length).toBe(100);
  });

  it("limited recent returns only requested count", async () => {
    for (let i = 0; i < 10; i++) {
      await store.saveRun(makeRun({ id: `r${i}` }));
    }
    expect((await store.getRecentRuns("eod_refresh", 3)).length).toBe(3);
  });
});
