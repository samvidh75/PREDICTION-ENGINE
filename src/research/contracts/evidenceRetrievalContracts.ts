// ─────────────────────────────────────────────────────────────────────────────
// Phase 19D-3 — Evidence Retrieval Contracts
//
// Defines the input/output contracts for each source-specific evidence
// adapter. Every adapter takes standardised options and returns its own
// typed result so the Phase-5 orchestrator can combine them into an
// EventEvidencePack.
//
// All adapters use ONLY existing deterministic data — no new scraping,
// no fake data, no LLM calls.
// ─────────────────────────────────────────────────────────────────────────────

/* ── Shared retrieval options ───────────────────────────────────── */

export interface RetrievalOptions {
  symbol: string;
  /** Maximum items per source type (default 10). */
  maxPerSource?: number;
  /** How far back to look for events, in days (default 90). */
  lookbackDays?: number;
}

/* ── News evidence ──────────────────────────────────────────────── */

export interface RetrievedNewsItem {
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  url?: string;
}

export interface RetrieveNewsResult {
  symbol: string;
  items: RetrievedNewsItem[];
  source: 'MarketDataGateway' | 'NewsService' | 'None';
}

/* ── Filing / regulatory evidence ───────────────────────────────── */

export interface RetrievedFilingItem {
  label: string;
  detail: string;
  date: string;
  filingType: string;
}

export interface RetrieveFilingResult {
  symbol: string;
  items: RetrievedFilingItem[];
  source: 'CompanyMetadata' | 'FinancialSnapshot' | 'None';
}

/* ── Corporate-action evidence ──────────────────────────────────── */

export interface RetrievedCorporateActionItem {
  label: string;
  detail: string;
  date: string;
  actionType: 'dividend' | 'bonus' | 'stock_split' | 'buyback' | 'other';
}

export interface RetrieveCorporateActionResult {
  symbol: string;
  items: RetrievedCorporateActionItem[];
  source: 'NewsHeadline' | 'None';
}

/* ── Result / earnings evidence ─────────────────────────────────── */

export interface RetrievedResultItem {
  period: string;
  revenue: number | null;
  netProfit: number | null;
  eps: number | null;
  revenueGrowthYoy: number | null;
  profitGrowthYoy: number | null;
  filingDate: string;
}

export interface RetrieveResultEventResult {
  symbol: string;
  items: RetrievedResultItem[];
  source: 'FinancialSnapshot' | 'None';
}

/* ── Alert evidence ─────────────────────────────────────────────── */

export interface RetrievedAlertItem {
  id: string;
  type: string;
  title: string;
  body: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface RetrieveAlertResult {
  symbol: string;
  items: RetrievedAlertItem[];
  source: 'AlertStore' | 'None';
}

/* ── Aggregate result ───────────────────────────────────────────── */

export interface EvidenceRetrievalAggregate {
  symbol: string;
  news: RetrieveNewsResult;
  filings: RetrieveFilingResult;
  corporateActions: RetrieveCorporateActionResult;
  resultEvents: RetrieveResultEventResult;
  alerts: RetrieveAlertResult;
  retrievedAt: number;
  /** Total items across all sources */
  totalItems: number;
}
