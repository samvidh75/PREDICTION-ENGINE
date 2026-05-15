import type { ChartSeries, Candle, ChartTimeframe } from "./chartTypes";

function hashStringToSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function timeframeToCandleCount(tf: ChartTimeframe): number {
  switch (tf) {
    case "1D":
      return 64;
    case "1W":
      return 72;
    case "1M":
      return 88;
    case "3M":
      return 104;
    case "1Y":
      return 120;
    case "MAX":
    default:
      return 140;
  }
}

function timeframeToStepMs(tf: ChartTimeframe): number {
  // Not used for real-time alignment; only for tooltip labeling + spacing.
  switch (tf) {
    case "1D":
      return 15 * 60 * 1000;
    case "1W":
      return 2 * 60 * 60 * 1000;
    case "1M":
      return 6 * 60 * 60 * 1000;
    case "3M":
      return 12 * 60 * 60 * 1000;
    case "1Y":
      return 24 * 60 * 60 * 1000;
    case "MAX":
    default:
      return 24 * 60 * 60 * 1000;
  }
}

function initialPriceFromTicker(ticker: string): number {
  const seed = hashStringToSeed(ticker);
  // 80..820 (keeps chart readable; not trying to match real NSE prices)
  return 80 + (seed % 740);
}

function generateCandles(ticker: string, timeframe: ChartTimeframe): Candle[] {
  const count = timeframeToCandleCount(timeframe);
  const stepMs = timeframeToStepMs(timeframe);
  const now = Date.now();
  const startT = now - count * stepMs;

  const seed = hashStringToSeed(`${ticker}_${timeframe}_stockstory`);
  const rnd = mulberry32(seed);

  const base = initialPriceFromTicker(ticker);
  const trendBias = (rnd() - 0.5) * 0.18; // mild drift
  const volBase = 0.012 + rnd() * 0.018; // 1.2%..3%

  let price = base;

  const candles: Candle[] = [];
  for (let i = 0; i < count; i += 1) {
    const t = startT + i * stepMs;

    // Smooth pseudo-cycles to avoid “random terminal” look.
    const cycle = Math.sin((i / count) * Math.PI * 2 * (1.1 + rnd() * 0.7)) * 0.6 + 0.4;
    const regime = Math.cos((i / count) * Math.PI * 2 * (0.6 + rnd() * 0.5)) * 0.5 + 0.5;

    const vol = volBase * (0.55 + cycle * 0.9 + regime * 0.7);
    const drift = trendBias * (0.5 + cycle) * (0.65 + rnd() * 0.7);

    // return in percent
    const ret = (rnd() - 0.5) * vol * 2.0 + drift;

    const o = price;
    const c = Math.max(1, o * (1 + ret));

    // Create a candle range that feels “refined”: highs/lows with gentle asymmetry
    const wickScale = clamp(0.7 + rnd() * 0.9, 0.55, 1.6);
    const body = Math.abs(c - o);
    const range = Math.max(body * (0.6 + rnd() * 1.4), o * vol * (0.8 + rnd() * 0.7)) * wickScale;

    const high = Math.max(o, c) + range * (0.28 + rnd() * 0.55);
    const low = Math.min(o, c) - range * (0.22 + rnd() * 0.50);

    // Volume correlates with movement magnitude; kept subtle for the “non-dominant” spec.
    const moveMag = Math.abs(c - o) / Math.max(1e-6, o);
    const v = clamp(500 + moveMag * 320000 + rnd() * 26000, 250, 420000);

    candles.push({
      t,
      o,
      h: high,
      l: low,
      c,
      v,
    });

    price = c;
  }

  return candles;
}

export function getSyntheticChartSeries(ticker: string, timeframe: ChartTimeframe): ChartSeries {
  return { candles: generateCandles(ticker, timeframe) };
}

export type PriceDomain = { min: number; max: number };

export function computePriceDomain(candles: Candle[], paddingRatio: number): PriceDomain {
  if (candles.length === 0) return { min: 0, max: 1 };

  let min = Infinity;
  let max = -Infinity;

  for (const c of candles) {
    min = Math.min(min, c.l);
    max = Math.max(max, c.h);
  }

  const span = Math.max(1e-6, max - min);
  const pad = span * paddingRatio;

  return { min: min - pad, max: max + pad };
}

export function computeSMA(values: number[], windowSize: number): number[] {
  const out: number[] = new Array(values.length).fill(0);

  if (windowSize <= 1) {
    for (let i = 0; i < values.length; i += 1) out[i] = values[i];
    return out;
  }

  let sum = 0;
  for (let i = 0; i < values.length; i += 1) {
    sum += values[i];
    if (i >= windowSize) sum -= values[i - windowSize];
    const denom = Math.min(i + 1, windowSize);
    out[i] = sum / denom;
  }

  return out;
}

export function computeRollingRange(candles: Candle[], windowSize: number): number[] {
  // A lightweight “volatility proxy”: rolling mean of (h-l)/close.
  const out: number[] = new Array(candles.length).fill(0);

  if (windowSize <= 1) {
    for (let i = 0; i < candles.length; i += 1) {
      const c = candles[i];
      out[i] = (c.h - c.l) / Math.max(1e-6, c.c);
    }
    return out;
  }

  let sum = 0;
  for (let i = 0; i < candles.length; i += 1) {
    const cur = (candles[i].h - candles[i].l) / Math.max(1e-6, candles[i].c);
    sum += cur;

    if (i >= windowSize) {
      const prev = (candles[i - windowSize].h - candles[i - windowSize].l) / Math.max(1e-6, candles[i - windowSize].c);
      sum -= prev;
    }

    const denom = Math.min(i + 1, windowSize);
    out[i] = sum / denom;
  }

  return out;
}

export function formatTimeframeLabel(tf: ChartTimeframe): string {
  switch (tf) {
    case "1D":
      return "1D";
    case "1W":
      return "1W";
    case "1M":
      return "1M";
    case "3M":
      return "3M";
    case "1Y":
      return "1Y";
    case "MAX":
      return "MAX";
    default:
      return tf;
  }
}
