export interface StockIntelligenceSnapshot {
  symbol: string;
  companyName: string | null;
  asOf: string;
  price: number | null;
  changePercent: number | null;
  peRatio: number | null;
  pbRatio: number | null;
  marketCap: number | null;
  roe: number | null;
  roce: number | null;
  debtToEquity: number | null;
  revenueGrowth: number | null;
  profitGrowth: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  promoterHolding: number | null;
  fiiHolding: number | null;
  diiHolding: number | null;
  analystView: 'positive' | 'neutral' | 'cautious' | 'not_available';
  analystViewRaw: string | null;
  externalTargetPrice: number | null;
  externalUpsidePercent: number | null;
  latestHeadline: string | null;
  latestHeadlineUrl: string | null;
  sourceState: 'available' | 'partial' | 'missing' | 'error';
  completenessScore: number;
  updatedAt: string;
}

export interface SuperScanResult {
  scanKey: string;
  scanLabel: string;
  symbol: string;
  rank: number;
  score: number;
  reason: string;
  dataQuality: string;
  generatedAt: string;
}

export interface IntelligenceIngestionRun {
  id: number;
  status: string;
  symbolsRequested: number;
  symbolsSucceeded: number;
  symbolsFailed: number;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
}

export interface DashboardSnapshot {
  symbols: StockIntelligenceSnapshot[];
  totalTracked: number;
  availableCount: number;
  updatedAt: string;
}

export interface AnalystViewMap {
  [key: string]: 'positive' | 'neutral' | 'cautious' | 'not_available';
}

export const ANALYST_VIEW_MAP: AnalystViewMap = {
  'strong buy': 'positive',
  'buy': 'positive',
  'outperform': 'positive',
  'accumulate': 'positive',
  'hold': 'neutral',
  'neutral': 'neutral',
  'reduce': 'cautious',
  'sell': 'cautious',
  'underperform': 'cautious',
};

export function normalizeAnalystView(raw: string | null | undefined): StockIntelligenceSnapshot['analystView'] {
  if (!raw) return 'not_available';
  const key = raw.trim().toLowerCase();
  return ANALYST_VIEW_MAP[key] || 'not_available';
}
