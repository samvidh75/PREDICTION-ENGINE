export type ChartTimeframe = "1D" | "1W" | "1M" | "3M" | "1Y" | "MAX";

export type ConfidenceOverlayMode = "confidence" | "structure" | "narratives";

export type ChartConfidenceState =
  | "CONFIDENCE_RISING"
  | "STABLE_CONVICTION"
  | "NEUTRAL_ENVIRONMENT"
  | "MOMENTUM_WEAKENING"
  | "ELEVATED_RISK";

export type Candle = {
  t: number; // epoch ms
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

export type ChartSeries = {
  candles: Candle[];
};

export type ChartPoint = {
  index: number;
  candle: Candle;
};

export type ChartTooltipModel = {
  visible: boolean;
  xPx: number;
  yPx: number;
  title: string;
  lines: { label: string; value: string }[];
};

export type ChartNarrativeCapsule = {
  id: string;
  category: string;
  body: string;
  leftPct: number; // 0..100
  topPct: number; // 0..100
};
