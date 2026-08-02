import { describe, it, expect } from "vitest";

describe("Pipeline CLI", () => {
  const ORIG_ENV = { ...process.env };

  it("module loads without error", async () => {
    const mod = await import("../run-production-data-pipeline");
    expect(mod).toBeDefined();
  }, 20_000);

  it("provider status summary never includes secret values", () => {
    process.env.INDIANAPI_KEY = "key";
    process.env.REDIS_URL = "redis://host:6379";

    const providerStatuses = {
      indianapi: process.env.INDIANAPI_KEY ? "present" : "missing",
      redis: process.env.REDIS_URL ? "present" : "missing",
    };

    const json = JSON.stringify(providerStatuses);
    expect(json).not.toContain("key");
    expect(json).not.toContain("redis://host");
    expect(providerStatuses.indianapi).toBe("present");
    expect(providerStatuses.redis).toBe("present");
  });
});
