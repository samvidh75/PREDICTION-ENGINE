import { normalizeEvidenceCoverage } from './evidenceNormalization';

export type MarketDataDomain =
  | 'instrument_master'
  | 'prices'
  | 'fundamentals'
  | 'financial_statements'
  | 'shareholding'
  | 'corporate_actions'
  | 'news_events'
  | 'technicals'
  | 'sector_context';

export type EvidenceState = 'ready' | 'partial' | 'missing';
export type ResearchState = 'High conviction' | 'Thesis improving' | 'Watch' | 'Needs review' | 'Risk rising';

export interface IndiaEquityFundamentals {
  peRatio?: number | null;
  pbRatio?: number | null;
  evEbitda?: number | null;
  roe?: number | null;
  roa?: number | null;
  roic?: number | null;
  revenueGrowth?: number | null;
  profitGrowth?: number | null;
  operatingMargin?: number | null;
  debtToEquity?: number | null;
  currentRatio?: number | null;
  dividendYield?: number | null;
  fcfYield?: number | null;
  marketCap?: number | null;
}

export interface IndiaEquityTechnicals {
  momentum?: number | null;
  relativeStrength?: number | null;
  volatility?: number | null;
  rsi?: number | null;
  adx?: number | null;
  trendStrength?: number | null;
}

export interface IndiaEquityOwnership {
  promoterHolding?: number | null;
  promoterPledge?: number | null;
  fiiHolding?: number | null;
  diiHolding?: number | null;
}

export interface IndiaEquityPacket {
  symbol: string;
  companyName: string;
  sector?: string | null;
  industry?: string | null;
  asOf: string;
  fundamentals?: IndiaEquityFundamentals;
  technicals?: IndiaEquityTechnicals;
  ownership?: IndiaEquityOwnership;
  evidence?: Partial<Record<MarketDataDomain, EvidenceState>>;
}

export interface FactorScore {
  score: number;
  drivers: string[];
  risks: string[];
}

export interface IndiaMarketBrainResult {
  symbol: string;
  companyName: string;
  researchState: ResearchState;
  convictionScore: number;
  quality: FactorScore;
  growth: FactorScore;
  valuation: FactorScore;
  stability: FactorScore;
  momentum: FactorScore;
  risk: FactorScore;
  ownership: FactorScore;
  thesis: string[];
  risksToReview: string[];
  whatToWatch: string[];
  missingEvidence: MarketDataDomain[];
  partialEvidence: MarketDataDomain[];
  complianceNote: string;
  generatedAt: string;
}

const clamp = (value: number): number => Math.min(100, Math.max(0, value));
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const higherIsBetter = (value: number | null | undefined, low: number, high: number): number => {
  if (!finite(value)) return 50;
  return clamp(((value - low) / (high - low)) * 100);
};

const lowerIsBetter = (value: number | null | undefined, low: number, high: number): number => {
  if (!finite(value)) return 50;
  return clamp(100 - ((value - low) / (high - low)) * 100);
};

const average = (items: Array<{ score: number; weight: number }>): number => {
  const weight = items.reduce((sum, item) => sum + item.weight, 0);
  if (weight <= 0) return 50;
  return Math.round(clamp(items.reduce((sum, item) => sum + item.score * item.weight, 0) / weight));
};

const unique = (items: string[][]): string[] => Array.from(new Set(items.flat())).slice(0, 8);

function scoreQuality(fin?: IndiaEquityFundamentals): FactorScore {
  const score = average([
    { score: higherIsBetter(fin?.roe, 0, 25), weight: 2 },
    { score: higherIsBetter(fin?.roic, 0, 25), weight: 2 },
    { score: higherIsBetter(fin?.roa, 0, 15), weight: 1.2 },
    { score: higherIsBetter(fin?.operatingMargin, 0, 30), weight: 1 },
  ]);
  return {
    score,
    drivers: [
      ...(score >= 70 ? ['Quality metrics support the business thesis.'] : []),
      ...((fin?.roe ?? 0) >= 18 ? ['Return on equity is a positive quality signal.'] : []),
