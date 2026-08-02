// ML signal generation types

export interface PriceBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface FundamentalSnapshot {
  peRatio?: number;
  pbRatio?: number;
  roe?: number;
  debtToEquity?: number;
  revenueGrowthYoy?: number;
  epsGrowthYoy?: number;
  dividendYield?: number;
}

/** Flat feature vector: keys are feature names, values are normalized numbers. */
export type FeatureVector = Record<string, number>;

export type SignalDirection = 'up' | 'down' | 'neutral';

export interface Signal {
  direction: SignalDirection;
  /** Probability of the predicted direction, in [0.5, 1]. */
  probability: number;
  /** Signed strength in [-1, 1]; positive = bullish. */
  score: number;
}

export interface NamedSignal extends Signal {
  source: string;
}

export interface EnsembleSignal {
  direction: SignalDirection;
  probability: number;
  score: number;
  confidence: number; // 0-100, agreement-weighted
  components: NamedSignal[];
}
