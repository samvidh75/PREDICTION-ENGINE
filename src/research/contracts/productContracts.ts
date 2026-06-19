export interface CompanyProfileView {
  symbol: string;
  companyName: string;
  sector: string | null;
  industry: string | null;
  description: string | null;
  website: string | null;
  listingDate: string | null;
  faceValue: number | null;
  isin: string | null;
}

export interface CompanyQuoteView {
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
  dayRange: string | null;
  week52High: number | null;
  week52Low: number | null;
}

export interface CompanyFundamentalsView {
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
}

export interface CompanyFactorScoresView {
  symbol: string;
  qualityScore: number | null;
  valuationScore: number | null;
  growthScore: number | null;
  riskScore: number | null;
  momentumScore: number | null;
  stabilityScore: number | null;
  convictionScore: number | null;
  qualityExplanation: string | null;
  valuationExplanation: string | null;
  growthExplanation: string | null;
  riskExplanation: string | null;
  momentumExplanation: string | null;
  stabilityExplanation: string | null;
}

export type ThesisStatus = "Strengthening" | "Stable" | "Weakening" | "Needs review" | "Tracking begins now" | "Research signals pending";

export interface CompanyThesisView {
  symbol: string;
  status: ThesisStatus;
  thesis: string | null;
  bullCase: string | null;
  bearCase: string | null;
  topStrengths: string[];
  topRisks: string[];
  whatWouldChange: string[];
  priorStatus: ThesisStatus | null;
}

export type RiskLevel = "High" | "Moderate" | "Low" | "Insufficient data";

export interface CompanyRiskView {
  symbol: string;
  overallRisk: RiskLevel;
  leverageRisk: string | null;
  volatilityRisk: string | null;
  liquidityRisk: string | null;
  earningsRisk: string | null;
  sectorRisk: string | null;
  keyRiskFlags: string[];
}

export interface CompanyPeersView {
  symbol: string;
  peers: PeerSummary[];
}

export interface PeerSummary {
  symbol: string;
  companyName: string;
  score: number | null;
  conviction: string;
}

export interface CompanyHistoryView {
  symbol: string;
  priceHistory: PricePoint[];
  earliestDate: string | null;
  latestDate: string | null;
  dataPoints: number;
}

export interface PricePoint {
  date: string;
  close: number;
  high: number | null;
  low: number | null;
  volume: number | null;
}

export interface ScannerResultView {
  symbol: string;
  companyName: string;
  sector: string | null;
  rank: number;
  conviction: string;
  score: number | null;
  oneLineThesis: string;
  keyReason: string;
  riskMarker: string | null;
}

export interface CompareResultView {
  companies: CompareCompanyView[];
  recommendation: string | null;
  factorComparison: FactorComparison[];
  missingDataCaveat: string | null;
}

export interface CompareCompanyView {
  symbol: string;
  companyName: string;
  scores: Record<string, number | null>;
  strengths: string[];
  risks: string[];
}

export interface FactorComparison {
  factor: string;
  winner: string | null;
  explanation: string;
}

export interface WatchlistThesisView {
  symbol: string;
  companyName: string;
  currentStatus: ThesisStatus;
  previousStatus: ThesisStatus | null;
  conviction: string;
  score: number | null;
  lastUpdated: string | null;
}

export type AlertTone = "thesis_change" | "risk_change" | "valuation_change" | "watchlist_review" | "price_move" | "peer_change" | "event";

export interface AlertChangeView {
  id: string;
  symbol: string;
  type: AlertTone;
  title: string;
  body: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface InvestReviewContextView {
  symbol: string;
  companyName: string;
  conviction: string;
  score: number | null;
  thesis: string | null;
  keyRisks: string[];
  keyStrengths: string[];
  whatToWatch: string[];
  missingCriticalData: string[];
}
