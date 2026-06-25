export interface PricePoint {
  date: number;
  close: number;
  high: number;
  low: number;
  volume?: number;
}

export interface HealthBreakdown {
  profitability: number | null;
  valuation: number | null;
  growth: number | null;
  stability: number | null;
  momentum: number | null;
}

export interface MetricItem {
  label: string;
  value: number | null;
  unit?: string;
  change?: number | null;
}

export interface MetricsGroup {
  label: string;
  metrics: MetricItem[];
}

export interface FundamentalsData {
  peRatio: number | null;
  pbRatio: number | null;
  evEbitda: number | null;
  marketCap: number | null;
  eps: number | null;
  bookValue: number | null;
  dividendYield: number | null;
  roe: number | null;
  roa: number | null;
  roic: number | null;
  debtToEquity: number | null;
  revenueGrowth: number | null;
  profitGrowth: number | null;
  operatingMargin: number | null;
  freeCashFlow: number | null;
  fcfYield: number | null;
}

export interface TechnicalData {
  rsi: number | null;
  macd: number | null;
  atr: number | null;
  adx: number | null;
  momentum: number | null;
  volatility: number | null;
  weekHigh52: number | null;
  weekLow52: number | null;
  volume: number | null;
  beta: number | null;
}

export interface CompanyProfile {
  description: string;
  businessSegments: string[];
  majorProducts: string[];
  ceo: string | null;
  foundedYear: number | null;
  headquarters: string | null;
  registeredOffice: string | null;
  exchange: string;
  website: string | null;
  isin: string | null;
  marketCapCategory: string | null;
  employeeCount: number | null;
  auditor: string | null;
  latestFilingDate: string | null;
  annualReportLink: string | null;
}

export interface AnnualFinancial {
  year: string;
  revenue: number | null;
  pat: number | null;
  ebitda: number | null;
  isEstimated?: boolean;
}

export interface NewsItem {
  title: string;
  source: string;
  date: string;
  link: string;
  snippet: string;
}

export interface SponsoredSlot {
  title: string;
  snippet: string;
  sponsor: string;
  link?: string;
}

export interface StockDetailResponse {
  symbol: string;
  exchange: string;
  instrumentKey: string | null;
  companyName: string;
  sector: string | null;
  industry: string | null;
  currentPrice: number | null;
  priceChange: number | null;
  priceChangePercent: number | null;
  priceHistory: PricePoint[];
  supportedIntervals: string[];
  activeInterval: string;
  healthScore: number | null;
  healthLabel: string;
  healthConfidence: 'High' | 'Medium' | 'Low';
  healthBreakdown: HealthBreakdown | null;
  healthPositiveReasons: string[];
  healthRiskReasons: string[];
  metrics: MetricsGroup[];
  technicals: TechnicalData | null;
  fundamentals: FundamentalsData | null;
  companyProfile: CompanyProfile | null;
  annualFinancials: AnnualFinancial[];
  news: NewsItem[];
  sponsoredSlots: SponsoredSlot[];
  dataUpdatedAt: string;
  partialDataFlags: string[];
}
