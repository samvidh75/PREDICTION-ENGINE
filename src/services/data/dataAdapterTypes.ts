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
  | "EMPTY_RESPOPSE"
  | "MALFORMED_RESPOPSE"
  | "STALE_RESPOPSE"
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
  exchange?: "PSE" | "UNKNOWN";
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

export interface OwnershipRecord {
  symbol: string;
  asOf: string;
  promoters?: number | null;
  fii?: number | null;
  dii?: number | null;
  mutualFunds?: number | null;
  publicShareholding?: number | null;
  promoterPledge?: number | null;
}

export interface CorporateActionRecord {
  id: string;
  symbol: string;
  actionType: "dividend" | "bonus" | "split" | "rights" | "buyback" | "merger" | "demerger" | "other";
  announcedAt?: string | null;
  exDate?: string | null;
  recordDate?: string | null;
  details?: string | null;
}

export interface DerivativesSnapshotRecord {
  symbol: string;
  asOf: string;
  expiry?: string | null;
  futuresOpenInterest?: number | null;
  futuresOiChange?: number | null;
  putCallRatio?: number | null;
  impliedVolatility?: number | null;
  maxPain?: number | null;
  optionVolume?: number | null;
}

export interface SectorMacroContextRecord {
  symbol?: string;
  sector?: string | null;
  asOf: string;
  sectorMovePct?: number | null;
  indexMovePct?: number | null;
  usdInrMovePct?: number | null;
  crudeMovePct?: number | null;
  bondYieldMoveBps?: number | null;
}

export interface PriceQueryOptions {
  limit?: number;
  start?: string;
  end?: string;
}

export interface NewsQueryOptions {
  limit?: number;
  since?: string;
}

export interface FilingQueryOptions {
  limit?: number;
  since?: string;
}

export interface CorporateActionQueryOptions {
  limit?: number;
  since?: string;
}

export interface CompanyMasterAdapter {
  getCompanyMaster(symbol: string): Promise<AdapterResult<CompanyMasterRecord>>;
}

export interface PriceAdapter {
  getDailyCandles(symbol: string, options?: PriceQueryOptions): Promise<AdapterResult<PriceCandle[]>>;
  getIntradayCandles(
    symbol: string,
    timeframe: Extract<PriceTimeframe, "1m" | "5m" | "15m" | "1h">,
    options?: PriceQueryOptions,
  ): Promise<AdapterResult<PriceCandle[]>>;
}

export interface FinancialsAdapter {
  getFinancialSnapshot(symbol: string): Promise<AdapterResult<FinancialSnapshotRecord>>;
}

export interface NewsEventsAdapter {
  getRecentNewsEvents(symbol: string, options?: NewsQueryOptions): Promise<AdapterResult<NewsEventRecord[]>>;
}

export interface FilingsAdapter {
  getRecentFilings(symbol: string, options?: FilingQueryOptions): Promise<AdapterResult<FilingRecord[]>>;
}

export interface OwnershipAdapter {
  getLatestOwnership(symbol: string): Promise<AdapterResult<OwnershipRecord>>;
}

export interface CorporateActionsAdapter {
  getCorporateActions(symbol: string, options?: CorporateActionQueryOptions): Promise<AdapterResult<CorporateActionRecord[]>>;
}

export interface DerivativesAdapter {
  getDerivativesSnapshot(symbol: string): Promise<AdapterResult<DerivativesSnapshotRecord>>;
}

export interface SectorMacroAdapter {
  getSectorMacroContext(symbol: string): Promise<AdapterResult<SectorMacroContextRecord>>;
}
