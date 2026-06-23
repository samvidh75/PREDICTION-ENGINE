export type TrendlyneWidgetMode = "iframe" | "script" | "disabled";

export interface TrendlyneConfig {
  enabled: boolean;
  baseUrl: string;
  widgetMode: TrendlyneWidgetMode;
  embedAllowed: boolean;
  cacheTtlSeconds: number;
  apiKey?: string;
  invalidConfigReason?: string;
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

function normalizeWidgetMode(raw: string | undefined): { mode: TrendlyneWidgetMode; invalidConfigReason?: string } {
  if (!raw) return { mode: "disabled" };
  const value = raw.trim().toLowerCase();
  if (value === "iframe" || value === "script" || value === "disabled") return { mode: value };
  return { mode: "disabled", invalidConfigReason: "TRENDLYNE_INVALID_WIDGET_MODE" };
}

function normalizeBaseUrl(raw: string | undefined): { baseUrl: string; invalidConfigReason?: string } {
  const fallback = "https://trendlyne.com";
  const value = (raw || fallback).trim();
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !(url.hostname === "trendlyne.com" || url.hostname.endsWith(".trendlyne.com"))) {
      return { baseUrl: fallback, invalidConfigReason: "TRENDLYNE_INVALID_BASE_URL" };
    }
    return { baseUrl: `${url.protocol}//${url.hostname}` };
  } catch {
    return { baseUrl: fallback, invalidConfigReason: "TRENDLYNE_INVALID_BASE_URL" };
  }
}

export function loadTrendlyneConfig(): TrendlyneConfig {
  const mode = normalizeWidgetMode(process.env.TRENDLYNE_WIDGET_MODE);
  const base = normalizeBaseUrl(process.env.TRENDLYNE_BASE_URL);
  const invalidConfigReason = mode.invalidConfigReason ?? base.invalidConfigReason;

  return {
    enabled: boolFromEnv("TRENDLYNE_ENABLED"),
    baseUrl: base.baseUrl,
    widgetMode: invalidConfigReason ? "disabled" : mode.mode,
    embedAllowed: boolFromEnv("TRENDLYNE_EMBED_ALLOWED"),
    cacheTtlSeconds: intFromEnv("TRENDLYNE_CACHE_TTL_SECONDS", 43_200),
    apiKey: process.env.TRENDLYNE_API_KEY,
    invalidConfigReason,
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
    invalidConfig: Boolean(config.invalidConfigReason),
    status: config.invalidConfigReason ?? (config.enabled ? "configured" : "disabled"),
  };
}
