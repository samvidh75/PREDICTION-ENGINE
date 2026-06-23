import { describe, expect, it, beforeEach } from "vitest";
import { summarizeStockEdgeConfig } from "../StockEdgeConfig";

const OLD_ENV = process.env;

beforeEach(() => {
  process.env = { ...OLD_ENV };
  delete process.env.STOCKEDGE_ENABLED;
  delete process.env.STOCKEDGE_ACCOUNT_ID;
  delete process.env.STOCKEDGE_PASSWORD;
  delete process.env.STOCKEDGE_ACCESS_TOKEN;
  delete process.env.STOCKEDGE_BASE_URL;
  delete process.env.STOCKEDGE_LOGIN_URL;
});

describe("StockEdgeConfig", () => {
  it("reports disabled by default", () => {
    const summary = summarizeStockEdgeConfig();
    expect(summary.enabled).toBe(false);
  });

  it("reports enabled when env set", () => {
    process.env.STOCKEDGE_ENABLED = "true";
    const summary = summarizeStockEdgeConfig();
    expect(summary.enabled).toBe(true);
  });

  it("detects accountId from env", () => {
    process.env.STOCKEDGE_ACCOUNT_ID = "user@example.com";
    const summary = summarizeStockEdgeConfig();
    expect(summary.hasAccountId).toBe(true);
  });

  it("detects password from env", () => {
    process.env.STOCKEDGE_PASSWORD = "test-pass";
    const summary = summarizeStockEdgeConfig();
    expect(summary.hasPassword).toBe(true);
  });

  it("does not require access token", () => {
    const summary = summarizeStockEdgeConfig();
    expect("hasAccessToken" in summary).toBe(false);
  });

  it("summary does not expose secret values", () => {
    process.env.STOCKEDGE_ACCOUNT_ID = "user@example.com";
    process.env.STOCKEDGE_PASSWORD = "super-secret-value";
    const summary = summarizeStockEdgeConfig();
    expect(JSON.stringify(summary)).not.toContain("super-secret-value");
    expect(JSON.stringify(summary)).not.toContain("user@example.com");
  });

  it("detects loginUrl from env", () => {
    process.env.STOCKEDGE_LOGIN_URL = "https://example.com/login";
    const summary = summarizeStockEdgeConfig();
    expect(summary.hasLoginUrl).toBe(true);
  });

  it("reports hasBaseUrl correctly", () => {
    process.env.STOCKEDGE_BASE_URL = "https://web.stockedge.com";
    const summary = summarizeStockEdgeConfig();
    expect(summary.hasBaseUrl).toBe(true);
  });

  it("reports sessionTtlSeconds", () => {
    process.env.STOCKEDGE_SESSION_TTL_SECONDS = "7200";
    const summary = summarizeStockEdgeConfig();
    expect(summary.sessionTtlSeconds).toBe(7200);
  });
});
