import { describe, expect, it, beforeEach } from "vitest";
import { StockEdgePlaywrightAuth } from "../StockEdgePlaywrightAuth";
import type { StockEdgeConfig } from "../StockEdgeTypes";

const OLD_ENV = process.env;

beforeEach(() => {
  process.env = { ...OLD_ENV };
  delete process.env.STOCKEDGE_ENABLED;
  delete process.env.STOCKEDGE_ACCOUNT_ID;
  delete process.env.STOCKEDGE_PASSWORD;
});

function makeConfig(overrides: Partial<StockEdgeConfig> = {}): StockEdgeConfig {
  return {
    enabled: true,
    accountId: "test@example.com",
    password: "test-password",
    baseUrl: "https://web.stockedge.com",
    loginUrl: "https://web.stockedge.com",
    timeoutMs: 15000,
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

describe("StockEdgePlaywrightAuth", () => {
  it("constructs with config", () => {
    const pwAuth = new StockEdgePlaywrightAuth(makeConfig());
    expect(pwAuth).toBeInstanceOf(StockEdgePlaywrightAuth);
  });

  it("constructs from env", () => {
    process.env.STOCKEDGE_ENABLED = "true";
    process.env.STOCKEDGE_ACCOUNT_ID = "user@example.com";
    process.env.STOCKEDGE_PASSWORD = "pass";
    const pwAuth = new StockEdgePlaywrightAuth();
    expect(pwAuth).toBeInstanceOf(StockEdgePlaywrightAuth);
  });

  it("login throws when credentials are missing", async () => {
    const pwAuth = new StockEdgePlaywrightAuth(makeConfig({ accountId: undefined, password: undefined }));
    await expect(pwAuth.login()).rejects.toThrow();
  }, 10000);

  it("classifies endpoints by URL and keys", async () => {
    const { classifyPlaywrightLayer } = await import("../StockEdgePlaywrightAuth");
    expect(classifyPlaywrightLayer("/api/stock/profile", ["companyName", "sector"])).toBe("profile");
    expect(classifyPlaywrightLayer("/api/stock/price", ["ltp", "changePercent"])).toBe("price");
    expect(classifyPlaywrightLayer("/api/stock/technical", ["rsi", "macd"])).toBe("technicals");
    expect(classifyPlaywrightLayer("/api/stock/fundamental", ["pe", "roe"])).toBe("fundamentals");
    expect(classifyPlaywrightLayer("/api/stock/shareholding", ["promoter", "fii"])).toBe("ownership");
    expect(classifyPlaywrightLayer("/api/unknown", ["something"])).toBe("unknown");
  });
});

describe("StockEdgeAuth Playwright fallback", () => {
  it("uses http_form strategy first, playwright fallback detection works", async () => {
    process.env.STOCKEDGE_ENABLED = "true";
    process.env.STOCKEDGE_ACCOUNT_ID = "test@example.com";
    process.env.STOCKEDGE_PASSWORD = "test-pass";
    const { StockEdgeAuth } = await import("../StockEdgeAuth");
    const auth = new StockEdgeAuth(makeConfig({ baseUrl: "https://httpbin.org/post", timeoutMs: 2000 }));
    const result = await auth.login();
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe("STOCKEDGE_LOGIN_FAILED");
  }, 15000);
});
