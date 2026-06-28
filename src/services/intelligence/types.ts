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
