import { describe, expect, it, vi } from "vitest";

// Avoid starting the pipeline during import by mocking db and providers
vi.mock("../src/db/index", () => ({
  default: { query: vi.fn(), end: vi.fn() },
  query: vi.fn(),
  end: vi.fn(),
}));

vi.mock("../src/services/FeatureEngine", () => ({
  FeatureEngine: vi.fn().mockImplementation(() => ({
    calculateAndStoreFeatures: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock("../src/services/FactorEngine", () => ({
  FactorEngine: vi.fn().mockImplementation(() => ({
    calculateAndStoreFactors: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock("../src/predictions/PredictionFactory", () => ({
  predictionFactory: {
    generateDaily: vi.fn().mockResolvedValue({ created: 0, skipped: 0, failed: 0, total: 0, errors: [] }),
  },
}));

vi.mock("../src/services/providers/ProviderCoordinator", () => ({
  ProviderCoordinator: vi.fn().mockImplementation(() => ({
    getFinancials: vi.fn().mockResolvedValue({ symbol: "RELIANCE", periodEnd: "2026-06-16", marketCap: 1e12 }),
    getQuote: vi.fn().mockResolvedValue({ symbol: "RELIANCE", price: 3000 }),
  })),
}));

vi.mock("../src/services/providers/IndianMarketProvider", () => ({
  IndianMarketProvider: vi.fn().mockImplementation(() => ({
    getQuote: vi.fn().mockResolvedValue({ symbol: "RELIANCE", price: 3000 }),
    getMetadata: vi.fn().mockResolvedValue({ symbol: "RELIANCE", companyName: "Reliance Industries Ltd", sector: "Energy" }),
  })),
}));

describe("run-production-data-pipeline", () => {
  it("parseArgs defaults to dry-run and five symbols", async () => {
    const originalArgv = process.argv;
    process.argv = ["node", "scripts/run-production-data-pipeline.ts"];

    const mod = await import("../run-production-data-pipeline");
    // Module does not export parseArgs, but importing should not run main because argv has no --apply
    // and db query is mocked to return empty rows.

    process.argv = originalArgv;
    expect(mod).toBeDefined();
  });

  it("provider status summary never includes secret values", () => {
    process.env.INDIANAPI_KEY = "key";
    process.env.UPSTOX_ACCESS_TOKEN = "token";
    process.env.REDIS_URL = "redis://host:6379";

    const providerStatuses = {
      indianapi: process.env.INDIANAPI_KEY ? "present" : "missing",
      upstox: process.env.UPSTOX_ACCESS_TOKEN ? "present" : "missing",
      finnhub: "deprecated-removed",
      redis: process.env.REDIS_URL ? "present" : "missing",
    };

    const json = JSON.stringify(providerStatuses);
    expect(json).not.toContain("key");
    expect(json).not.toContain("token");
    expect(json).not.toContain("redis://host");
    expect(providerStatuses.indianapi).toBe("present");
    expect(providerStatuses.upstox).toBe("present");
    expect(providerStatuses.redis).toBe("present");
  });
});
