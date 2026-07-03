import { describe, expect, it } from "vitest";
import { calculateIndicators } from "./webgpuCalculator";

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

describe("calculateIndicators (CPU fallback)", () => {
  it("returns nulls for insufficient data (< 50)", async () => {
    const prices = new Float32Array([100, 101, 102]);
    const result = await calculateIndicators(prices);
    expect(result.sma20).toBeNull();
    expect(result.sma50).toBeNull();
    expect(result.rsi14).toBeNull();
    expect(result.macd).toBeNull();
    expect(result.macdSignal).toBeNull();
  });

  it("computes SMA-20 for valid data", async () => {
    const prices = generatePrices(60, 100);
    const result = await calculateIndicators(prices);

    expect(result.sma20).not.toBeNull();
    expect(result.sma20).toBeGreaterThan(0);
  });

  it("computes SMA-50 for valid data", async () => {
    const prices = generatePrices(100, 200);
    const result = await calculateIndicators(prices);

    expect(result.sma50).not.toBeNull();
    expect(result.sma50).toBeGreaterThan(0);
  });

  it("computes RSI-14 between 0 and 100", async () => {
    const prices = generatePrices(60, 100);
    const result = await calculateIndicators(prices);

    expect(result.rsi14).not.toBeNull();
    expect(result.rsi14).toBeGreaterThanOrEqual(0);
    expect(result.rsi14).toBeLessThanOrEqual(100);
  });

  it("computes MACD and signal line", async () => {
    const prices = generatePrices(60, 100);
    const result = await calculateIndicators(prices);

    expect(result.macd).not.toBeNull();
    expect(result.macdSignal).not.toBeNull();
  });

  it("returns RSI=100 when only gains", async () => {
    const prices = new Float32Array(60);
    for (let i = 0; i < 60; i++) prices[i] = 100 + i;

    const result = await calculateIndicators(prices);
    expect(result.rsi14).toBe(100);
  });

  it("returns RSI=0 when only losses", async () => {
    const prices = new Float32Array(60);
    for (let i = 0; i < 60; i++) prices[i] = 200 - i;

    const result = await calculateIndicators(prices);
    expect(result.rsi14).toBe(0);
  });

  it("SMA equals price for constant series", async () => {
    const prices = new Float32Array(100);
    prices.fill(150);

    const result = await calculateIndicators(prices);
    expect(result.sma20).toBe(150);
    expect(result.sma50).toBe(150);
  });

  it("MACD near zero for constant price", async () => {
    const prices = new Float32Array(60);
    prices.fill(150);

    const result = await calculateIndicators(prices);
    expect(result.macd).toBeCloseTo(0, 1);
    expect(result.macdSignal).toBeCloseTo(0, 1);
  });
});
