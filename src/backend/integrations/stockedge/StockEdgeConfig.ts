import type { StockEdgeConfig, StockEdgeLayer } from "./StockEdgeTypes";

const DEFAULT_TTLS: Record<StockEdgeLayer, number> = {
  profile: 86_400,
  price: 15,
  technicals: 3_600,
  fundamentals: 86_400,
  financial_tables: 86_400,
  ownership: 86_400,
  corporate_actions: 21_600,
  screener_signals: 21_600,
  full_snapshot: 3_600,
};

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function boolFromEnv(name: string): boolean {
  return ["1", "true", "yes", "on"].includes((process.env[name] ?? "").toLowerCase());
}

export function loadStockEdgeConfig(): StockEdgeConfig {
  return {
    enabled: boolFromEnv("STOCKEDGE_ENABLED"),
    accountId: process.env.STOCKEDGE_ACCOUNT_ID,
    password: process.env.STOCKEDGE_PASSWORD,
    baseUrl: process.env.STOCKEDGE_BASE_URL || "https://web.stockedge.com",
    loginUrl: process.env.STOCKEDGE_LOGIN_URL || process.env.STOCKEDGE_BASE_URL || "https://web.stockedge.com",
    timeoutMs: intFromEnv("STOCKEDGE_TIMEOUT_MS", 15_000),
    rateLimitPerMinute: intFromEnv("STOCKEDGE_RATE_LIMIT_PER_MINUTE", 20),
    sessionTtlSeconds: intFromEnv("STOCKEDGE_SESSION_TTL_SECONDS", 3_600),
    cacheTtlSeconds: {
      ...DEFAULT_TTLS,
      price: intFromEnv("STOCKEDGE_PRICE_TTL_SECONDS", DEFAULT_TTLS.price),
      technicals: intFromEnv("STOCKEDGE_TECHNICALS_TTL_SECONDS", DEFAULT_TTLS.technicals),
      fundamentals: intFromEnv("STOCKEDGE_FUNDAMENTALS_TTL_SECONDS", DEFAULT_TTLS.fundamentals),
      financial_tables: intFromEnv("STOCKEDGE_FINANCIAL_TABLES_TTL_SECONDS", DEFAULT_TTLS.financial_tables),
      ownership: intFromEnv("STOCKEDGE_OWNERSHIP_TTL_SECONDS", DEFAULT_TTLS.ownership),
      corporate_actions: intFromEnv("STOCKEDGE_CORPORATE_ACTIONS_TTL_SECONDS", DEFAULT_TTLS.corporate_actions),
    },
  };
}

export function summarizeStockEdgeConfig(config = loadStockEdgeConfig()): Record<string, boolean | number> {
  return {
    enabled: config.enabled,
    hasAccountId: Boolean(config.accountId),
    hasPassword: Boolean(config.password),
    hasBaseUrl: Boolean(config.baseUrl),
    hasLoginUrl: Boolean(config.loginUrl),
    timeoutMs: config.timeoutMs,
    rateLimitPerMinute: config.rateLimitPerMinute,
    sessionTtlSeconds: config.sessionTtlSeconds,
  };
}
