export interface StockPageSnapshotQuote {
  price: number | null;
  change: number | null;
  changePercent: number | null;
  updatedAt: string | null;
}

export interface StockPageSnapshotPricePoint {
  date: string;
  close: number;
  high: number | null;
  low: number | null;
  volume: number | null;
}

export interface StockPageSnapshotHealthometerDimension {
  id: string;
  label: string;
  score: number | null;
  status: string;
}

export interface StockPageSnapshotHealthometer {
  overallScore: number | null;
  label: string | null;
  dimensions: StockPageSnapshotHealthometerDimension[];
}

export interface StockPageSnapshotAnalysisMeter {
  key: string;
  label: string;
  value: number | null;
  interpretation: string | null;
  status: "strong" | "neutral" | "caution" | "not_enough_information";
}

export interface StockPageSnapshotFinancialSeriesPoint {
  period: string;
  value: number | null;
  unit: string;
}

export interface StockPageSnapshotFinancialSeries {
  metric: string;
  label: string;
  periodType: string;
  points: StockPageSnapshotFinancialSeriesPoint[];
}

export interface StockPageSnapshotNewsItem {
  headline: string;
  publisher: string;
  publishedAt: string;
  summary: string;
  whyItMatters: string;
  url: string;
  category: string;
}

export interface StockPageSnapshotTrendlyne {
  available: boolean;
  widgetUrl: string | null;
  widgetMode: "iframe" | "script" | "disabled";
}

export interface StockPageSnapshotInvestContext {
  conviction: string;
  score: number | null;
  thesis: string | null;
  keyRisks: string[];
  keyStrengths: string[];
  whatToWatch: string[];
}

export type SnapshotFreshnessState = "fresh" | "stale" | "partial";

export interface StockPageSnapshot {
  symbol: string;
  companyName: string;
  sector: string | null;
  updatedAt: string;
  freshnessState: SnapshotFreshnessState;
  quote: StockPageSnapshotQuote;
  priceHistory: StockPageSnapshotPricePoint[];
  healthometer: StockPageSnapshotHealthometer;
  analysisMeters: StockPageSnapshotAnalysisMeter[];
  financialSeries: StockPageSnapshotFinancialSeries[];
  news: StockPageSnapshotNewsItem[];
  trendlyne: StockPageSnapshotTrendlyne;
  investContext: StockPageSnapshotInvestContext | null;
}
