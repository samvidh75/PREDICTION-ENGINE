// Backtesting types

export interface BacktestBar {
  date: string; // ISO date
  close: number;
}

export interface BacktestMetrics {
  totalReturnPct: number;
  annualizedReturnPct: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdownPct: number;
  maxDrawdownDurationDays: number;
  winRate: number; // fraction of positive-return periods
  volatilityAnnualized: number;
  numPeriods: number;
}

export interface WalkForwardWindow {
  trainStart: string;
  trainEnd: string;
  testStart: string;
  testEnd: string;
  testMetrics: BacktestMetrics;
}

export interface WalkForwardResult {
  windows: WalkForwardWindow[];
  aggregateOutOfSample: BacktestMetrics;
  equityCurve: Array<{ date: string; value: number }>;
}

export type Regime = 'bull' | 'bear' | 'sideways';

export interface RegimePeriod {
  regime: Regime;
  startIndex: number;
  endIndex: number;
  annualizedReturn: number;
  annualizedVolatility: number;
}

export interface RegimeDetectionResult {
  regimes: RegimePeriod[];
  currentRegime: Regime;
  transitionMatrix: Record<Regime, Record<Regime, number>>; // row-stochastic
}

export interface MontecarloResult {
  paths: number;
  horizonDays: number;
  meanFinalValue: number;
  medianFinalValue: number;
  var95: number; // loss at 5th percentile, as positive fraction
  var99: number;
  cvar95: number;
  percentiles: { p5: number; p25: number; p50: number; p75: number; p95: number };
}

/**
 * A strategy maps a training window of returns to a signal decision for the
 * test window: fraction of capital invested (0 = cash, 1 = fully invested).
 */
export type StrategyFn = (trainReturns: number[]) => number;
