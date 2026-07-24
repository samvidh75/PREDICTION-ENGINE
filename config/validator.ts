/**
 * config/validator.ts
 *
 * Single source of truth for all environment variables.
 * - Defines typed schema with validation rules
 * - Loads dotenv in Node.js context
 * - Throws clear errors for missing required vars
 * - Logs environment on load
 * - Exports a single CONFIG object used throughout the app
 */

import dotenv from "dotenv";

dotenv.config();

// ─── Schema Types ──────────────────────────────────────────────

type EnvEntry<T> = {
  type: "string" | "number" | "boolean" | "enum";
  required?: boolean;
  default?: T;
  values?: readonly T[];
  description?: string;
};

type EnvSchema = Record<string, EnvEntry<any>>;

type InferConfig<T extends EnvSchema> = {
  [K in keyof T]: T[K] extends EnvEntry<infer V>
    ? V
    : never;
};

// ─── Schema Definition ─────────────────────────────────────────

export const envSchema = {
  // ── Node/Server ──
  NODE_ENV: { type: "enum", values: ["development", "production", "test"] as const, default: "development", description: "Runtime environment" },
  PORT: { type: "number", default: 4001, description: "Server port" },
  HOST: { type: "string", default: "0.0.0.0", description: "Server host" },

  // ── Database ──
  DATABASE_URL: { type: "string", description: "PostgreSQL connection string" },
  DB_PATH: { type: "string", default: "./data/stockstory.db", description: "SQLite database path" },
  DB_ADAPTER: { type: "string", default: "auto", values: ["auto", "postgres", "sqlite"] as const, description: "Database adapter selection" },
  ALLOW_SQLITE_FALLBACK: { type: "boolean", default: false, description: "Allow SQLite fallback when Postgres unavailable" },
  ALLOW_SQLITE_IN_PRODUCTION: { type: "boolean", default: false, description: "Allow SQLite even in production" },
  SQLITE_DB_PATH: { type: "string", default: "data/stockstory.db", description: "SQLite database file path" },

  // ── Redis ──
  REDIS_URL: { type: "string", description: "Redis connection string (rediss:// for TLS)" },

  // ── Security ──
  COOKIE_SECRET: { type: "string", description: "Cookie signing secret (required in production)" },

  // ── Firebase Admin SDK ──
  FIREBASE_PROJECT_ID: { type: "string", default: "stockstory-pakistan", description: "Firebase project ID" },
  FIREBASE_CLIENT_EMAIL: { type: "string", description: "Firebase admin client email" },
  FIREBASE_PRIVATE_KEY: { type: "string", description: "Firebase admin private key (with \\n escapes)" },
  FIREBASE_USE_APPLICATION_DEFAULT_CREDENTIALS: { type: "boolean", default: false, description: "Use ADC instead of explicit credentials" },

  // ── Provider Credentials ──
  PSXAPI_KEY: { type: "string", description: "PSX API key" },
  PSXAPI_BASE_URL: { type: "string", default: "https://api.psx.com.pk", description: "PSX API base URL" },
  PSXAPI_TIMEOUT_MS: { type: "number", default: 10_000, description: "PSX API request timeout" },

  // ── PSX API Premium ──
  PSXAPI_PREMIUM_ENABLED: { type: "boolean", default: false, description: "Enable PSX API premium data" },
  PSXAPI_PREMIUM_API_KEY: { type: "string", description: "PSX API premium API key" },
  PSXAPI_PREMIUM_BASE_URL: { type: "string", default: "https://analyst.psx.com.pk", description: "PSX API premium base URL" },
  PSXAPI_PREMIUM_TIMEOUT_MS: { type: "number", default: 15_000, description: "PSX API premium timeout" },
  PSXAPI_PREMIUM_CONCURRENCY: { type: "number", default: 20, description: "PSX API premium concurrency" },
  PSXAPI_PREMIUM_RATE_LIMIT_PER_MINUTE: { type: "number", default: 300, description: "PSX API premium rate limit" },
  PSXAPI_PREMIUM_HISTORY_ENABLED: { type: "boolean", default: true, description: "Enable historical data from PSX API premium" },
  PSXAPI_PREMIUM_SCAN_ENABLED: { type: "boolean", default: false, description: "Enable scan from PSX API premium" },
  PSXAPI_PREMIUM_CACHE_TTL_SECONDS: { type: "number", default: 300, description: "PSX API premium cache TTL" },

  // ── Upstox ──
  UPSTOX_SANDBOX_ENABLED: { type: "boolean", default: false, description: "Route Upstox calls to sandbox" },
  UPSTOX_SANDBOX_MODE: { type: "boolean", default: false, description: "Legacy sandbox alias" },
  UPSTOX_ACCESS_TOKEN: { type: "string", description: "Upstox API access token" },
  UPSTOX_API_KEY: { type: "string", description: "Upstox API key" },
  UPSTOX_CLIENT_SECRET: { type: "string", description: "Upstox client secret" },
  UPSTOX_REDIRECT_URI: { type: "string", description: "Upstox OAuth redirect URI" },
  UPSTOX_NOTIFIER_SECRET: { type: "string", description: "Upstox notifier webhook secret" },

  // ── Provider Enables ──
  JUGAD_DATA_ENABLED: { type: "boolean", default: true, description: "Enable Jugaad Data NSE provider" },
  NSEPYTHON_ENABLED: { type: "boolean", default: true, description: "Enable nsepython NSE provider" },
  PUBLIC_NSE_PROVIDER_TIMEOUT_MS: { type: "number", default: 30_000, description: "Public NSE provider timeout" },
  PUBLIC_PROVIDER_HEALTH_TIMEOUT_MS: { type: "number", default: 6_000, description: "Provider health check timeout" },
  PUBLIC_MARKET_BROKER_ENABLED: { type: "boolean", default: true, description: "Enable public market broker" },
  PUBLIC_MARKET_BROKER_TIMEOUT_MS: { type: "number", default: 30_000, description: "Public market broker timeout" },
  YAHOO_ENABLED: { type: "boolean", default: false, description: "Enable Yahoo Finance (blocked from India)" },
  YFINANCE_ENABLED: { type: "boolean", default: true, description: "Enable yfinance research bridge" },
  YFINANCE_CACHE_PATH: { type: "string", default: "tmp/yfinance-cache.json", description: "Yfinance cache path" },
  YFINANCE_CACHE_SECONDS: { type: "number", default: 3600, description: "Yfinance cache TTL" },
  YFINANCE_BATCH_SIZE: { type: "number", default: 40, description: "Yfinance batch size" },
  STOCKEDGE_ENABLED: { type: "boolean", default: false, description: "Enable StockEdge integration" },
  TRENDLYNE_ENABLED: { type: "boolean", default: false, description: "Enable Trendlyne integration" },
  TRENDLYNE_WIDGET_MODE: { type: "string", default: "disabled", values: ["iframe", "script", "disabled"] as const, description: "Trendlyne widget mode" },

  // ── Public Fundamentals ──
  PUBLIC_FUNDAMENTALS_ENABLED: { type: "boolean", default: false, description: "Enable public fundamentals" },
  CSV_FUNDAMENTALS_PATH: { type: "string", default: "./data/fundamentals", description: "CSV fundamentals import path" },

  // ── Alerting ──
  ALERT_EMAIL_ENABLED: { type: "boolean", default: false, description: "Enable email alerts" },
  SLACK_WEBHOOK_URL: { type: "string", description: "Slack webhook URL for alerts" },
  DISCORD_WEBHOOK_URL: { type: "string", description: "Discord webhook URL for alerts" },
  SMTP_HOST: { type: "string", description: "SMTP host for email alerts" },
  SMTP_PORT: { type: "number", default: 587, description: "SMTP port" },
  SMTP_USER: { type: "string", description: "SMTP user" },
  SMTP_PASSWORD: { type: "string", description: "SMTP password" },
  ALERT_EMAIL_FROM: { type: "string", default: "alerts@stockstory.in", description: "Alert sender email" },
  ALERT_EMAIL_TO: { type: "string", default: "admin@stockstory.in", description: "Alert recipient email" },

  // ── Pipeline ──
  PIPELINE_LOCK_TIMEOUT_MS: { type: "number", default: 3_600_000, description: "Pipeline lock timeout" },
  PIPELINE_MAX_RETRIES: { type: "number", default: 3, description: "Pipeline max retries" },
  DATA_FRESHNESS_STALE_DAYS: { type: "number", default: 2, description: "Data freshness stale threshold" },
  DATA_FRESHNESS_CRITICAL_DAYS: { type: "number", default: 7, description: "Data freshness critical threshold" },

  // ── Rate Limiting ──
  RATE_LIMIT_WINDOW_MS: { type: "number", default: 60_000, description: "Rate limit window" },
  RATE_LIMIT_MAX_REQUESTS: { type: "number", default: 100, description: "Rate limit max requests per window" },
  RATE_LIMIT_BURST_MAX: { type: "number", default: 20, description: "Rate limit burst max" },

  // ── Provider Broker ──
  PROVIDER_BROKER_ENABLED: { type: "boolean", default: true, description: "Enable provider broker" },
  MAX_PROVIDER_CALLS_PER_RUN: { type: "number", default: 500, description: "Max provider calls per run" },

  // ── Feature Flags ──
  UNIFIED_PREDICTION_ENGINE_ENABLED: { type: "boolean", default: false, description: "Enable unified prediction engine (F5)" },
  UNIFIED_PREDICTION_ENGINE_SHADOW_MODE: { type: "boolean", default: false, description: "Run unified engine in shadow mode" },
  F5_SCORE_SNAPSHOT_DELEGATE: { type: "boolean", default: false, description: "Delegate score snapshot to unified engine" },
  F5_PREDICTION_FACTORY_DELEGATE: { type: "boolean", default: false, description: "Delegate prediction factory to unified engine" },

  // ── Frontend (VITE_) ──
  VITE_FIREBASE_API_KEY: { type: "string", description: "Firebase web API key" },
  VITE_FIREBASE_AUTH_DOMAIN: { type: "string", default: "stockstory-pakistan.firebaseapp.com", description: "Firebase auth domain" },
  VITE_FIREBASE_PROJECT_ID: { type: "string", default: "stockstory-pakistan", description: "Firebase project ID" },
  VITE_FIREBASE_STORAGE_BUCKET: { type: "string", default: "stockstory-pakistan.firebasestorage.app", description: "Firebase storage bucket" },
  VITE_FIREBASE_MESSAGING_SENDER_ID: { type: "string", description: "Firebase messaging sender ID" },
  VITE_FIREBASE_APP_ID: { type: "string", description: "Firebase app ID" },
  VITE_SCREENER_ENABLED: { type: "boolean", default: true, description: "Enable screener page" },
} as const satisfies EnvSchema;

type EnvSchemaType = typeof envSchema;
export type Config = InferConfig<EnvSchemaType>;

// ─── Helper: Parse value by type ──────────────────────────────

function parseValue(raw: string | undefined, entry: { type: string; required?: boolean; default?: any; values?: readonly any[] }): any {
  if (raw === undefined || raw === "") {
    if (entry.required) return undefined;
    return entry.default ?? undefined;
  }

  switch (entry.type) {
    case "number": {
      const n = Number(raw);
      if (isNaN(n)) return raw;
      return n;
    }
    case "boolean":
      return raw === "true" || raw === "1";
    case "enum":
      if (entry.values && !entry.values.includes(raw)) {
        console.warn(`[config] WARN: ${raw} is not a valid value for enum; using default "${entry.default}"`);
        return entry.default;
      }
      return raw;
    case "string":
    default:
      return raw;
  }
}

// ─── Load & Validate ──────────────────────────────────────────

let cachedConfig: Config | null = null;

export function loadConfig(source: Record<string, string | undefined> = process.env): Config {
  const config: Record<string, any> = {};
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const [key, entry] of Object.entries(envSchema)) {
    const raw = source[key];
    const entryDef = entry as { type: string; required?: boolean; default?: any; values?: readonly any[]; description?: string };
    const value = parseValue(raw, entryDef);

    if (value === undefined && entryDef.required) {
      errors.push(`MISSING REQUIRED ENV: ${key} — ${entryDef.description ?? "No description"}`);
      continue;
    }

    config[key] = value;

    if (value !== entryDef.default && raw !== undefined) {
      // Warn for non-production if using non-default
    }
  }

  // Determine environment
  const nodeEnv = config.NODE_ENV ?? "development";
  const isProduction = nodeEnv === "production";
  const isDevelopment = nodeEnv === "development";
  const isTest = nodeEnv === "test";

  // Production-specific validation
  if (isProduction) {
    if (!config.COOKIE_SECRET) {
      errors.push("MISSING REQUIRED ENV: COOKIE_SECRET must be set in production");
    }
    if (!config.DATABASE_URL) {
      errors.push("MISSING REQUIRED ENV: DATABASE_URL must be set in production");
    }
  }

  if (errors.length > 0) {
    console.error("[config] FATAL: Environment validation failed:");
    for (const err of errors) {
      console.error(`  ❌ ${err}`);
    }
    if (isProduction) {
      console.error("[config] Exiting due to missing required environment variables.");
      process.exit(1);
    } else {
      warnings.push(...errors);
      errors.length = 0;
    }
  }

  if (warnings.length > 0) {
    for (const w of warnings) {
      console.warn(`  ⚠️  ${w}`);
    }
  }

  console.log(`[config] Loaded: env=${nodeEnv}, mode=${isProduction ? "production" : "development"}`);

  cachedConfig = config as Config;
  return cachedConfig;
}

// ─── Exported CONFIG Singleton ────────────────────────────────

export const CONFIG: Config = /* @__PURE__ */ loadConfig();

// ─── Environment Helpers ──────────────────────────────────────

export function isProduction(): boolean {
  return CONFIG.NODE_ENV === "production";
}

export function isDevelopment(): boolean {
  return CONFIG.NODE_ENV === "development";
}

export function isTest(): boolean {
  return CONFIG.NODE_ENV === "test";
}
