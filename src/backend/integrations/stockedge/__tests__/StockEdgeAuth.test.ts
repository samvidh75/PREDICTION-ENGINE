import { describe, expect, it, beforeEach } from "vitest";
import { StockEdgeAuth } from "../StockEdgeAuth";
import { stockEdgeSessionStore } from "../StockEdgeSessionStore";
import type { StockEdgeConfig } from "../StockEdgeTypes";

const OLD_ENV = process.env;

beforeEach(() => {
  process.env = { ...OLD_ENV };
  delete process.env.STOCKEDGE_ENABLED;
  delete process.env.STOCKEDGE_ACCOUNT_ID;
  delete process.env.STOCKEDGE_PASSWORD;
  stockEdgeSessionStore.clearSession();
});

function makeConfig(overrides: Partial<StockEdgeConfig> = {}): StockEdgeConfig {
  return {
    enabled: true,
    accountId: "test@example.com",
    password: "test-password",
    baseUrl: "https://web.stockedge.com",
    loginUrl: "https://web.stockedge.com",
    timeoutMs: 5000,
    rateLimitPerMinute: 20,
    sessionTtlSeconds: 3600,
    cacheTtlSeconds: {
      profile: 86400,
      price: 15,
      technicals: 3600,
      fundamentals: 86400,
      financial_tables: 86400,
      ownership: 86400,
      corporate_actions: 21600,
      screener_signals: 21600,
      full_snapshot: 3600,
    },
    ...overrides,
  };
}

describe("StockEdgeAuth", () => {
  it("fails closed when disabled", async () => {
    const auth = new StockEdgeAuth(makeConfig({ enabled: false }));
    const result = await auth.login();
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe("STOCKEDGE_DISABLED");
  });

  it("fails closed when config missing accountId", async () => {
    const auth = new StockEdgeAuth(makeConfig({ accountId: undefined }));
    const result = await auth.login();
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe("STOCKEDGE_AUTH_NOT_CONFIGURED");
  });

  it("fails closed when config missing password", async () => {
    const auth = new StockEdgeAuth(makeConfig({ password: undefined }));
    const result = await auth.login();
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe("STOCKEDGE_AUTH_NOT_CONFIGURED");
  });

  it("configSummary does not include cookie or password values", () => {
    const auth = new StockEdgeAuth(makeConfig());
    const summary = auth.configSummary();
    expect(JSON.stringify(summary)).not.toContain("test-password");
    expect(JSON.stringify(summary)).not.toContain("test@example.com");
  });

  it("configSummary includes sessionTtlSeconds", () => {
    const auth = new StockEdgeAuth(makeConfig());
    const summary = auth.configSummary();
    expect(summary.sessionTtlSeconds).toBe(3600);
  });

  it("ensureSession throws when login fails", async () => {
    const auth = new StockEdgeAuth(makeConfig({ enabled: false }));
    await expect(auth.ensureSession()).rejects.toThrow();
  });
});
