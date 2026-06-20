export type LayerKind = "price" | "profile" | "fundamentals" | "financials" | "shareholding" | "corporate_actions" | "historical";

export type FetchStatus = "fresh" | "cached" | "stale_cached" | "empty" | "error";

export interface IndianApiFetchResult<T> {
  ok: boolean;
  data: T | null;
  status: FetchStatus;
  fetchedAt: string;
  cacheTtlSeconds: number;
}

export interface MarketLivePrice {
  symbol: string;
  price: number | null;
  previousClose: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  avgVolume: number | null;
  week52High: number | null;
  week52Low: number | null;
  marketCap: number | null;
  tradedValue: number | null;
  lastTradedAt: string | null;
  exchange: string | null;
  currency: string;
  halted: boolean;
  delisted: boolean;
  dataState: string;
}

export interface CompanyProfileOverview {
  symbol: string;
  companyName: string;
  shortName: string | null;
  nseTicker: string | null;
  bseCode: string | null;
  isin: string | null;
  sector: string | null;
  industry: string | null;
  description: string | null;
  website: string | null;
  marketCap: number | null;
  listingDate: string | null;
  faceValue: number | null;
  exchange: string | null;
  dataState: string;
}

export interface FundamentalSnapshot {
  symbol: string;
  peRatio: number | null;
  pbRatio: number | null;
  roce: number | null;
  roe: number | null;
  debtToEquity: number | null;
  dividendYield: number | null;
  eps: number | null;
  bookValue: number | null;
  salesGrowth: number | null;
  profitGrowth: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  currentRatio: number | null;
  interestCoverage: number | null;
  dataState: string;
}

export interface FinancialStatementRow {
  label: string;
  values: (number | null)[];
  unit: string;
  key: string;
}

export interface FinancialStatementTable {
  symbol: string;
  periodType: "quarterly" | "annual" | "balance_sheet" | "cash_flow";
  periods: string[];
  rows: FinancialStatementRow[];
  currency: string;
  dataState: string;
}

export interface ShareholdingSnapshot {
  symbol: string;
  period: string;
  promoter: number | null;
  fii: number | null;
  dii: number | null;
  public_: number | null;
  others: number | null;
  totalHeld: number | null;
  dataState: string;
}

export interface ShareholdingTrend {
  symbol: string;
  snapshots: ShareholdingSnapshot[];
  dataState: string;
}

export interface CorporateAction {
  symbol: string;
  type: "dividend" | "split" | "bonus" | "rights" | "other";
  exDate: string | null;
  recordDate: string | null;
  description: string | null;
  value: number | null;
  dataState: string;
}

export interface HistoricalPricePoint {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}

export interface HistoricalPriceSeries {
  symbol: string;
  range: string;
  points: HistoricalPricePoint[];
  dataState: string;
}

export interface UnifiedIndianStockSnapshot {
  symbol: string;
  price: MarketLivePrice | null;
  profile: CompanyProfileOverview | null;
  fundamentals: FundamentalSnapshot | null;
  shareholding: ShareholdingTrend | null;
  corporateActions: CorporateAction[];
  historical: HistoricalPriceSeries | null;
  fetchedAt: string;
  dataState: string;
}
