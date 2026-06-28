// ============= FINANCIAL METRICS INPUT =============
export interface FinancialMetrics {
  // Profitability Metrics
  roe?: number;              // Return on Equity (%)
  roa?: number;              // Return on Assets (%)
  roic?: number;             // Return on Invested Capital (%)
  netMargin?: number;        // Net Profit Margin (%)
  operatingMargin?: number;  // Operating Margin (%)

  // Growth Metrics
  revenueGrowth?: number;    // YoY revenue growth (%)
  epsGrowth?: number;        // YoY EPS growth (%)
  ebitdaGrowth?: number;     // YoY EBITDA growth (%)
  profitGrowth?: number;     // YoY profit growth (%)

  // Leverage & Solvency
  debtToEquity?: number;     // D/E ratio
  debtToAssets?: number;     // D/A ratio
  interestCoverage?: number; // EBIT / Interest
  currentRatio?: number;     // Current Assets / Current Liabilities

  // Size & Efficiency
  marketCap?: number;        // Market cap in Cr
  revenue?: number;          // Annual revenue in Cr
  assetTurnover?: number;    // Revenue / Average Assets
  equityTurnover?: number;   // Revenue / Average Equity

  // Metadata
  lastUpdated: Date;
  fiscalYear: number;
}

// ============= ENGINE OUTPUT =============
export interface FinancialScore {
  overall: number;           // 0-100 weighted score

  // Component scores
  qualityScore: number;      // 0-35 points
  growthScore: number;       // 0-25 points
  debtScore: number;         // 0-10 points

  // Detailed breakdown
  details: {
    quality: {
      roeScore: number;
      roaScore: number;
      marginScore: number;
      points: number;
    };
    growth: {
      revenueScore: number;
      epsScore: number;
      points: number;
    };
    debt: {
      leverageScore: number;
      coverageScore: number;
      points: number;
    };
  };

  // Quality metrics
  dataCompleteness: number;  // 0-1 (what % of fields filled)
  confidence: number;        // 0-1 (how sure are we?)
  reasoning: string;         // Plain English explanation
  timestamp: Date;
}

// ============= ENGINE RESULT =============
export interface IntelligenceResult {
  symbol: string;
  engine: string;
  score: number;             // 0-100
  confidence: number;        // 0-1
  details: FinancialScore;
  timestamp: Date;
}

// ============= TECHNICAL METRICS INPUT =============
export interface TechnicalMetrics {
  // Price Data
  currentPrice: number;         // Current stock price (₹)

  // Moving Averages
  ma50?: number;               // 50-day MA
  ma200?: number;              // 200-day MA
  ma20?: number;               // 20-day MA (optional)

  // Momentum Indicators
  rsi?: number;                // RSI (0-100, 30=oversold, 70=overbought)
  macd?: number;               // MACD line value
  macdSignal?: number;         // MACD signal line
  macdHistogram?: number;      // MACD histogram (macd - signal)

  // Price Action
  priceChange1W?: number;      // 1-week % change
  priceChange1M?: number;      // 1-month % change
  priceChange3M?: number;      // 3-month % change
  priceChange6M?: number;      // 6-month % change
  priceChange1Y?: number;      // 1-year % change

  // Volatility
  volatility30?: number;       // 30-day annualized volatility (%)
  beta?: number;               // Beta vs market
  atr?: number;                // Average True Range (optional)

  // Volume & Strength
  volume?: number;             // Current volume
  avgVolume?: number;          // Average volume
  volumeRatio?: number;        // Current / Average (optional)

  // Metadata
  lastUpdated: Date;
  period: string;              // "1D" or "1W" etc.
}

// ============= TECHNICAL ENGINE OUTPUT =============
export interface TechnicalScore {
  overall: number;             // 0-100 weighted score

  // Component scores
  momentumScore: number;       // 0-20 points
  trendScore: number;          // 0-20 points
  volatilityScore: number;     // 0-10 points

  // Detailed breakdown
  details: {
    momentum: {
      rsiScore: number;
      macdScore: number;
      rocScore: number;
      points: number;
    };
    trend: {
      maScore: number;
      pricePositionScore: number;
      points: number;
    };
    volatility: {
      volatilityScore: number;
      points: number;
    };
  };

  // Direction & Status
  direction: 'bullish' | 'neutral' | 'bearish';
  trend: 'uptrend' | 'downtrend' | 'sideways';
  momentumStatus: 'strong' | 'moderate' | 'weak';

  // Quality metrics
  dataCompleteness: number;    // 0-1
  confidence: number;          // 0-1
  reasoning: string;           // Plain English
  timestamp: Date;
}

// ============= EARNINGS METRICS INPUT =============
export interface EarningsHistoryPeriod {
  quarter: string;                   // "Q1FY26", "Q2FY26"
  eps: number;                       // Earnings per share
  epsYoY: number;                    // YoY growth (%)
  revenue: number;                   // Revenue in Cr
  revenueYoY: number;                // YoY growth (%)
  margin: number;                    // Net margin (%)
  surprise: number;                  // vs consensus (%)
  guidanceHit: boolean;              // Met management guidance?
}

export interface EarningsMetrics {
  // Historical
  history: EarningsHistoryPeriod[];  // Last 8 quarters

  // Guidance
  currentGuidance: {
    epsGrowth: number;               // Guided EPS growth (%)
    revenueGrowth: number;           // Guided revenue growth (%)
  };

  // Multiples
  forwardPE?: number;                // PE on forward earnings
  peg?: number;                      // PEG ratio

  // Quality
  oneTimeItems?: number;             // Non-recurring items (%)
  capexToRevenue?: number;           // Capex intensity (%)
  fcfMargin?: number;                // Free cash flow margin (%)

  // Metadata
  lastUpdated: Date;
  fiscalYear: number;
}

// ============= EARNINGS ENGINE OUTPUT =============
export interface EarningsScore {
  overall: number;                   // 0-100 weighted score

  // Component scores
  consistencyScore: number;          // 0-25 points
  forwardScore: number;              // 0-20 points
  beatScore: number;                 // 0-20 points
  qualityScore: number;              // 0-20 points
  guidanceScore: number;             // 0-15 points

  // Trends
  epsGrowth5Y: number;               // 5-year CAGR (%)
  epsGrowthTrend: 'accelerating' | 'decelerating' | 'stable';
  beatStreak: number;                // Quarters beating consensus
  missStreak: number;                // Quarters missing consensus

  // Quality flags
  earningsQuality: 'excellent' | 'good' | 'average' | 'weak';
  revenueQuality: 'solid' | 'adequate' | 'concerning';

  // Detailed breakdown
  details: {
    recent8Quarters: EarningsHistoryPeriod[];
    avgSurprise: number;
    volatility: number;
    guidanceAccuracy: number;        // 0-100
  };

  // Quality metrics
  dataCompleteness: number;          // 0-1
  confidence: number;                // 0-1
  reasoning: string;
  timestamp: Date;
}

// ============= RISK METRICS INPUT =============
export interface RiskMetrics {
  // Volatility Metrics
  volatility?: number;                 // Historical volatility σ (%) — lower is better
  beta?: number;                       // Beta vs market (>1.2 = risky)
  maxDrawdown?: number;                // Maximum historical drawdown (%)
  weeklyRange?: number;                // 52-week range (% from low to current)

  // Financial Risk Metrics
  debtToEquity?: number;               // D/E ratio
  currentRatio?: number;               // Current Assets / Current Liabilities (<1.0 = stress)
  interestCoverage?: number;           // EBIT / Interest Expense
  cashReserves?: number;               // Months of operating expenses in cash (6+ = safe)

  // Business Risk Metrics
  customerConcentration?: number;      // % revenue from largest customer (>30% = risky)
  revenuePredictability?: number;      // 0-1 score (1 = highly recurring/predictable)
  competitiveMoat?: number;            // 0-1 score (1 = strong defensible moat)
  executionRisk?: number;              // 0-1 score (1 = strong management track record)

  // Downside Risk
  profitabilityAtMinus20Revenue?: boolean; // Can company stay profitable if revenue drops 20%?
  sharpeRatio?: number;                // Risk-adjusted returns (>1 = good, <0.5 = poor)
  valueAtRisk?: number;                // VaR at 99% confidence (% daily loss)

  // Tail Risk (0-1, lower = safer)
  regulatoryRisk?: number;             // Regulatory/political exposure
  litigationRisk?: number;             // Legal/litigation exposure
  obsolescenceRisk?: number;           // Product/service obsolescence risk
  disruptionRisk?: number;             // Market/technology disruption risk

  lastUpdated: Date;
  symbol?: string;
}

// ============= RISK ENGINE OUTPUT =============
export interface RiskScore {
  overall: number;                     // 0-100 (higher = SAFER / lower risk)
  riskProfile: 'low_risk' | 'moderate' | 'elevated' | 'high' | 'dangerous';

  // Component scores
  volatilityScore: number;             // 0-25 points
  financialRiskScore: number;          // 0-20 points
  businessRiskScore: number;           // 0-20 points
  downsideRiskScore: number;           // 0-20 points
  tailRiskScore: number;               // 0-15 points

  // Detailed breakdown
  details: {
    volatility: {
      sigmaScore: number;
      betaScore: number;
      drawdownScore: number;
      points: number;
    };
    financialRisk: {
      leverageScore: number;
      liquidityScore: number;
      coverageScore: number;
      cashScore: number;
      points: number;
    };
    businessRisk: {
      concentrationScore: number;
      predictabilityScore: number;
      moatScore: number;
      executionScore: number;
      points: number;
    };
    downsideRisk: {
      scenarioScore: number;
      sharpeScore: number;
      varScore: number;
      points: number;
    };
    tailRisk: {
      regulatoryScore: number;
      litigationScore: number;
      obsolescenceScore: number;
      disruptionScore: number;
      points: number;
    };
  };

  // Quality metrics
  dataCompleteness: number;            // 0-1
  confidence: number;                  // 0-1
  reasoning: string;                   // Plain English explanation
  timestamp: Date;
}

// ============= VALUATION METRICS INPUT =============
export interface ValuationMetrics {
  peRatio?: number | null;           // Price-to-Earnings ratio
  pbRatio?: number | null;           // Price-to-Book ratio
  evEbitda?: number | null;          // Enterprise Value / EBITDA
  fcfYield?: number | null;          // Free Cash Flow Yield (0.05 = 5%)
  dividendYield?: number | null;     // Dividend Yield (0.03 = 3%)
  lastUpdated: Date;
  symbol?: string;
}

// ============= VALUATION ENGINE OUTPUT =============
export interface ValuationScore {
  overall: number;                   // 0-100 (higher = better value)
  peScore: number;                   // 0-25
  pbScore: number;                   // 0-25
  evEbitdaScore: number;             // 0-20
  fcfYieldScore: number;             // 0-15
  dividendYieldScore: number;        // 0-15
  valuation: 'undervalued' | 'fair_value' | 'premium' | 'expensive';
  details: {
    pe: { score: number; ratio?: number; level: string };
    pb: { score: number; ratio?: number; level: string };
    evEbitda: { score: number; ratio?: number; level: string };
    fcfYield: { score: number; yield?: number; level: string };
    dividend: { score: number; yield?: number; level: string };
  };
  dataCompleteness: number;
  confidence: number;
  reasoning: string;
  timestamp: Date;
}

// ============= EVENT METRICS INPUT =============
export interface CatalystEvent {
  type: 'earnings' | 'dividend' | 'deal' | 'approval' | 'product' | 'strategic' | 'other';
  description: string;
  expectedDate?: Date;
  probability?: number;                    // 0-1
  expectedImpact: 'high' | 'medium' | 'low';
  direction: 'bullish' | 'bearish' | 'neutral';
  source?: string;                         // "Management guidance", "Analyst estimates", etc.
}

export interface EventMetrics {
  events: CatalystEvent[];
  nextEarningsDate?: Date;
  nextDividendDate?: Date;
  nextSplitDate?: Date;
  pendingDeals?: string[];
  pendingApprovals?: string[];
  productLaunchesPlanned?: string[];
  managementChanges?: string[];
  eventCount90Days?: number;
  bullishEventCount?: number;
  bearishEventCount?: number;
  catalystHistorySuccess?: number;
  catalystHistoryVolatility?: number;
  lastUpdated: Date;
  fiscalYear: number;
  currency: string;
}

// ============= EVENTS ENGINE OUTPUT =============
export interface EventScore {
  overall: number;
  catalystDetectionScore: number;
  eventImpactScore: number;
  timingProbabilityScore: number;
  strategicCatalystScore: number;
  catalystRichnessScore: number;
  nextCatalyst: string;
  daysToCatalyst?: number;
  catalystDirection: 'bullish' | 'bearish' | 'neutral';
  opportunityWindow: 'immediate' | 'near_term' | 'medium_term' | 'distant' | 'limited';
  catalystRichness: 'catalyst_heavy' | 'moderate' | 'sparse';
  upcomingEvents: {
    event: string;
    date: Date;
    impact: 'high' | 'medium' | 'low';
    direction: 'bullish' | 'bearish' | 'neutral';
    daysAway: number;
    probability?: number;
  }[];
  expectedVolatility?: number;
  expectedMoveRange?: { low: number; high: number };
  details: {
    bullishCatalysts: string[];
    bearishCatalysts: string[];
    timingCertainty: 'high' | 'medium' | 'low';
  };
  dataCompleteness: number;
  confidence: number;
  reasoning: string;
  timestamp: Date;
}

// ============= NEWS / SENTIMENT METRICS INPUT =============
export interface NewsArticle {
  headline: string;
  source: string;
  time: string;
  link?: string;
}

export interface NewsMetrics {
  articles: NewsArticle[];
  symbol?: string;
  lastUpdated: Date;
}

// ============= NEWS ENGINE OUTPUT =============
export interface NewsScore {
  overall: number;
  volumeScore: number;
  sentimentScore: number;
  credibilityScore: number;
  recencyScore: number;
  sentiment: 'bullish' | 'bearish' | 'neutral' | 'unknown';
  articleCount: number;
  topKeywords: string[];
  details: {
    volume: { score: number; count: number; level: string };
    sentiment: { score: number; polarity: string; bullish: number; bearish: number; keywords: string[] };
    credibility: { score: number; credibleCount: number; level: string };
    recency: { score: number; avgAgeHours: number; level: string };
  };
  dataCompleteness: number;
  confidence: number;
  reasoning: string;
  timestamp: Date;
}

// ============= SECTOR METRICS INPUT =============
export interface SectorMetrics {
  stockPE?: number | null;
  stockPB?: number | null;
  stockEVEbitda?: number | null;
  stockROE?: number | null;
  stockNetMargin?: number | null;
  stockRevGrowth?: number | null;
  stockEPSGrowth?: number | null;
  peerPE?: number | null;
  peerPB?: number | null;
  peerEVEbitda?: number | null;
  peerROE?: number | null;
  peerNetMargin?: number | null;
  peerRevGrowth?: number | null;
  peerEPSGrowth?: number | null;
  sectorReturn1M?: number | null;
  sectorReturn3M?: number | null;
  relativeStrength?: number | null;
  analystUpgrades?: number | null;
  analystDowngrades?: number | null;
  marketCapRank?: number | null;
  sectorPeerCount?: number | null;
  brandStrength?: number | null;
  customerStickiness?: number | null;
  symbol?: string;
  sectorName?: string;
  lastUpdated: Date;
}

// ============= SECTOR ENGINE OUTPUT =============
export interface SectorScore {
  overall: number;
  relativeValuationScore: number;
  relativeQualityScore: number;
  relativeGrowthScore: number;
  sectorMomentumScore: number;
  competitivePositionScore: number;
  peerRank: number;
  relativeValuation: 'discount' | 'fair' | 'premium';
  sectorMomentum: 'up' | 'neutral' | 'down';
  competitivePosition: 'leader' | 'competitive' | 'weak';
  details: {
    relativeValuation: { score: number; peVsPeer: number | null; pbVsPeer: number | null; level: string };
    relativeQuality: { score: number; roeVsPeer: number | null; marginVsPeer: number | null; level: string };
    relativeGrowth: { score: number; revGrowthVsPeer: number | null; epsGrowthVsPeer: number | null; level: string };
    sectorMomentum: { score: number; sectorTrend: number | null; level: string };
    competitivePosition: { score: number; marketCapRank: number | null; level: string };
  };
  dataCompleteness: number;
  confidence: number;
  reasoning: string;
  timestamp: Date;
}

// ============= RAG / KNOWLEDGE BASE METRICS INPUT =============
export interface PatternRecord {
  id: string;
  description: string;
  similarity: number;
  successRate: number;
  outcomeReturn?: number;
  occurrences: number;
  timeframe: string;
}

export interface KnowledgeItem {
  id: string;
  content: string;
  type: 'pattern' | 'note' | 'macro' | 'learning';
  relevance: number;
  confidence: number;
  createdAt: Date;
}

export interface MacroSignal {
  indicator: string;
  value: number;
  direction: 'positive' | 'negative' | 'neutral';
  impactOnStock: number;
}

export interface RAGMetrics {
  patterns: PatternRecord[];
  knowledgeItems: KnowledgeItem[];
  macroSignals: MacroSignal[];
  sectorPhase?: string;
  institutionalCoverage?: number;
  learningCount?: number;
  symbol?: string;
  lastUpdated: Date;
}

// ============= RAG ENGINE OUTPUT =============
export interface RAGScore {
  overall: number;
  patternMatchScore: number;
  knowledgeCoverageScore: number;
  outcomeQualityScore: number;
  macroContextScore: number;
  patternMatchCount: number;
  bestPattern?: string;
  bestPatternSuccessRate?: number;
  knowledgeConfidence: 'high' | 'moderate' | 'low';
  macroEnvironment: 'favorable' | 'neutral' | 'unfavorable';
  details: {
    patternMatch: { score: number; matchCount: number; topSimilarity: number; level: string };
    knowledgeCoverage: { score: number; itemCount: number; avgRelevance: number; level: string };
    outcomeQuality: { score: number; avgSuccessRate: number; provenPatterns: number; level: string };
    macroContext: { score: number; signalCount: number; netDirection: string; level: string };
  };
  dataCompleteness: number;
  confidence: number;
  reasoning: string;
  timestamp: Date;
}

// ============= ORCHESTRATOR OUTPUT =============
export type InvestmentState = 'high_conviction' | 'watch' | 'needs_review' | 'risk_rising' | 'avoid';

export interface OrchestratorResult {
  symbol: string;
  overallScore: number;
  investmentState: InvestmentState;
  confidence: number;
  engines: {
    financial: { score: number; confidence: number };
    technical: { score: number; confidence: number };
    valuation: { score: number; confidence: number };
    earnings: { score: number; confidence: number };
    risk: { score: number; confidence: number; riskProfile: string };
    sector: { score: number; confidence: number };
    news: { score: number; confidence: number; sentiment: string };
    events: { score: number; confidence: number };
    rag: { score: number; confidence: number };
  };
  thesis: {
    bullCase: string[];
    bearCase: string[];
    whatToWatch: string[];
    disclaimer: string;
  };
  weights: {
    financial: number;
    valuation: number;
    earnings: number;
    risk: number;
    technical: number;
    sector: number;
    news: number;
    events: number;
    rag: number;
  };
  timestamp: Date;
}
