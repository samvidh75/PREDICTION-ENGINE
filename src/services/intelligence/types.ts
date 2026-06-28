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
