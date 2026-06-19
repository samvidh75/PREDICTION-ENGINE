export interface NormalizedQuote {
  symbol: string;
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
  timestamp: string;
  sourceSuccess: boolean;
  providerCount: number;
}

export interface NormalizedPriceHistory {
  symbol: string;
  candles: NormalizedCandle[];
  earliestDate: string | null;
  latestDate: string | null;
  dataPoints: number;
}

export interface NormalizedCandle {
  date: string;
  close: number;
  high: number | null;
  low: number | null;
  open: number | null;
  volume: number | null;
}

export interface NormalizedFundamentals {
  symbol: string;
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
  operatingProfit: number | null;
  totalAssets: number | null;
  totalDebt: number | null;
  equity: number | null;
  cashFlow: number | null;
  freeCashFlow: number | null;
  timestamp: string;
  sourceSuccess: boolean;
}

export interface NormalizationResult<T> {
  data: T | null;
  error: string | null;
  normalizedAt: string;
  inputValid: boolean;
}

export interface ProviderSource {
  name: string;
  success: boolean;
  latencyMs: number;
  error: string | null;
}
