/**
 * Liquidity Types
 *
 * Defines types for assessing stock liquidity. Supports flagging of
 * microcap / low‑liquidity stocks as a caution for research consumers.
 */

/** Core liquidity metrics for a stock */
export interface LiquidityMetrics {
  symbol: string;
  /** Average daily trading volume in number of shares */
  avgDailyVolume: number;
  /** Average daily trade value in PHP millions */
  avgDailyValueMillions: number;
  /** Market capitalisation in PHP millions */
  marketCapMillions: number;
  /** Number of trading days in the measurement window */
  periodDays: number;
  /** Free‑float percentage (if known) */
  freeFloatPct?: number;
  /** Price as of measurement */
  price?: number;
  /** Timestamp of measurement */
  asOf: string;
}

/** Derived liquidity score (0–100, higher = more liquid) */
export interface LiquidityScore {
  symbol: string;
  score: number;
  /** Breakdown dimension scores (0–100 each) */
  dimensions: {
    volumeScore: number;
    valueScore: number;
    marketCapScore: number;
  };
  asOf: string;
}

/** Caution raised when liquidity is insufficient for research confidence */
export interface LiquidityCaution {
  symbol: string;
  severity: 'low' | 'medium' | 'high';
  reasons: string[];
  asOf: string;
}