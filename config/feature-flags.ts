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

  // ── PSE Data Providers ─────────────────────────────────────
  PHISIX_API_ENABLED: {
    key: "PHISIX_API_ENABLED",
    envVar: "PHISIX_API_ENABLED",
    purpose: "Enable phisix-api3 PSE live data feed",
    default: "true",
    status: "deployed",
    safePath: "Primary PSE data source; keep enabled in production",
  },
  PSE_EDGE_API_ENABLED: {
    key: "PSE_EDGE_API_ENABLED",
    envVar: "PSE_EDGE_API_ENABLED",
    purpose: "Enable PSE EDGE official disclosure and financial reports API",
    default: "",
    status: "rollout",
    safePath: "Requires PSE EDGE API credentials",
  },
  COL_FINANCIAL_ENABLED: {
    key: "COL_FINANCIAL_ENABLED",
    envVar: "COL_FINANCIAL_ENABLED",
    purpose: "Enable COL Financial research data integration",
    default: "",
    status: "rollout",
    safePath: "Requires COL Financial API partnership",
  },
  YFINANCE_ENABLED: {
    key: "YFINANCE_ENABLED",
    envVar: "YFINANCE_ENABLED",
    purpose: "Enable yfinance as secondary PSE data fallback",
    default: "true",
    status: "deployed",
    safePath: "Yahoo Finance has limited PSE data; use phisix as primary",
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
