/**
 * StockStory Intelligence — Canonical Contracts
 *
 * This file defines the unified type contracts for ALL intelligence engines.
 * Every engine consumes IntelligenceInput and produces IntelligenceOutput[T].
 * The StockStoryOrchestrator aggregates per-engine outputs into a StockReport.
 */

// ─── Primitive scoring types ───────────────────────────────────────

export type ScoreBand = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

export interface ScoredMetric {
  score: number;        // 0–100
  label: ScoreBand;
  raw?: number | null;  // Pre-normalization value
}

// ─── Unified intelligence input ────────────────────────────────────

export interface IntelligenceInput {
  symbol: string;
  exchange: 'BSE' | 'NSE' | 'NSE_EQ' | 'BSE_EQ';
  tradeDate: string; // YYYY-MM-DD

  // Financial metrics
  financials: {
    peRatio: number | null;
    pbRatio: number | null;
    eps: number | null;
    dividendYield: number | null;
    beta: number | null;
    marketCap: number | null;
    freeFloat: number | null;
    fcfYield: number | null;
    evEbitda: number | null;
    roa: number | null;
    roe: number | null;
    roic: number | null;
    debtToEquity: number | null;
    currentRatio: number | null;
    revenueGrowth: number | null;
    profitGrowth: number | null;
    epsGrowth: number | null;
    fcfGrowth: number | null;
    grossMargin: number | null;
    operatingMargin: number | null;
    netMargin: number | null;
    interestCoverage: number | null;
    assetTurnover: number | null;
    receivablesTurnover: number | null;
    inventoryTurnover: number | null;
    operatingCashFlow: number | null;
    freeCashFlow: number | null;
    capex: number | null;
  };

  // Technical / price-derived metrics
  technicals: {
    rsi: number | null;
    macd: number | null;
    macdSignal: number | null;
    macdHistogram: number | null;
    adx: number | null;
    atr: number | null;
    bollingerWidth: number | null;
    bollingerPosition: number | null; // 0=low, 1=high
    momentum1m: number | null;  // 1-month price return %
    momentum3m: number | null;  // 3-month price return %
    momentum6m: number | null;  // 6-month price return %
    momentum12m: number | null; // 12-month price return %
    volatility: number | null;  // 30-day annualised
    sma50: number | null;
    sma200: number | null;
    sma50Distance: number | null; // % distance from 50d SMA
    sma200Distance: number | null;
    volume: number | null;
    avgVolume: number | null;
    volumeRatio: number | null;
    relativeStrength: number | null; // vs market/sector
    trendStrength: number | null;
    avgTrueRange: number | null;
  };

  // Earnings data
  earnings: {
    epsTtm: number | null;
    epsGrowthQoq: number | null;
    revenueGrowthQoq: number | null;
    surprisePercent: number | null;
    beatMiss: 'beat' | 'miss' | 'in-line' | null;
    peTtm: number | null;
    forwardPe: number | null;
    pegRatio: number | null;
    estimatesAvailable: boolean;
    nextEarningsDate: string | null;
    recentEarningsDate: string | null;
    fiscalQuarter: string | null;
    fiscalYear: number | null;
  };

  // News & sentiment
  sentiment: {
    overallScore: number | null;      // -1 to 1
    recentHeadlines: number | null;   // count
    avgRecentSentiment: number | null;
    mentionVolume: number | null;
    positiveRatio: number | null;     // 0-1
    negativeRatio: number | null;
    neutralRatio: number | null;
    trending: boolean | null;
    controversyScore: number | null;  // 0-1
  };

  // Sector context
  sector: {
    name: string;
    sectorStrength: number | null;          // 0-100
    sectorMomentum: 'accelerating' | 'steady' | 'decelerating' | null;
    sectorPe: number | null;
    sectorAvgGrowth: number | null;
    sectorAvgMargin: number | null;
  };

  // Risk flags
  risks: {
    auditorChange: boolean;
    relatedPartyTransactions: boolean;
    pledgedShares: number | null;           // % of shares pledged
    promoterHolding: number | null;
    institutionalHolding: number | null;
    outstandingWarrants: boolean;
    esopDilution: number | null;            // %
    litigationRisk: number | null;          // 0-1
    governanceScore: number | null;         // 0-100
  };
}

// ─── Per-engine output contracts ───────────────────────────────────

export interface FinancialEngineOutput {
  score: number;            // 0-100
  qualityScore: number;     // 0-100
  growthScore: number;      // 0-100
  debtScore: number;        // 0-100
  confidence: number;       // 0-1
  dataCompleteness: number; // 0-1
  reasoning: string;
}

export interface TechnicalEngineOutput {
  score: number;            // 0-100 (bullish=bearish)
  trendScore: number;       // 0-100
  momentumScore: number;    // 0-100
  volatilityScore: number;  // 0-100
  volumeScore: number;      // 0-100
  patternRecognition: string;
  confidence: number;
  reasoning: string;
}

export interface ValuationEngineOutput {
  score: number;            // 0-100 (higher = fairly/overvalued context)
  peScore: number;
  pbScore: number;
  evEbitdaScore: number;
  fcfYieldScore: number;
  dividendScore: number;
  confidence: number;
  reasoning: string;
}

export interface RiskEngineOutput {
  score: number;            // 0-100 (higher = riskier)
  financialRisk: number;    // 0-100
  valuationRisk: number;    // 0-100
  volatilityRisk: number;   // 0-100
  governanceRisk: number;   // 0-100
  redFlagCount: number;
  redFlags: string[];
  confidence: number;
  reasoning: string;
}

export interface SectorEngineOutput {
  score: number;            // 0-100 (sector contribution)
  sectorStrength: number;   // 0-100
  peerPercentile: number;   // 0-100
  peerCount: number;
  tailwindScore: number;    // -100 to 100
  headwindScore: number;
  confidence: number;
  reasoning: string;
}

export interface NewsEngineOutput {
  score: number;            // 0-100 (positive leaning)
  sentimentScore: number;   // 0-100
  headlineCount: number;
  avgSentiment: number;     // -1 to 1
  positiveRatio: number;
  negativeRatio: number;
  controversy: number;      // 0-1
  trending: boolean;
  confidence: number;
  reasoning: string;
}

export interface EarningsEngineOutput {
  score: number;            // 0-100
  growthScore: number;
  surpriseScore: number;
  estimatesConfidence: number;
  beatRate: number;         // 0-1
  revenueTrend: 'growing' | 'stable' | 'declining' | 'unclear';
  recentSurprise: 'beat' | 'miss' | 'in-line' | 'unknown';
  nextEarningsDays: number | null;
  confidence: number;
  reasoning: string;
}

export interface EventEngineOutput {
  score: number;            // 0-100 (impact-adjusted)
  corporateActions: Array<{
    type: string;
    impact: number;         // -10 to +10
    date: string;
    description: string;
  }>;
  upcomingCatalysts: Array<{
    type: string;
    expectedImpact: 'high' | 'medium' | 'low';
    expectedDate: string;
    description: string;
  }>;
  eventRisk: number;        // 0-100
  confidence: number;
  reasoning: string;
}

export interface RAGEngineOutput {
  score: number;            // 0-100
  knowledgeCoverage: number; // 0-1
  relevantPatterns: string[];
  competitorInsights: string[];
  macroContext: string[];
  outcomeQuality: number;
  confidence: number;
  reasoning: string;
}

// ─── Aggregated output ─────────────────────────────────────────────

export interface StockIntelligenceReport {
  symbol: string;
  exchange: string;
  generatedAt: string;

  // Composite scores
  compositeScore: ScoredMetric;
  classification: 'excellent' | 'healthy' | 'stable' | 'weakening' | 'at_risk';
  confidence: ScoredMetric;

  // Per-engine outputs
  engines: {
    financial: FinancialEngineOutput;
    technical: TechnicalEngineOutput;
    valuation: ValuationEngineOutput;
    risk: RiskEngineOutput;
    sector: SectorEngineOutput;
    news: NewsEngineOutput;
    earnings: EarningsEngineOutput;
    event: EventEngineOutput;
    rag: RAGEngineOutput;
  };

  // Orchestrated insights
  thesis: string;
  strengths: string[];
  weaknesses: string[];
  risks: string[];
  opportunities: string[];
  dataFreshness: 'live' | 'recent' | 'stale' | 'unavailable';
  metadata: {
    computationTimeMs: number;
    engineVersions: Record<string, string>;
    dataCompleteness: number;
  };
}

// ─── Error handling ────────────────────────────────────────────────

export class IntelligenceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly engine: string,
    public readonly recoverable: boolean = true
  ) {
    super(message);
    this.name = 'IntelligenceError';
  }
}
