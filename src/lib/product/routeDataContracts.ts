import type { ProductResearchData } from "./dataContracts";

export interface DashboardViewData {
  searchQuery: string;
  recentCompanies: string[];
  trackedCompanies: Array<{
    symbol: string;
    companyName: string;
    score: number | null;
  }>;
  signals: Array<{
    symbol: string;
    type: string;
    severity: "critical" | "important" | "monitor";
    explanation: string;
  }>;
  hasWatchlist: boolean;
  hasPortfolio: boolean;
  hasAlerts: boolean;
}

export interface ScannerViewData {
  query: string;
  results: ScannerResultViewItem[];
  loading: boolean;
  totalCount: number;
  activePreset: string;
  hasData: boolean;
}

export interface ScannerResultViewItem {
  symbol: string;
  companyName: string;
  sector: string;
  score: number | null;
  rank: number | null;
  conviction: string;
  keyReason: string;
  riskMarker: string;
  hasRealData: boolean;
}

export interface CompanyResearchViewData {
  symbol: string;
  companyName: string;
  sector: string;
  research: ProductResearchData | null;
  isTracked: boolean;
  hasEnoughData: boolean;
  state: "ready" | "partial" | "empty" | "loading";
}

export interface CompareViewData {
  companies: CompareCompanyView[];
  comparisons: Array<{
    factor: string;
    values: Array<string | null>;
    winner: number | null;
  }>;
  hasEnoughData: boolean;
}

export interface CompareCompanyView {
  symbol: string;
  companyName: string;
  score: number | null;
}

export interface WatchlistViewData {
  trackedCompanies: string[];
  hasData: boolean;
  categories: Record<string, string[]>;
}

export interface PortfolioViewData {
  hasData: boolean;
  holdings: number;
  isManualOnly: boolean;
}

export interface AlertsViewData {
  hasData: boolean;
  alertCount: number;
  categories: string[];
}
