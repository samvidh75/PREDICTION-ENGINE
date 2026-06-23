export interface TrendlyneConfig {
  enabled: boolean;
  baseUrl: string;
  widgetMode: "iframe" | "script" | "disabled";
  embedAllowed: boolean;
  cacheTtlSeconds: number;
  apiKey?: string;
}

function boolFromEnv(name: string): boolean {
  return ["1", "true", "yes", "on"].includes((process.env[name] ?? "").toLowerCase());
}

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function loadTrendlyneConfig(): TrendlyneConfig {
  return {
    enabled: boolFromEnv("TRENDLYNE_ENABLED"),
    baseUrl: process.env.TRENDLYNE_BASE_URL || "https://trendlyne.com",
    widgetMode: (process.env.TRENDLYNE_WIDGET_MODE as "iframe" | "script" | "disabled") || "script",
    embedAllowed: boolFromEnv("TRENDLYNE_EMBED_ALLOWED"),
    cacheTtlSeconds: intFromEnv("TRENDLYNE_CACHE_TTL_SECONDS", 3600),
    apiKey: process.env.TRENDLYNE_API_KEY,
  };
}

export function summarizeTrendlyneConfig(config = loadTrendlyneConfig()): Record<string, boolean | number | string> {
  return {
    enabled: config.enabled,
    hasBaseUrl: Boolean(config.baseUrl),
    hasApiKey: Boolean(config.apiKey),
    widgetMode: config.widgetMode,
    embedAllowed: config.embedAllowed,
    cacheTtlSeconds: config.cacheTtlSeconds,
  };
}
