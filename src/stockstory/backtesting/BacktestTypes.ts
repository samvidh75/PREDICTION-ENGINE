/**
 * Backtesting Types
 *
 * Types for the Lensory intelligence engine backtesting framework.
 * Measures whether factor scores/rankings have historical predictive value.
 */

export interface BacktestConfig {
  /** Date range for backtest */
  fromDate: string; // ISO date
  toDate: string;
  /** Score field to bucket on */
  scoreField: keyof FactorSnapshot;
  /** Number of buckets (decile → 10, quintile → 5) */
  bucketCount: number;
  /** Forward return windows in days */
  forwardWindows: number[]; // e.g. [30, 90, 180]
}

export interface FactorSnapshot {
  symbol: string;
  tradeDate: string;
  overallScore: number | null;
  qualityScore: number | null;
  valueScore: number | null;
  growthScore: number | null;
  momentumScore: number | null;
  riskScore: number | null;
  sectorScore: number | null;
}

export interface ForwardReturn {
  symbol: string;
  tradeDate: string;
  windowDays: number;
  /** Return percentage (e.g. 5.2 for 5.2%) */
  returnPct: number | null;
  /** Volatility over the window */
  volatilityPct: number | null;
  /** Maximum drawdown over the window */
  maxDrawdownPct: number | null;
  /** Whether the return was positive */
  positive: boolean | null;
}

export interface ScoreBucket {
  bucketIndex: number; // 0 = lowest scores
  bucketLabel: string; // e.g. "Q1 (Lowest)" or "D1"
  symbolCount: number;
  avgScore: number;
  avgForwardReturn: number | null;
  avgVolatility: number | null;
  avgMaxDrawdown: number | null;
  hitRate: number | null; // % positive returns
  medianReturn: number | null;
}

export interface BacktestResult {
  config: BacktestConfig;
  totalSymbols: number;
  snapshotCount: number;
  dateRange: { from: string; to: string };
  buckets: ScoreBucket[];
  overall: {
    avgReturn: number | null;
    medianReturn: number | null;
    hitRate: number | null;
    sharpeRatio: number | null;
    correlationScoreReturn: number | null; // Spearman/Pearson
  };
  limitations: string[];
  generatedAt: string;
}
