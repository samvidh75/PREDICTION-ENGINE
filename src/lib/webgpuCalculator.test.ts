import { describe, expect, it } from "vitest";
import {
  calculateIndicators, TechnicalIndicatorResult,
  rsify, interpretMACD, interpretBollinger,
} from "./webgpuCalculator";

function generatePrices(length: number, base = 100, volatility = 2): Float32Array {
  const prices = new Float32Array(length);
  let price = base;
  for (let i = 0; i < length; i++) {
    price += (Math.random() - 0.5) * volatility;
    price = Math.max(price, 1);
    prices[i] = Math.round(price * 100) / 100;
  }
  return prices;
}

function constantPrices(length: number, value = 150): Float32Array {
  const p = new Float32Array(length);
  p.fill(value);
  return p;
}

function trendingPrices(length: number, start = 100, step = 1): Float32Array {
  const p = new Float32Array(length);
  for (let i = 0; i < length; i++) p[i] = start + i * step;
  return p;
}

function volatilePrices(length: number): Float32Array {
  const p = new Float32Array(length);
  let v = 100;
  for (let i = 0; i < length; i++) {
    v += (Math.random() - 0.5) * 10;
    v = Math.max(v, 1);
    p[i] = Math.round(v * 100) / 100;
  }
  return p;
}

describe("calculateIndicators", () => {
  it("returns nulls for insufficient data (< 50)", async () => {
    const prices = new Float32Array([100, 101, 102]);
    const r = await calculateIndicators(prices);
    expect(r.current.sma20).toBeNull();
    expect(r.current.sma50).toBeNull();
    expect(r.current.sma200).toBeNull();
    expect(r.current.rsi14).toBeNull();
    expect(r.current.macd).toBeNull();
    expect(r.current.macdSignal).toBeNull();
    expect(r.current.macdHistogram).toBeNull();
    expect(r.current.bollingerUpper).toBeNull();
    expect(r.current.bollingerMiddle).toBeNull();
    expect(r.current.bollingerLower).toBeNull();
    expect(r.current.atr14).toBeNull();
    expect(r.current.stochasticK).toBeNull();
    expect(r.current.stochasticD).toBeNull();
  });

  it("computes SMA-20", async () => {
    const r = await calculateIndicators(generatePrices(60));
    expect(r.current.sma20).not.toBeNull();
    expect(r.current.sma20!).toBeGreaterThan(0);
    expect(r.history.sma20.values.length).toBeGreaterThan(0);
  });

  it("computes SMA-50", async () => {
    const r = await calculateIndicators(generatePrices(100));
    expect(r.current.sma50).not.toBeNull();
    expect(r.current.sma50!).toBeGreaterThan(0);
  });

  it("computes SMA-200 when enough data", async () => {
    const r = await calculateIndicators(generatePrices(250));
    expect(r.current.sma200).not.toBeNull();
    expect(r.current.sma200!).toBeGreaterThan(0);
  });

  it("SMA-200 null when not enough data", async () => {
    const r = await calculateIndicators(generatePrices(100));
    expect(r.current.sma200).toBeNull();
  });

  it("SMA equals price for constant series", async () => {
    const r = await calculateIndicators(constantPrices(100, 150));
    expect(r.current.sma20).toBe(150);
    expect(r.current.sma50).toBe(150);
  });

  it("computes RSI-14 between 0 and 100", async () => {
    const r = await calculateIndicators(generatePrices(60));
    expect(r.current.rsi14).not.toBeNull();
    expect(r.current.rsi14!).toBeGreaterThanOrEqual(0);
    expect(r.current.rsi14!).toBeLessThanOrEqual(100);
  });

  it("returns RSI=100 when only gains", async () => {
    const r = await calculateIndicators(trendingPrices(60));
    expect(r.current.rsi14).toBe(100);
  });

  it("returns RSI=0 when only losses", async () => {
    const r = await calculateIndicators(trendingPrices(60, 200, -1));
    expect(r.current.rsi14).toBe(0);
  });

  it("computes MACD and signal line", async () => {
    const r = await calculateIndicators(generatePrices(60));
    expect(r.current.macd).not.toBeNull();
    expect(r.current.macdSignal).not.toBeNull();
    expect(r.current.macdHistogram).not.toBeNull();
  });

  it("MACD near zero for constant price", async () => {
    const r = await calculateIndicators(constantPrices(60, 150));
    expect(r.current.macd).toBeCloseTo(0, 1);
    expect(r.current.macdSignal).toBeCloseTo(0, 1);
  });

  it("computes Bollinger Bands", async () => {
    const r = await calculateIndicators(volatilePrices(100));
    expect(r.current.bollingerUpper).not.toBeNull();
    expect(r.current.bollingerMiddle).not.toBeNull();
    expect(r.current.bollingerLower).not.toBeNull();
    const u = r.current.bollingerUpper!;
    const m = r.current.bollingerMiddle!;
    const l = r.current.bollingerLower!;
    expect(u).toBeGreaterThan(m);
    expect(m).toBeGreaterThan(l);
  });

  it("Bollinger Bands converge for constant prices", async () => {
    const r = await calculateIndicators(constantPrices(100, 150));
    const u = r.current.bollingerUpper!;
    const m = r.current.bollingerMiddle!;
    const l = r.current.bollingerLower!;
    expect(u).toBeCloseTo(150, 2);
    expect(m).toBe(150);
    expect(l).toBeCloseTo(150, 2);
  });

  it("computes ATR-14", async () => {
    const prices = volatilePrices(100);
    const r = await calculateIndicators(prices, prices, prices);
    expect(r.current.atr14).not.toBeNull();
    expect(r.current.atr14!).toBeGreaterThan(0);
  });

  it("ATR is zero for constant prices", async () => {
    const prices = constantPrices(100, 150);
    const r = await calculateIndicators(prices, prices, prices);
    expect(r.current.atr14).toBeCloseTo(0, 1);
  });

  it("computes Stochastic %K and %D", async () => {
    const prices = volatilePrices(100);
    const r = await calculateIndicators(prices, prices, prices);
    expect(r.current.stochasticK).not.toBeNull();
    expect(r.current.stochasticD).not.toBeNull();
    expect(r.current.stochasticK!).toBeGreaterThanOrEqual(0);
    expect(r.current.stochasticK!).toBeLessThanOrEqual(100);
    expect(r.current.stochasticD!).toBeGreaterThanOrEqual(0);
    expect(r.current.stochasticD!).toBeLessThanOrEqual(100);
  });

  it("Stochastic is 50 for constant prices", async () => {
    const prices = constantPrices(100, 150);
    const r = await calculateIndicators(prices, prices, prices);
    expect(r.current.stochasticK).toBeCloseTo(50, 0);
    expect(r.current.stochasticD).toBeCloseTo(50, 0);
  });

  it("returns history with correct labels", async () => {
    const r = await calculateIndicators(generatePrices(100));
    expect(r.history.sma20.label).toBe("SMA-20");
    expect(r.history.sma50.label).toBe("SMA-50");
    expect(r.history.rsi14.label).toBe("RSI-14");
    expect(r.history.macd.label).toBe("MACD");
    expect(r.history.bollingerUpper.label).toBe("Bollinger Upper");
    expect(r.history.atr14.label).toBe("ATR-14");
    expect(r.history.stochasticK.label).toBe("Stochastic %K");
  });

  it("handles NaN/infinity in prices gracefully", async () => {
    const prices = new Float32Array(60);
    for (let i = 0; i < 60; i++) prices[i] = 100 + i;
    prices[30] = NaN;
    prices[31] = Infinity;
    const r = await calculateIndicators(prices);
    expect(r.current.sma20).not.toBeNull();
    expect(r.current.sma50).toBeNull();
  });

  it("handles exactly 50 data points", async () => {
    const r = await calculateIndicators(generatePrices(50));
    expect(r.current.sma20).not.toBeNull();
    expect(r.current.sma50).not.toBeNull();
    expect(r.current.rsi14).not.toBeNull();
  });

  it("handles exactly 200 data points", async () => {
    const r = await calculateIndicators(generatePrices(200));
    expect(r.current.sma200).not.toBeNull();
  });

  it("returns consistent history array lengths", async () => {
    const r = await calculateIndicators(generatePrices(100));
    expect(r.history.sma20.values.length).toBe(81);
    expect(r.history.sma50.values.length).toBe(51);
    expect(r.history.rsi14.values.length).toBe(100);
    expect(r.history.macd.values.length).toBe(100);
    expect(r.history.stochasticK.values.length).toBe(100);
  });
});

describe("rsify", () => {
  it("returns neutral for empty array", () => {
    const r = rsify(new Float32Array(0));
    expect(r.rsi).toBeNull();
    expect(r.signal).toBe("neutral");
  });

  it("detects overbought (RSI >= 70)", () => {
    const arr = new Float32Array(30);
    arr[arr.length - 1] = 75;
    const r = rsify(arr);
    expect(r.rsi).toBe(75);
    expect(r.signal).toBe("overbought");
  });

  it("detects oversold (RSI <= 30)", () => {
    const arr = new Float32Array(30);
    arr[arr.length - 1] = 25;
    const r = rsify(arr);
    expect(r.rsi).toBe(25);
    expect(r.signal).toBe("oversold");
  });

  it("detects neutral", () => {
    const arr = new Float32Array(30);
    arr[arr.length - 1] = 50;
    const r = rsify(arr);
    expect(r.signal).toBe("neutral");
  });
});

describe("interpretMACD", () => {
  it("returns none when too short", () => {
    expect(interpretMACD(new Float32Array(2), new Float32Array(2)).crossover).toBe("none");
  });

  it("detects bullish crossover", () => {
    const m = new Float32Array([-2, -1, 0.5]);
    const s = new Float32Array([-1, 0, 0.2]);
    const r = interpretMACD(m, s);
    expect(r.crossover).toBe("bullish");
  });

  it("detects bearish crossover", () => {
    const m = new Float32Array([2, 1, -0.5]);
    const s = new Float32Array([1, 0.5, 0.2]);
    const r = interpretMACD(m, s);
    expect(r.crossover).toBe("bearish");
  });
});

describe("interpretBollinger", () => {
  it("detects inside range", () => {
    const r = interpretBollinger(150, 160, 140);
    expect(r.position).toBe("inside");
    expect(r.bandwidth).toBeCloseTo(13.33, 1);
  });

  it("detects above upper band", () => {
    const r = interpretBollinger(170, 160, 140);
    expect(r.position).toBe("above");
  });

  it("detects below lower band", () => {
    const r = interpretBollinger(130, 160, 140);
    expect(r.position).toBe("below");
  });

  it("returns unknown when bands are equal", () => {
    const r = interpretBollinger(150, 150, 150);
    expect(r.position).toBe("unknown");
    expect(r.bandwidth).toBeNull();
  });
});
