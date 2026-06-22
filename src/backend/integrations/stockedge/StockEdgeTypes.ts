export type StockEdgeLayer =
  | "profile"
  | "price"
  | "technicals"
  | "fundamentals"
  | "financial_tables"
  | "ownership"
  | "corporate_actions"
  | "screener_signals"
  | "full_snapshot";

export type StockEdgeStatus =
  | "fresh"
  | "cached"
  | "stale_cached"
  | "disabled"
  | "empty"
  | "error";

export interface StockEdgeConfig {
  enabled: boolean;
  accountId?: string;
  accessSecret?: string;
  baseUrl?: string;
  timeoutMs: number;
  rateLimitPerMinute: number;
  cacheTtlSeconds: Record<StockEdgeLayer, number>;
}

export interface StockEdgeFetchResult<T> {
  ok: boolean;
  status: StockEdgeStatus;
  layer: StockEdgeLayer;
  symbol?: string;
  fetchedAt: string;
  cacheTtlSeconds: number;
  data: T | null;
  internalErrorCode?: string;
}

export interface StockEdgeProfile {
  symbol: string;
  companyName?: string;
  sector?: string;
  industry?: string;
  isin?: string;
  nseCode?: string;
  bseCode?: string;
  marketCapCrore?: number;
}

export interface StockEdgePriceSnapshot {
  symbol: string;
  price?: number;
  previousClose?: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  deliveryPercent?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  asOf?: string;
}

export interface StockEdgeTechnicalSnapshot {
  symbol: string;
  rsi?: number;
  macd?: number;
  macdSignal?: number;
  sma20?: number;
  sma50?: number;
  sma200?: number;
  ema20?: number;
  ema50?: number;
  adx?: number;
  atr?: number;
  oscillatorSummary?: string;
  momentumSummary?: string;
  volumeSummary?: string;
  asOf?: string;
}

export interface StockEdgeFundamentalSnapshot {
  symbol: string;
  peRatio?: number;
  pbRatio?: number;
  roe?: number;
  roce?: number;
  debtToEquity?: number;
  dividendYield?: number;
  operatingMargin?: number;
  netMargin?: number;
  revenueGrowth?: number;
  profitGrowth?: number;
  epsGrowth?: number;
  asOf?: string;
}

export interface StockEdgeFinancialCell {
  period: string;
  value: number | null;
}

export interface StockEdgeFinancialRow {
  rawLabel: string;
  normalizedKey: string;
  cells: StockEdgeFinancialCell[];
}

export interface StockEdgeFinancialTable {
  symbol: string;
  statementType: "quarterly" | "profit_loss" | "balance_sheet" | "cash_flow" | "ratios";
  currency?: string;
  unit?: "crore" | "lakh" | "absolute";
  rows: StockEdgeFinancialRow[];
}

export interface StockEdgeOwnershipSnapshot {
  symbol: string;
  period?: string;
  promoter?: number;
  fii?: number;
  dii?: number;
  publicRetail?: number;
  pledge?: number;
  others?: number;
}

export interface StockEdgeCorporateAction {
  symbol: string;
  type: "dividend" | "split" | "bonus" | "rights" | "board_meeting" | "results" | "announcement" | "other";
  date?: string;
  description: string;
  value?: string;
}

export interface StockEdgeScreenerSignal {
  symbol: string;
  category: "financials" | "ownership" | "peer_comparison" | "valuation" | "momentum" | "risk" | "technical" | "other";
  label: string;
  status: "pass" | "neutral" | "watch" | "fail" | "not_enough_information";
  evidence?: string;
}

export interface StockEdgeCanonicalSnapshot {
  symbol: string;
  profile?: StockEdgeProfile;
  price?: StockEdgePriceSnapshot;
  technicals?: StockEdgeTechnicalSnapshot;
  fundamentals?: StockEdgeFundamentalSnapshot;
  financialTables: StockEdgeFinancialTable[];
  ownership: StockEdgeOwnershipSnapshot[];
  corporateActions: StockEdgeCorporateAction[];
  screenerSignals: StockEdgeScreenerSignal[];
  rawStructuralKeys: string[];
  mappedAt: string;
}
