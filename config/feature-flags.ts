/**
 * Feature Flags Manifest
 *
 * Single source of truth for all feature flags in the codebase.
 * Each flag documents: purpose, env var, default, lifecycle status,
 * and safe deployment path.
 *
 * "Deployed" means the flag is live and active in production.
 * "Shadow" means running in side-by-side / dry-run mode.
 * "Rollout" means gradual enablement behind the flag.
 * "Deprecated" means scheduled for removal once stabilised.
 */

export interface FeatureFlag {
  key: string;
  envVar: string;
  purpose: string;
  default: string;
  status: "deployed" | "shadow" | "rollout" | "deprecated";
  safePath?: string;
}

export const featureFlags: Record<string, FeatureFlag> = {
  // ── F5: Unified Prediction Engine ────────────────────────────
  UNIFIED_PREDICTION_ENGINE_ENABLED: {
    key: "UNIFIED_PREDICTION_ENGINE_ENABLED",
    envVar: "UNIFIED_PREDICTION_ENGINE_ENABLED",
    purpose: "Enable the unified prediction engine (F5) in production",
    default: "false",
    status: "rollout",
    safePath: "Enable shadow mode first, validate parity, then flip to true",
  },
  F5_PREDICTION_FACTORY_DELEGATE: {
    key: "F5_PREDICTION_FACTORY_DELEGATE",
    envVar: "F5_PREDICTION_FACTORY_DELEGATE",
    purpose: "Delegate PredictionFactory calls to unified engine",
    default: "false",
    status: "rollout",
    safePath: "Enable only after UNIFIED_PREDICTION_ENGINE_ENABLED=true is validated",
  },
  F5_SCORE_SNAPSHOT_DELEGATE: {
    key: "F5_SCORE_SNAPSHOT_DELEGATE",
    envVar: "F5_SCORE_SNAPSHOT_DELEGATE",
    purpose: "Delegate score snapshot generation to unified engine",
    default: "false",
    status: "rollout",
    safePath: "Enable only after UNIFIED_PREDICTION_ENGINE_ENABLED=true is validated",
  },
  UNIFIED_PREDICTION_ENGINE_SHADOW_MODE: {
    key: "UNIFIED_PREDICTION_ENGINE_SHADOW_MODE",
    envVar: "UNIFIED_PREDICTION_ENGINE_SHADOW_MODE",
    purpose: "Run unified engine in shadow (log-only, no effect) mode",
    default: "false",
    status: "shadow",
    safePath: "Enable first before flipping UNIFIED_PREDICTION_ENGINE_ENABLED",
  },

  // ── Upstox Sandbox ──────────────────────────────────────────
  UPSTOX_SANDBOX_ENABLED: {
    key: "UPSTOX_SANDBOX_ENABLED",
    envVar: "UPSTOX_SANDBOX_ENABLED",
    purpose: "Route Upstox API calls to sandbox-api.upstox.com",
    default: "false",
    status: "deployed",
    safePath: "Sandbox for testing; never enable in production without UPSTOX_SANDBOX_ACCESS_TOKEN",
  },
  UPSTOX_SANDBOX_MODE: {
    key: "UPSTOX_SANDBOX_MODE",
    envVar: "UPSTOX_SANDBOX_MODE",
    purpose: "Alternative flag (OR'd with UPSTOX_SANDBOX_ENABLED) for sandbox",
    default: "false",
    status: "deprecated",
    safePath: "Use UPSTOX_SANDBOX_ENABLED instead; this is a legacy alias",
  },

  // ── Provider Enables ────────────────────────────────────────
  JUGAD_DATA_ENABLED: {
    key: "JUGAD_DATA_ENABLED",
    envVar: "JUGAD_DATA_ENABLED",
    purpose: "Enable Jugaad Data public NSE provider (no credentials)",
    default: "true",
    status: "deployed",
  },
  NSEPYTHON_ENABLED: {
    key: "NSEPYTHON_ENABLED",
    envVar: "NSEPYTHON_ENABLED",
    purpose: "Enable nsepython public NSE provider (no credentials)",
    default: "true",
    status: "deployed",
  },
  YFINANCE_ENABLED: {
    key: "YFINANCE_ENABLED",
    envVar: "YFINANCE_ENABLED",
    purpose: "Enable yfinance research bridge (blocked from India, 429 risk)",
    default: "true",
    status: "deployed",
    safePath: "May 429 from Indian IPs; disable if rate-limited",
  },
  STOCKEDGE_ENABLED: {
    key: "STOCKEDGE_ENABLED",
    envVar: "STOCKEDGE_ENABLED",
    purpose: "Enable StockEdge premium data integration",
    default: "",
    status: "rollout",
  },
  TRENDLYNE_ENABLED: {
    key: "TRENDLYNE_ENABLED",
    envVar: "TRENDLYNE_ENABLED",
    purpose: "Enable Trendlyne data integration",
    default: "",
    status: "rollout",
  },

  // ── IndianAPI Premium ───────────────────────────────────────
  INDIANAPI_PREMIUM_ENABLED: {
    key: "INDIANAPI_PREMIUM_ENABLED",
    envVar: "INDIANAPI_PREMIUM_ENABLED",
    purpose: "Enable IndianAPI.in premium data provider",
    default: "",
    status: "rollout",
  },
  INDIANAPI_PREMIUM_HISTORY_ENABLED: {
    key: "INDIANAPI_PREMIUM_HISTORY_ENABLED",
    envVar: "INDIANAPI_PREMIUM_HISTORY_ENABLED",
    purpose: "Enable historical data from IndianAPI premium",
    default: "true",
    status: "rollout",
  },

  // ── Infrastructure / Safety ─────────────────────────────────
  ALLOW_SQLITE_FALLBACK: {
    key: "ALLOW_SQLITE_FALLBACK",
    envVar: "ALLOW_SQLITE_FALLBACK",
    purpose: "Allow SQLite fallback when Postgres is unavailable",
    default: "false",
    status: "deployed",
    safePath: "Should remain false in production; only for local dev",
  },
  ALLOW_SQLITE_IN_PRODUCTION: {
    key: "ALLOW_SQLITE_IN_PRODUCTION",
    envVar: "ALLOW_SQLITE_IN_PRODUCTION",
    purpose: "Allow SQLite even when NODE_ENV=production",
    default: "false",
    status: "deployed",
    safePath: "Must remain false in production",
  },
  PROVIDER_BROKER_ENABLED: {
    key: "PROVIDER_BROKER_ENABLED",
    envVar: "PROVIDER_BROKER_ENABLED",
    purpose: "Enable the provider broker (multi-source data aggregation)",
    default: "true",
    status: "deployed",
  },

  // ── Stale / Unused (documented in .env.example but read nowhere) ──
  ENABLE_PREDICTION_FACTORY: {
    key: "ENABLE_PREDICTION_FACTORY",
    envVar: "ENABLE_PREDICTION_FACTORY",
    purpose: "STALE — Enable prediction factory",
    default: "true",
    status: "deprecated",
  },
  ENABLE_DAILY_FEED: {
    key: "ENABLE_DAILY_FEED",
    envVar: "ENABLE_DAILY_FEED",
    purpose: "STALE — Enable daily feed page",
    default: "true",
    status: "deprecated",
  },
  ENABLE_TRUST_CENTRE: {
    key: "ENABLE_TRUST_CENTRE",
    envVar: "ENABLE_TRUST_CENTRE",
    purpose: "STALE — Enable trust centre page",
    default: "true",
    status: "deprecated",
  },
  CONFIRM_UNIFIED_ENGINE_APPLY: {
    key: "CONFIRM_UNIFIED_ENGINE_APPLY",
    envVar: "CONFIRM_UNIFIED_ENGINE_APPLY",
    purpose: "STALE — Confirmation gate for unified engine apply",
    default: "false",
    status: "deprecated",
  },
};
