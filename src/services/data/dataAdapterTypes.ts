export type MarketDataDomain =
  | "financial_statements"
  | "price_volume"
  | "news_events"
  | "ownership"
  | "derivatives"
  | "sector_context"
  | "corporate_actions";

export type AdapterErrorCode =
  | "ADAPTER_UNAVAILABLE"
  | "INVALID_SYMBOL"
  | "EMPTY_RESPONSE"
  | "MALFORMED_RESPONSE"
  | "STALE_RESPONSE"
  | "RATE_LIMITED"
  | "UPSTREAM_REJECTED"
  | "UNKNOWN_ADAPTER_ERROR";

export interface AdapterWarning {
  code: AdapterErrorCode;
  message?: string;
}

export type AdapterResult<T> =
  | { ok: true; data: T; warnings: AdapterWarning[]; asOf: string }
  | { ok: false; data: null; warnings: AdapterWarning[]; errorCode: AdapterErrorCode; asOf: string };

export interface CompanyMasterRecord {
  symbol: string;
  exchange?: "NSE" | "BSE" | "UNKNOWN";
  isin?: string | null;
  companyName: string;
  sector?: string | null;
  industry?: string | null;
  listingDate?: string | null;
  marketCapCategory?: "Large Cap" | "Mid Cap" | "Small Cap" | "Micro Cap" | null;
}

export type PriceTimeframe = "1m" | "5m" | "15m" | "1h" | "1d" | "1w" | "1mo";

export interface PriceCandle {
  symbol: string;
  timeframe: PriceTimeframe;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
  vwap?: number | null;
  deliveryVolume?: number | null;
  deliveryPercent?: number | null;
  adjustedClose?: number | null;
}

export interface FinancialSnapshotRecord {
  symbol: string;
  fiscalPeriod?: string | null;
  fiscalYear?: number | null;
  asOf: string;
  revenue?: number | null;
  netProfit?: number | null;
  operatingMargin?: number | null;
  grossMargin?: number | null;
  roe?: number | null;
  roa?: number | null;
  roic?: number | null;
  debtToEquity?: number | null;
  peRatio?: number | null;
  pbRatio?: number | null;
  evEbitda?: number | null;
  dividendYield?: number | null;
  marketCap?: number | null;
  eps?: number | null;
  bookValue?: number | null;
  freeCashFlow?: number | null;
}

export interface NewsEventRecord {
  id: string;
  symbol: string;
  headline: string;
  summary?: string | null;
  publishedAt: string;
  eventType?: "news" | "filing" | "rating" | "result" | "corporate_action" | "macro" | "unknown";
  url?: string | null;
  language?: string | null;
}

export interface FilingRecord {
  id: string;
  symbol: string;
  title: string;
  filingType: string;
  filedAt: string;
  url?: string | null;
  summary?: string | null;
}
