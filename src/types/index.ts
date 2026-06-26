export interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  timestamp: Date;
  source: 'indianapi' | 'yahoo' | 'upstox' | 'nsepython';
}

export interface HistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Fundamentals {
  symbol: string;
  companyName?: string;
  sector?: string;
  marketCap: number | null;
  peRatio: number | null;
  pbRatio: number | null;
  roe: number | null;
  roic: number | null;
  roa: number | null;
  debtEquity: number | null;
  currentRatio: number | null;
  revenueGrowth: number | null;
  profitGrowth: number | null;
  epsGrowth: number | null;
  fcfGrowth: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  evEbitda: number | null;
  fcfYield: number | null;
  dividendYield: number | null;
  beta: number | null;
  source: 'screener' | 'upstox' | 'indianapi';
  fetchedAt: Date;
}

export interface ResearchSnapshot {
  symbol: string;
  companyName: string;
  sector: string;
  quote: Quote;
  fundamentals: Fundamentals;
  score: number | null;
  scoreState: 'high_conviction' | 'watch' | 'needs_review' | 'avoid' | null;
  thesis: string | null;
  factors: {
    quality: number;
    valuation: number;
    growth: number;
    riskStability: number;
    momentum: number;
  } | null;
  proAnalysis?: {
    strengths: string[];
    weaknesses: string[];
    watchFor: string[];
    sectorContext: string;
  };
  confidence: 'high' | 'medium' | 'low';
  fetchedAt: Date;
}

export interface ScannerResult {
  symbol: string;
  companyName: string;
  score: number;
  scoreState: string;
  price: number;
  change: number;
  changePercent: number;
  sector: string;
  marketCap: number | null;
}

export interface EngineOutput {
  qualityScore: number;
  valuationScore: number;
  growthScore: number;
  riskScore: number;
  momentumScore: number;
  overallScore: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  timestamp: Date;
}

export type CompanyClassification = 'Excellent' | 'Healthy' | 'Stable' | 'Weakening' | 'At Risk';
export type ConfidenceLevel = 'Very High' | 'High' | 'Medium' | 'Low';

export function clampScore(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

export function weightedAverage(components: Array<{ score: number; weight: number }>): number {
  const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) return 50;
  const avg = components.reduce((sum, c) => sum + c.score * c.weight, 0) / totalWeight;
  return clampScore(avg);
}
