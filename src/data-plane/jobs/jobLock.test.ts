import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryJobLock } from "./jobLock";

describe("InMemoryJobLock", () => {
  let lock: InMemoryJobLock;

  beforeEach(() => {
    lock = new InMemoryJobLock();
  });

  it("acquires a lock that was free", async () => {
    const ok = await lock.acquire("eod_refresh", "2025-07-14");
    expect(ok).toBe(true);
  });

  it("prevents same job from running twice concurrently", async () => {
    await lock.acquire("eod_refresh", "2025-07-14");
    const second = await lock.acquire("eod_refresh", "2025-07-14");
    expect(second).toBe(false);
  });

  it("allows different job kinds concurrently", async () => {
    await lock.acquire("eod_refresh", "2025-07-14");
    const ok = await lock.acquire("healthometer_snapshot", "2025-07-14");
    expect(ok).toBe(true);
  });

  it("allows same job on different dates", async () => {
    await lock.acquire("eod_refresh", "2025-07-14");
    const ok = await lock.acquire("eod_refresh", "2025-07-15");
    expect(ok).toBe(true);
  });

  it("expired lock can be reclaimed", async () => {
    await lock.acquire("eod_refresh", "2025-07-14", 10); // 10ms TTL
    await new Promise((r) => setTimeout(r, 20));
    const ok = await lock.acquire("eod_refresh", "2025-07-14");
    expect(ok).toBe(true);
  });

  it("isLocked returns false after release", async () => {
    await lock.acquire("eod_refresh", "2025-07-14");
    await lock.release("eod_refresh", "2025-07-14");
    expect(await lock.isLocked("eod_refresh", "2025-07-14")).toBe(false);
  });

  it("isLocked returns false for never-acquired", async () => {
    expect(await lock.isLocked("eod_refresh", "2099-01-01")).toBe(false);
  });

  it("release on non-existent key is a no-op", async () => {
    await expect(lock.release("eod_refresh", "2099-01-01")).resolves.toBeUndefined();
  });
});
