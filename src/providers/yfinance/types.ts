/**
 * TRACK-38A — YFinance Provider Types
 * Shared type definitions for the yfinance ingestion layer.
 */

export interface YahooHistoricalRow {
  Date: string;
  Open: number;
  High: number;
  Low: number;
  Close: number;
  Volume: number;
  Dividends: number;
  'Stock Splits': number;
  'Adj Close'?: number;
}

export interface YahooDividendRow {
  Date: string;
  Dividends: number;
}

export interface YahooSplitRow {
  Date: string;
  'Stock Splits': number;
}

export interface YahooTickerInfo {
  symbol: string;
  shortName?: string;
  longName?: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  sharesOutstanding?: number;
  beta?: number;
  previousClose?: number;
  regularMarketOpen?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  fiftyDayAverage?: number;
  twoHundredDayAverage?: number;
  currency?: string;
  exchange?: string;
  quoteType?: string;
  trailingPE?: number;
  forwardPE?: number;
  priceToBook?: number;
  earningsPerShare?: number;
  dividendRate?: number;
  dividendYield?: number;
  bookValue?: number;
  returnOnEquity?: number;
  revenuePerShare?: number;
  totalCashPerShare?: number;
  totalDebtPerShare?: number;
  debtToEquity?: number;
  recommendationKey?: string;
  numberOfAnalystOpinions?: number;
  targetHighPrice?: number;
  targetLowPrice?: number;
  targetMeanPrice?: number;
}

export interface DailyPriceRecord {
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adj_close: number;
  volume: number;
  dividends: number;
  stock_splits: number;
  source: string;
  quality_score: number;
  ingested_at: string;
}

export interface CorporateAction {
  symbol: string;
  date: string;
  type: 'dividend' | 'split';
  value: number;
  source: string;
}

export interface BackfillRange {
  label: string;
  days: number | 'max';
}

export const BACKFILL_RANGES: BackfillRange[] = [
  { label: '1D', days: 1 },
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
  { label: '5Y', days: 1825 },
  { label: 'Max', days: 'max' },
];

export interface BatchIngestionResult {
  totalSymbols: number;
  successful: number;
  failed: number;
  rowsIngested: number;
  durationMs: number;
  rowsPerSecond: number;
  symbolsPerSecond: number;
  errors: Array<{ symbol: string; error: string }>;
}

export interface QualityCheck {
  symbol: string;
  date: string;
  check: string;
  passed: boolean;
  detail?: string;
}

export interface QualityScore {
  symbol: string;
  overallScore: number;
  checks: QualityCheck[];
  completeness: number;
  consistency: number;
  freshness: number;
}

export interface MarketDataProvider {
  getHistoricalPrices(symbol: string, period?: string, interval?: string): Promise<DailyPriceRecord[]>;
  getLatestPrice(symbol: string): Promise<DailyPriceRecord | null>;
  getCorporateActions(symbol: string): Promise<CorporateAction[]>;
  getMarketMetadata(symbol: string): Promise<YahooTickerInfo | null>;
}
