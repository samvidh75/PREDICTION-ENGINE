export type TechnicalIndicatorKey =
  | "rsi14"
  | "macd"
  | "macdSignal"
  | "macdHistogram"
  | "adx14"
  | "atr14"
  | "sma20"
  | "sma50"
  | "sma200"
  | "ema20"
  | "ema50"
  | "ema200"
  | "bollingerUpper20"
  | "bollingerMiddle20"
  | "bollingerLower20"
  | "stochK"
  | "stochD"
  | "obv"
  | "roc12"
  | "volatility20"
  | "volumeSma20";

export interface TechnicalIndicatorSnapshot {
  symbol: string;
  asOf: string;
  indicators: Partial<Record<TechnicalIndicatorKey, number | null>>;
  states: Partial<Record<TechnicalIndicatorKey, "available" | "missing" | "insufficient_history">>;
  computedAt: string;
}

export interface OhlcvPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export const TECHNICAL_INDICATOR_LABELS: Record<TechnicalIndicatorKey, string> = {
  rsi14: "RSI",
  macd: "MACD",
  macdSignal: "MACD Signal",
  macdHistogram: "MACD Histogram",
  adx14: "ADX",
  atr14: "ATR",
  sma20: "SMA 20",
  sma50: "SMA 50",
  sma200: "SMA 200",
  ema20: "EMA 20",
  ema50: "EMA 50",
  ema200: "EMA 200",
  bollingerUpper20: "Bollinger Upper",
  bollingerMiddle20: "Bollinger Middle",
  bollingerLower20: "Bollinger Lower",
  stochK: "Stochastic %K",
  stochD: "Stochastic %D",
  obv: "OBV",
  roc12: "ROC",
  volatility20: "Volatility",
  volumeSma20: "Volume SMA",
};
