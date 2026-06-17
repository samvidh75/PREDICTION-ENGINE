/**
 * Centralized API client for StockStory India frontend.
 *
 * - Resolves base URL for Vercel rewrite (/api/*) and local dev
 * - Request timeout with AbortController
 * - Typed JSON parsing with lightweight validation
 * - Sanitized error class (no raw stack traces to UI)
 * - Consistent empty-data semantics
 * - No secret exposure
 */

// ── Base URL Resolution ──────────────────────────────────────────────

function resolveBaseUrl(): string {
  if (typeof window === "undefined") return "";
  // In production, Vercel rewrites /api/* to the Railway backend.
  // In dev, Vite proxies /api/* to VITE_API_TARGET (default localhost:4001).
  // Both cases use relative /api paths — no absolute URL needed.
  return "";
}

const BASE_URL = resolveBaseUrl();

// ── Timeout Configuration ────────────────────────────────────────────

const DEFAULT_TIMEOUT_MS = 15_000;
const EXTENDED_TIMEOUT_MS = 30_000;

// ── Error Class ──────────────────────────────────────────────────────

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// ── Core Fetch Helper ────────────────────────────────────────────────

interface ApiRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  signal?: AbortSignal;
}

async function apiFetch<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    method = "GET",
    headers = {},
    body,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal: externalSignal,
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // If caller provides an external signal, combine it with our timeout
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...headers,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({})) as Record<string, unknown>;
      const code = (errorBody.code as string) ?? `HTTP_${response.status}`;
      const message =
        (errorBody.message as string) ??
        (errorBody.error as string) ??
        `Request failed with HTTP ${response.status}`;
      throw new ApiError(response.status, code, message, errorBody.details as Record<string, unknown> | undefined);
    }

    const data = await response.json() as T;
    return data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(408, "TIMEOUT", "Request timed out. Please try again.");
    }
    throw new ApiError(0, "NETWORK_ERROR", "Network error. Please check your connection.");
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── Typed Endpoint Helpers ───────────────────────────────────────────

// -- Health & Ops --

export interface OpsHealth {
  status: "ok" | "degraded" | "error";
  timestamp: string;
  metrics: {
    predictions_today: number;
    symbols_covered: number;
    hit_rate: string;
    pipeline_freshness: string;
    scheduler_health: string;
    db_health: string;
    response_ms: number;
    environment: string;
    uptime_seconds: number;
    node_version: string;
  };
}

export interface DataCoverage {
  ok: boolean;
  generatedAt: string;
  database: { status: string; migrationsReady: boolean; error: string | null };
  coverage: {
    symbols: CoverageStats;
    dailyPrices: CoverageStats;
    financialSnapshots: CoverageStats;
    featureSnapshots: CoverageStats;
    factorSnapshots: CoverageStats;
    predictionRegistry: CoverageStats;
  };
  providers: Record<string, string>;
}

export interface CoverageStats {
  count?: number;
  rowCount?: number;
  symbolCount?: number;
  status: string;
  latestUpdatedAt?: string | null;
  latestPriceDate?: string | null;
  latestSnapshotDate?: string | null;
  latestPredictionDate?: string | null;
}

// -- Rankings / Leaderboard --

export interface LeaderboardEntry {
  rank: number;
  symbol: string;
  companyName: string;
  sector: string | null;
  industry: string | null;
  predictionDate: string | null;
  rankingScore: number | null;
  classification: string;
  confidenceScore: number | null;
  confidenceLevel: string | null;
  factors: {
    quality: number | null;
    growth: number | null;
    value: number | null;
    momentum: number | null;
    risk: number | null;
    sector: number | null;
  };
}

export interface LeaderboardResponse {
  ok: true;
  data: LeaderboardEntry[];
}

// -- Prediction Signals --

export interface Signal {
  symbol: string;
  type: string;
  severity: "critical" | "important" | "monitor";
  explanation: string;
  delta?: number | string;
  snapshotDate?: string | null;
  validation?: {
    historicalSuccessRate: number | null;
    sampleSize: number | null;
    avgAlpha: number | null;
  } | null;
}

export interface SignalsResponse {
  signals: Signal[];
  generatedAt: string | null;
  snapshotDate: string | null;
  symbolsAnalyzed: number;
}

// -- Search --

export interface SearchResult {
  symbol: string;
  companyName: string;
  sector?: string;
  exchange?: string;
  score?: number | null;
  rank?: number | null;
}

export interface SearchResponse {
  ok: true;
  data: {
    query: string;
    results: SearchResult[];
  };
}

// -- StockStory --

export interface StockStoryData {
  symbol: string;
  predictionDate: string | null;
  predictionHorizon: number;
  rankingScore: number | null;
  healthScore: number | null;
  classification: string | null;
  confidence: string | null;
  sector: string | null;
  growth: number | null;
  quality: number | null;
  valuation: number | null;
  momentum: number | null;
  risk: number | null;
  narrative: string | null;
  factors: Record<string, unknown> | null;
  engineDetails: Record<string, unknown> | null;
}

// -- Company Financials --

export interface CompanyFinancials {
  ticker: string;
  snapshot_date: string | null;
  pe_ratio: number | null;
  pb_ratio: number | null;
  roe: number | null;
  roa: number | null;
  roic: number | null;
  operating_margin: number | null;
  net_margin: number | null;
  revenue_growth: number | null;
  earnings_growth: number | null;
  debt_to_equity: number | null;
  current_ratio: number | null;
  beta: number | null;
  fcf_yield: number | null;
  ev_ebitda: number | null;
  market_cap: number | null;
  profit_growth: number | null;
  lineage: {
    source_table: string;
    columns_available: string[];
    columns_null: string[];
  };
}

// -- Trust Metrics --

export interface TrustMetricsEnvelope {
  status: "ok" | "partial" | "unavailable" | "empty" | "error" | "demo";
  message: string | null;
  data: {
    alpha: number | null;
    hit_rate: number | null;
    sharpe_ratio: number | null;
    calibration_score: number | null;
    total_predictions: number | null;
    total_outcomes: number | null;
  } | null;
  dataState?: {
    availability?: string;
    asOf?: string | null;
    missingInputs?: string[];
    completenessScore?: number;
  };
}

// -- Market Data --

export interface StockQuote {
  symbol: string;
  exchange: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  updatedAt?: string;
  retrievedAt?: string;
}

export interface CompanyMetadata {
  symbol: string;
  companyName: string;
  sector: string;
  industry: string;
  exchange?: string;
  marketCap?: number;
  currency?: string;
  website?: string;
  isin?: string | null;
  bseCode?: string | null;
  nseSymbol?: string | null;
  verificationStatus?: "VERIFIED" | "PARTIAL" | "INVALID";
  verificationReasons?: string[];
  enrichmentSource?: "provider" | "registry" | "fallback";
}

// -- Watchlists (authenticated) --

export interface Watchlist {
  id: string;
  name: string;
  tickers: string[];
  createdAt?: string;
  updatedAt?: string;
}

// ── API Methods ──────────────────────────────────────────────────────

export const api = {
  // -- Ops --
  getOpsHealth: () => apiFetch<OpsHealth>("/api/ops/health"),
  getDataCoverage: () => apiFetch<DataCoverage>("/api/ops/data-coverage"),

  // -- Rankings --
  getLeaderboard: (limit = 100, horizon = 30) =>
    apiFetch<LeaderboardResponse>(`/api/intelligence/leaderboard?limit=${limit}&horizon=${horizon}`),

  // -- Signals --
  getSignals: (limit = 50) =>
    apiFetch<SignalsResponse>(`/api/predictions/signals?limit=${limit}`),

  // -- Search --
  searchUniversal: (query: string) =>
    apiFetch<SearchResponse>(`/api/search/universal?query=${encodeURIComponent(query)}`),

  // -- StockStory --
  getStockStory: (ticker: string, horizon = 30) =>
    apiFetch<{ ok: true; data: StockStoryData }>(`/api/stockstory/${encodeURIComponent(ticker)}?horizon=${horizon}`),

  // -- Company --
  getCompanyFinancials: (ticker: string) =>
    apiFetch<CompanyFinancials>(`/api/company/${encodeURIComponent(ticker)}/financials`),

  // -- Market Data --
  getQuote: (symbol: string) =>
    apiFetch<StockQuote>(`/api/market-data/quote/${encodeURIComponent(symbol)}`),

  getMetadata: (symbol: string) =>
    apiFetch<CompanyMetadata>(`/api/market-data/metadata/${encodeURIComponent(symbol)}`),

  getCompanyData: (symbol: string) =>
    apiFetch<{ quote: StockQuote; metadata: CompanyMetadata }>(
      `/api/market-data/company/${encodeURIComponent(symbol)}`,
    ),

  // -- Trust --
  getTrustMetrics: () =>
    apiFetch<TrustMetricsEnvelope>("/api/intelligence/trust-metrics"),

  // -- Intelligence Company --
  getCompanyIntelligence: (symbol: string) =>
    apiFetch<{ ok: boolean; status: string; data: Record<string, unknown>; freshness?: string; completeness?: string }>(
      `/api/intelligence/company/${encodeURIComponent(symbol)}`,
    ),

  // -- Predictions Explain --
  getPredictionExplain: (symbol: string, horizon = 30) =>
    apiFetch<{ ok: boolean; data: Record<string, unknown> }>(
      `/api/predictions/explain/${encodeURIComponent(symbol)}?horizon=${horizon}`,
    ),
};

export default api;
