/**
 * Centralized API client for StockStory India frontend.
 *
 * - Resolves base URL for Vercel rewrite (/api/*) and local dev
 * - Request timeout with AbortController
 * - Typed JSON parsing with lightweight validation
 * - Sanitized error class (no raw stack traces to UI)
 * - Consistent empty-data semantics
 * - No secret exposure
 * - Watchlist methods use authenticated fetch (Bearer token)
 */

import { authenticatedFetchJSON } from "../auth/authenticatedFetch";

// ── Base URL Resolution ──────────────────────────────────────────────

function resolveBaseUrl(): string {
  if (typeof window === "undefined") return "";
  // In production (Vercel), the frontend SPA calls Render backend via VITE_API_BASE_URL.
  // In dev, Vite proxies /api/* to VITE_API_TARGET (default localhost:4001).
  const customBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (customBase && customBase.length > 0) return customBase.replace(/\/+$/, "");
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
    let response: Response | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: {
          Accept: "application/json",
          ...headers,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      if (response.status !== 429 || method !== "GET" || attempt > 0) break;
      const retrySeconds = Number(response.headers.get("Retry-After") ?? 1);
      await new Promise<void>((resolve, reject) => {
        const retryTimer = setTimeout(resolve, Math.min(Math.max(retrySeconds, 0.1) * 1_000, 2_000));
        controller.signal.addEventListener("abort", () => { clearTimeout(retryTimer); reject(new DOMException("Aborted", "AbortError")); }, { once: true });
      });
    }

    if (!response) throw new ApiError(0, "NETWORK_ERROR", "No response received.");

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
  providers: Record<string, ProviderStatusEntry>;
}

export interface ProviderDomainEntry {
  healthy?: boolean;
  detail?: string;
}

export interface ProviderStatusEntry {
  lifecycle: string;
  required: boolean;
  status: string;
  message: string;
  domains?: Record<string, ProviderDomainEntry>;
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

interface SignalsApiEnvelope {
  status: string;
  mode: string;
  data: SignalsResponse;
  reason: string;
  message: string | null;
  generatedAt: string;
  dataState: Record<string, unknown>;
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
  healthometer?: {
    overallScore: number | null;
    label: string | null;
    dimensions: Array<{ id: string; label: string; score: number | null; status: string }>;
  } | null;
  classification: string | null;
  confidence: string | { level: string | null; score: number | null } | null;
  confidenceLevel?: string | null;
  confidenceScore?: number | null;
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
  asOf?: string | null;
  source?: "provider" | "daily_prices";
  freshness?: "current" | "delayed" | "unknown";
  delayed?: boolean;
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

export interface WatchlistRow {
  id: string;
  user_id: string;
  name: string;
  tickers: string[];
  is_archived: boolean;
  is_favourite: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// -- Research Response Contracts --

export interface CompanyResearchData {
  symbol: string;
  companyName: string;
  sector: string | null;
  industry: string | null;
  quote: {
    lastPrice: number | null;
    change: number | null;
    changePercent: number | null;
    open: number | null;
    high: number | null;
    low: number | null;
    close: number | null;
    volume: number | null;
    marketCap: number | null;
    week52High: number | null;
    week52Low: number | null;
  } | null;
  fundamentals: {
    peRatio: number | null;
    pbRatio: number | null;
    evEbitda: number | null;
    dividendYield: number | null;
    eps: number | null;
    bookValue: number | null;
    roe: number | null;
    roa: number | null;
    roic: number | null;
    debtToEquity: number | null;
    currentRatio: number | null;
    grossMargin: number | null;
    operatingMargin: number | null;
    netMargin: number | null;
    revenueGrowth: number | null;
    profitGrowth: number | null;
    epsGrowth: number | null;
    sales: number | null;
    netProfit: number | null;
  } | null;
  candles: Array<{ date: string; close: number; high: number | null; low: number | null; volume: number | null }>;
  factorScores: Array<{ name: string; score: number | null; explanation: string | null }>;
  thesis: { status: string; thesis: string | null; bullCase: string | null; bearCase: string | null; topStrengths: string[]; topRisks: string[] } | null;
  risk: { overallRisk: string; keyRiskFlags: string[] } | null;
  history: Array<{ date: string; price: number }>;
  investContext: { conviction: string; score: number | null; thesis: string | null; keyRisks: string[]; keyStrengths: string[]; whatToWatch: string[] } | null;
}

export interface CompanyResearchResponse {
  ok: true;
  data: CompanyResearchData;
}

export interface ScannerResultItem {
  symbol: string;
  companyName: string;
  sector: string | null;
  rank: number;
  conviction: string;
  score: number | null;
  oneLineThesis: string;
  keyReason: string;
  riskMarker: string | null;
}

export interface ScannerResponse {
  ok: true;
  data: ScannerResultItem[];
  preset: string;
  coverage?: { requested: number; evaluated: number; returned: number; complete: boolean };
  message?: string | null;
}

export interface CompareResponse {
  ok: true;
  data: {
    companies: Array<{ symbol: string; companyName: string; scores: Record<string, number | null>; strengths: string[]; risks: string[] }>;
    recommendation: string | null;
    factorComparison: Array<{ factor: string; winner: string | null; explanation: string }>;
    missingDataCaveat: string | null;
  };
}

export interface WatchlistThesisResponse {
  ok: true;
  data: {
    symbol: string;
    companyName: string;
    currentStatus: string;
    previousStatus: string | null;
    conviction: string;
    score: number | null;
    lastUpdated: string | null;
  };
}

export interface PortfolioReviewResponse {
  ok: true;
  data: {
    holdings: Array<{ symbol: string; companyName: string; conviction: string; score: number | null; flags: string[] }>;
    reviewPriority: Array<{ symbol: string; companyName: string; reason: string }>;
    summary: string;
  };
}

export interface AlertItem {
  id: string;
  symbol: string;
  type: string;
  title: string;
  body: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface AlertsResponse {
  ok: true;
  data: AlertItem[];
  symbol: string;
  companyName: string;
}

export interface InvestContextResponse {
  ok: true;
  data: {
    symbol: string;
    companyName: string;
    conviction: string;
    score: number | null;
    thesis: string | null;
    keyRisks: string[];
    keyStrengths: string[];
    whatToWatch: string[];
    missingCriticalData: string[];
  };
}

export interface NewsItemResponse {
  headline: string;
  publisher: string;
  publishedAt: string;
  summary: string;
  whyItMatters: string;
  url: string;
  category: string;
}

export interface NewsResponse {
  symbol: string;
  items: NewsItemResponse[];
  cachedAt: string;
  cacheTtlHours: number;
  error?: string;
}

export interface FinancialSeriesPointResponse {
  period: string;
  fiscalYear: number;
  quarter?: string;
  value: number | null;
  unit: string;
  sourceState: string;
}

export interface FinancialSeriesResponseItem {
  symbol: string;
  metric: string;
  label: string;
  periodType: string;
  points: FinancialSeriesPointResponse[];
  updatedAt: string;
}

export interface FinancialSeriesResponse {
  symbol: string;
  series: FinancialSeriesResponseItem[];
  source: string;
  updatedAt: string;
  cacheTtlHours: number;
}

export interface TrendlyneWidgetResponse {
  available: boolean;
  kind: "technicals" | "checklist" | "ipo";
  symbol: string | null;
  widgetMode: "iframe" | "script" | "disabled" | string;
  widgetUrl: string | null;
  reason: "available" | "not_configured" | "unavailable" | string;
  updatedAt: string;
}

export interface TrendlyneStatusResponse {
  available: boolean;
  widgetMode: string;
  reason: string;
  widgets: Array<{ kind: "technicals" | "checklist" | "ipo"; needsSymbol: boolean }>;
  updatedAt: string;
}

// ── Data Source Tags ─────────────────────────────────────────────────

export type DataSourceTag =
  | 'indianapi_price'
  | 'yahoo_price'
  | 'indianapi_financials'
  | 'screener'
  | 'upstox'
  | 'computed'
  | 'unavailable';

// ── Priority rules (documented) ──────────────────────────────────────
// PRICE fields:           Provider A (indianapi) > Provider B (yahoo)
// VALUATION ratios:       Provider C (indianapi_financials) > Provider D (screener) > null
// QUALITY/GROWTH/STABLE:  Provider D (screener) > Provider E (upstox) > null
// TECHNICALS:             always computed from Yahoo historical, never from providers

// ── Historical Point (for price.getHistory) ──────────────────────────

export interface HistoricalPoint {
  date: string;
  close: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
}

// ── Financial Snapshot (for fundamentals.get) ────────────────────────

export interface FinancialSnapshot {
  symbol: string;
  peRatio: number | null;
  pbRatio: number | null;
  eps: number | null;
  dividendYield: number | null;
  roe: number | null;
  roa: number | null;
  roic: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  revenueGrowth: number | null;
  profitGrowth: number | null;
  epsGrowth: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  evEbitda: number | null;
  fcfYield: number | null;
  beta: number | null;
  marketCap: number | null;
  source: DataSourceTag;
  fetchedAt: string;
  // Source tags for individual fields
  peRatio_source?: DataSourceTag;
  roe_source?: DataSourceTag;
  debtToEquity_source?: DataSourceTag;
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
    apiFetch<SignalsApiEnvelope>(`/api/predictions/signals?limit=${limit}`)
      .then((envelope) => envelope.data),

  // -- Search --
  searchUniversal: (query: string) =>
    apiFetch<SearchResponse>(`/api/search/universal?query=${encodeURIComponent(query)}`),

  // -- StockStory --
  getStockStory: (ticker: string, horizon = 30, options?: ApiRequestOptions) =>
    apiFetch<{ ok: true; data: StockStoryData }>(
      `/api/stockstory/${encodeURIComponent(ticker)}?horizon=${horizon}`,
      options,
    ),

  // -- Company --
  getCompanyFinancials: (ticker: string, options?: ApiRequestOptions) =>
    apiFetch<CompanyFinancials>(`/api/company/${encodeURIComponent(ticker)}/financials`, options),

  // -- Market Data --
  getQuote: (symbol: string) =>
    apiFetch<StockQuote>(`/api/market-data/quote/${encodeURIComponent(symbol)}`),

  getMetadata: (symbol: string, options?: ApiRequestOptions) =>
    apiFetch<CompanyMetadata>(`/api/market-data/metadata/${encodeURIComponent(symbol)}`, options),

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

  getInsight: (symbol: string) =>
    apiFetch<{ ok: boolean; data: Record<string, unknown> }>(
      `/api/intelligence/insight/${encodeURIComponent(symbol)}`,
    ),

  // -- Predictions Explain --
  getPredictionExplain: (symbol: string, horizon = 30) =>
    apiFetch<{ ok: boolean; data: Record<string, unknown> }>(
      `/api/predictions/explain/${encodeURIComponent(symbol)}?horizon=${horizon}`,
    ),

  // -- Research Contracts --
  getCompanyResearch: (symbol: string, options?: ApiRequestOptions) =>
    apiFetch<CompanyResearchResponse>(
      `/api/research/company/${encodeURIComponent(symbol)}`, options,
    ),

  getScanner: (preset = "Quality compounders", limit = 50, symbols?: string) =>
    apiFetch<ScannerResponse>(
      `/api/research/scanner?preset=${encodeURIComponent(preset)}&limit=${limit}${symbols ? `&symbols=${encodeURIComponent(symbols)}` : ""}`,
    ),

  compareCompanies: (symbols: string[]) =>
    apiFetch<CompareResponse>("/api/research/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbols }),
    }),

  getWatchlistThesis: (symbol: string) =>
    apiFetch<WatchlistThesisResponse>(
      `/api/research/watchlist/${encodeURIComponent(symbol)}/thesis`,
    ),

  monitorPortfolio: (holdings: Array<{ symbol: string; companyName?: string }>) =>
    apiFetch<PortfolioReviewResponse>("/api/research/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ holdings }),
    }),

  getAlerts: (symbol: string) =>
    apiFetch<AlertsResponse>(
      `/api/research/alerts/${encodeURIComponent(symbol)}`,
    ),

  getInvestContext: (symbol: string, options?: ApiRequestOptions) =>
    apiFetch<InvestContextResponse>(
      `/api/research/invest/${encodeURIComponent(symbol)}`, options,
    ),

  getNews: (symbol: string, options?: ApiRequestOptions) =>
    apiFetch<NewsResponse>(
      `/api/news/${encodeURIComponent(symbol)}`, options,
    ),

  getFinancialSeries: (symbol: string, options?: ApiRequestOptions) =>
    apiFetch<FinancialSeriesResponse>(
      `/api/financial-series/${encodeURIComponent(symbol)}`, options,
    ),

  getTrendlyneStatus: (options?: ApiRequestOptions) =>
    apiFetch<TrendlyneStatusResponse>("/api/integrations/trendlyne/status", options),

  getTrendlyneWidget: (kind: "technicals" | "checklist" | "ipo", symbol: string, options?: ApiRequestOptions) =>
    apiFetch<TrendlyneWidgetResponse>(`/api/integrations/trendlyne/widget/${encodeURIComponent(kind)}/${encodeURIComponent(symbol)}`, options),

  // -- Watchlists (authenticated) --
  getWatchlists: () =>
    authenticatedFetchJSON<WatchlistRow[]>("/api/watchlists"),

  createWatchlist: (name: string) =>
    authenticatedFetchJSON<WatchlistRow>("/api/watchlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }),

  updateWatchlist: (id: string, name: string, tickers: string[]) =>
    authenticatedFetchJSON<WatchlistRow>(`/api/watchlists/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, tickers }),
    }),

  deleteWatchlist: (id: string) =>
    authenticatedFetchJSON<{ success: boolean }>(`/api/watchlists/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  addWatchlistTicker: (id: string, ticker: string) =>
    authenticatedFetchJSON<WatchlistRow>(`/api/watchlists/${encodeURIComponent(id)}/tickers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker }),
    }),

  removeWatchlistTicker: (id: string, ticker: string) =>
    authenticatedFetchJSON<WatchlistRow>(
      `/api/watchlists/${encodeURIComponent(id)}/tickers/${encodeURIComponent(ticker)}`,
      { method: "DELETE" },
    ),

  getIntelligenceSnapshot: (symbol: string) =>
    apiFetch<{ ok: boolean; data: unknown }>(`/api/research/snapshot/${encodeURIComponent(symbol)}`),

  getIntelligenceDashboard: () =>
    apiFetch<{ ok: boolean; data: unknown }>("/api/intelligence/dashboard"),

  getSuperScans: () =>
    apiFetch<{ ok: boolean; data: unknown[] }>("/api/scans/super"),

  getSuperScan: (scanKey: string) =>
    apiFetch<{ ok: boolean; data: unknown[] }>(`/api/scans/super/${encodeURIComponent(scanKey)}`),

  getIntelligenceIngestionStatus: () =>
    apiFetch<{ ok: boolean; data: unknown }>("/api/ops/ingestion-status"),

  // ── Namespaced method groups (clean API surface) ──────────────────────────

  price: {
    /** Live quote. Uses Provider A (IndianAPI) with Provider B (Yahoo) fallback on backend. */
    getQuote: (symbol: string) =>
      apiFetch<StockQuote>(`/api/market-data/quote/${encodeURIComponent(symbol)}`),

    /** Historical OHLCV. Uses Provider B (Yahoo) on backend. range: 1D|5D|1M|3M|6M|1Y|2Y|3Y|5Y */
    getHistory: (symbol: string, range = '3M') =>
      apiFetch<HistoricalPoint[]>(`/api/market-data/history/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}`),

    /** Company metadata (name, sector, exchange). */
    getMeta: (symbol: string) =>
      apiFetch<CompanyMetadata>(`/api/market-data/metadata/${encodeURIComponent(symbol)}`),
  },

  fundamentals: {
    /**
     * Merged fundamentals for a symbol.
     * Valuation (PE/PB/EPS): Provider C (IndianAPI financials) wins.
     * Quality/Growth/Stability (ROE/D-E/margins): Provider D (Screener) wins.
     */
    get: (symbol: string) =>
      apiFetch<FinancialSnapshot>(`/api/company/${encodeURIComponent(symbol)}/financials`),
  },

  research: {
    /** Full company research bundle: quote + fundamentals + candles + factor scores. */
    getStory: (symbol: string) =>
      apiFetch<CompanyResearchResponse>(`/api/research/company/${encodeURIComponent(symbol)}`),

    /** Scanner with a named preset. */
    scan: (preset = 'Quality compounders', limit = 50, symbols?: string) =>
      apiFetch<ScannerResponse>(
        `/api/research/scanner?preset=${encodeURIComponent(preset)}&limit=${limit}${symbols ? `&symbols=${encodeURIComponent(symbols)}` : ''}`,
      ),
  },

  search: {
    /** Universal symbol search. */
    query: (q: string) =>
      apiFetch<SearchResponse>(`/api/search/universal?query=${encodeURIComponent(q)}`),
  },
};

export default api;
