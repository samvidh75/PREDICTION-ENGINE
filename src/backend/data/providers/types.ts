export interface MarketPriceRecord {
  symbol: string;
  tradingDate: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
  source: string;
  sourceUrl?: string;
  retrievedAt: string;
  providerRecordId?: string;
}

export interface FundamentalSnapshot {
  symbol: string;
  fiscalPeriod: string;
  asOfDate: string;
  revenue: number | null;
  operatingProfit: number | null;
  netProfit: number | null;
  totalAssets: number | null;
  totalDebt: number | null;
  equity: number | null;
  cashFlowFromOperations: number | null;
  eps: number | null;
  peRatio?: number | null;
  pbRatio?: number | null;
  roe?: number | null;
  roa?: number | null;
  debtToEquity?: number | null;
  operatingMargin?: number | null;
  netMargin?: number | null;
  revenueGrowth?: number | null;
  earningsGrowth?: number | null;
  dividendYield?: number | null;
  beta?: number | null;
  marketCap?: number | null;
  freeFloat?: number | null;
  fcfYield?: number | null;
  evEbitda?: number | null;
  roic?: number | null;
  currentRatio?: number | null;
  epsGrowth?: number | null;
  fcfGrowth?: number | null;
  grossMargin?: number | null;
  source: string;
  sourceUrl?: string;
  retrievedAt: string;
  completenessScore: number;
}

export interface DataProvider {
  id: string;
  fetchPrices(symbols: string[], from: string, to: string): Promise<MarketPriceRecord[]>;
  fetchFundamentals(symbols: string[]): Promise<FundamentalSnapshot[]>;
}
