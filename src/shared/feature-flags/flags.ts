import type { FeatureFlagDef } from "./types";

/**
 * Central registry of all feature flags.
 * Single source of truth for flag key, env var, default, and purpose.
 */
export const FLAGS = {
  // ── F5: Unified Prediction Engine ──
  unifiedPredictionEngine: {
    key: "unifiedPredictionEngine",
    envVar: "UNIFIED_PREDICTION_ENGINE_ENABLED",
    defaultValue: false,
    description: "Enable the unified prediction engine (F5)",
  } satisfies FeatureFlagDef,

  f5PredictionFactoryDelegate: {
    key: "f5PredictionFactoryDelegate",
    envVar: "F5_PREDICTION_FACTORY_DELEGATE",
    defaultValue: false,
    description: "Delegate PredictionFactory calls to unified engine",
  } satisfies FeatureFlagDef,

  f5ScoreSnapshotDelegate: {
    key: "f5ScoreSnapshotDelegate",
    envVar: "F5_SCORE_SNAPSHOT_DELEGATE",
    defaultValue: false,
    description: "Delegate score snapshot to unified engine",
  } satisfies FeatureFlagDef,

  unifiedPredictionEngineShadow: {
    key: "unifiedPredictionEngineShadow",
    envVar: "UNIFIED_PREDICTION_ENGINE_SHADOW_MODE",
    defaultValue: false,
    description: "Run unified engine in shadow mode (log only)",
  } satisfies FeatureFlagDef,

  // ── Upstox ──
  upstoxSandbox: {
    key: "upstoxSandbox",
    envVar: "UPSTOX_SANDBOX_ENABLED",
    defaultValue: false,
    description: "Route Upstox calls to sandbox API",
  } satisfies FeatureFlagDef,

  upstoxSandboxMode: {
    key: "upstoxSandboxMode",
    envVar: "UPSTOX_SANDBOX_MODE",
    defaultValue: false,
    description: "Legacy sandbox alias",
  } satisfies FeatureFlagDef,

  // ── Providers ──
  jugaadData: {
    key: "jugaadData",
    envVar: "JUGAD_DATA_ENABLED",
    defaultValue: true,
    description: "Enable Jugaad Data public NSE provider",
  } satisfies FeatureFlagDef,

  nsepython: {
    key: "nsepython",
    envVar: "NSEPYTHON_ENABLED",
    defaultValue: true,
    description: "Enable nsepython public NSE provider",
  } satisfies FeatureFlagDef,

  yfinance: {
    key: "yfinance",
    envVar: "YFINANCE_ENABLED",
    defaultValue: true,
    description: "Enable yfinance research bridge",
  } satisfies FeatureFlagDef,

  yahoo: {
    key: "yahoo",
    envVar: "YAHOO_ENABLED",
    defaultValue: false,
    description: "Enable Yahoo Finance (blocked from India)",
  } satisfies FeatureFlagDef,

  stockedge: {
    key: "stockedge",
    envVar: "STOCKEDGE_ENABLED",
    defaultValue: false,
    description: "Enable StockEdge integration",
  } satisfies FeatureFlagDef,

  trendlyne: {
    key: "trendlyne",
    envVar: "TRENDLYNE_ENABLED",
    defaultValue: false,
    description: "Enable Trendlyne integration",
  } satisfies FeatureFlagDef,

  // ── IndianAPI Premium ──
  indianapiPremium: {
    key: "indianapiPremium",
    envVar: "INDIANAPI_PREMIUM_ENABLED",
    defaultValue: false,
    description: "Enable IndianAPI premium data",
  } satisfies FeatureFlagDef,

  indianapiPremiumHistory: {
    key: "indianapiPremiumHistory",
    envVar: "INDIANAPI_PREMIUM_HISTORY_ENABLED",
    defaultValue: true,
    description: "Enable historical data from IndianAPI premium",
  } satisfies FeatureFlagDef,

  indianapiPremiumScan: {
    key: "indianapiPremiumScan",
    envVar: "INDIANAPI_PREMIUM_SCAN_ENABLED",
    defaultValue: false,
    description: "Enable scan from IndianAPI premium",
  } satisfies FeatureFlagDef,

  // ── Infrastructure ──
  allowSqliteFallback: {
    key: "allowSqliteFallback",
    envVar: "ALLOW_SQLITE_FALLBACK",
    defaultValue: false,
    description: "Allow SQLite fallback when Postgres is unavailable",
  } satisfies FeatureFlagDef,

  allowSqliteInProduction: {
    key: "allowSqliteInProduction",
    envVar: "ALLOW_SQLITE_IN_PRODUCTION",
    defaultValue: false,
    description: "Allow SQLite even in production",
  } satisfies FeatureFlagDef,

  providerBroker: {
    key: "providerBroker",
    envVar: "PROVIDER_BROKER_ENABLED",
    defaultValue: true,
    description: "Enable the provider broker",
  } satisfies FeatureFlagDef,

  // ── Public Market ──
  publicMarketBroker: {
    key: "publicMarketBroker",
    envVar: "PUBLIC_MARKET_BROKER_ENABLED",
    defaultValue: true,
    description: "Enable public market broker",
  } satisfies FeatureFlagDef,

  publicFundamentals: {
    key: "publicFundamentals",
    envVar: "PUBLIC_FUNDAMENTALS_ENABLED",
    defaultValue: false,
    description: "Enable public fundamentals",
  } satisfies FeatureFlagDef,

  // ── Screeners ──
  screenerIngestion: {
    key: "screenerIngestion",
    envVar: "SCREENER_INGESTION_ENABLED",
    defaultValue: false,
    description: "Enable Screener.in ingestion",
  } satisfies FeatureFlagDef,

  moneycontrolIngestion: {
    key: "moneycontrolIngestion",
    envVar: "MONEYCONTROL_INGESTION_ENABLED",
    defaultValue: false,
    description: "Enable Moneycontrol ingestion",
  } satisfies FeatureFlagDef,

  // ── Frontend ──
  screenerEnabled: {
    key: "screenerEnabled",
    envVar: "VITE_SCREENER_ENABLED",
    defaultValue: true,
    description: "Enable screener page in frontend",
  } satisfies FeatureFlagDef,

  // ── Experiment / Rollout ──
  unifiedEngineApply: {
    key: "unifiedEngineApply",
    envVar: "CONFIRM_UNIFIED_ENGINE_APPLY",
    defaultValue: false,
    description: "Confirmation gate for unified engine apply",
  } satisfies FeatureFlagDef,
} as const satisfies Record<string, FeatureFlagDef>;
