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
