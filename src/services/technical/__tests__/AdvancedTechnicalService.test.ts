import { describe, it, expect } from 'vitest';
import { AdvancedTechnicalService } from '../AdvancedTechnicalService';

const service = new AdvancedTechnicalService();

function makePriceData(length: number): { prices: number[]; volumes: number[]; highs: number[]; lows: number[] } {
  const prices: number[] = [];
  const volumes: number[] = [];
  const highs: number[] = [];
  const lows: number[] = [];
  let price = 100;
  for (let i = 0; i < length; i++) {
    price += (Math.random() - 0.45) * 3;
    prices.push(Math.max(1, price));
    volumes.push(1000000 + Math.random() * 500000);
    highs.push(price + Math.random() * 2);
    lows.push(price - Math.random() * 2);
  }
  return { prices, volumes, highs, lows };
}

describe('AdvancedTechnicalService', () => {
  it('should compute RSI', () => {
    const { prices, volumes, highs, lows } = makePriceData(100);
    const result = service.computeAll(prices, volumes, highs, lows);
    expect(result.rsi).toBeGreaterThanOrEqual(0);
    expect(result.rsi).toBeLessThanOrEqual(100);
  });

  it('should compute RSI exactly 100 when no losses', () => {
    const prices = Array.from({ length: 20 }, (_, i) => 100 + i);
    const volumes = prices.map(() => 1000000);
    const highs = prices.map(p => p + 1);
    const lows = prices.map(p => p - 1);
    const result = service.computeAll(prices, volumes, highs, lows);
    expect(result.rsi).toBe(100);
  });

  it('should compute MACD', () => {
    const { prices, volumes, highs, lows } = makePriceData(100);
    const result = service.computeAll(prices, volumes, highs, lows);
    expect(typeof result.macd).toBe('number');
    expect(typeof result.macdSignal).toBe('number');
    expect(typeof result.macdHistogram).toBe('number');
  });

  it('should compute Bollinger Bands', () => {
    const { prices, volumes, highs, lows } = makePriceData(100);
    const result = service.computeAll(prices, volumes, highs, lows);
    expect(result.bollingerUpper).toBeGreaterThan(result.bollingerMiddle);
    expect(result.bollingerLower).toBeLessThan(result.bollingerMiddle);
    expect(result.bollingerWidth).toBeGreaterThan(0);
  });

  it('should compute SMAs', () => {
    const { prices, volumes, highs, lows } = makePriceData(250);
    const result = service.computeAll(prices, volumes, highs, lows);
    expect(result.sma20).toBeGreaterThan(0);
    expect(result.sma50).toBeGreaterThan(0);
    if (prices.length >= 200) {
      expect(result.sma200).toBeGreaterThan(0);
    }
  });

  it('should compute EMAs', () => {
    const { prices, volumes, highs, lows } = makePriceData(100);
    const result = service.computeAll(prices, volumes, highs, lows);
    expect(result.ema12).toBeGreaterThan(0);
    expect(result.ema26).toBeGreaterThan(0);
  });

  it('should compute ATR', () => {
    const { prices, volumes, highs, lows } = makePriceData(100);
    const result = service.computeAll(prices, volumes, highs, lows);
    expect(result.atr).toBeGreaterThan(0);
  });

  it('should compute support and resistance', () => {
    const { prices, volumes, highs, lows } = makePriceData(100);
    const result = service.computeAll(prices, volumes, highs, lows);
    expect(result.support).toBeLessThanOrEqual(result.resistance);
  });

  it('should compute OBV', () => {
    const { prices, volumes, highs, lows } = makePriceData(100);
    const result = service.computeAll(prices, volumes, highs, lows);
    expect(typeof result.obv).toBe('number');
  });

  it('should compute CCI', () => {
    const { prices, volumes, highs, lows } = makePriceData(100);
    const result = service.computeAll(prices, volumes, highs, lows);
    expect(typeof result.cci).toBe('number');
  });

  it('should compute Stochastic', () => {
    const { prices, volumes, highs, lows } = makePriceData(100);
    const result = service.computeAll(prices, volumes, highs, lows);
    expect(result.stochK).toBeGreaterThanOrEqual(0);
    expect(result.stochK).toBeLessThanOrEqual(100);
    expect(result.stochD).toBeGreaterThanOrEqual(0);
    expect(result.stochD).toBeLessThanOrEqual(100);
  });

  it('should computeWilliamsR', () => {
    const { prices, volumes, highs, lows } = makePriceData(100);
    const result = service.computeAll(prices, volumes, highs, lows);
    expect(result.williamsR).toBeLessThanOrEqual(0);
    expect(result.williamsR).toBeGreaterThanOrEqual(-100);
  });

  it('should compute ADX', () => {
    const { prices, volumes, highs, lows } = makePriceData(100);
    const result = service.computeAll(prices, volumes, highs, lows);
    expect(result.adx).toBeGreaterThanOrEqual(0);
    expect(result.adx).toBeLessThanOrEqual(100);
  });

  it('should generate buy/sell signals', () => {
    const { prices, volumes, highs, lows } = makePriceData(100);
    const indicators = service.computeAll(prices, volumes, highs, lows);
    const signals = service.computeSignals(indicators);
    expect(['buy', 'sell', 'neutral']).toContain(signals.signal);
    expect(signals.strength).toBeGreaterThanOrEqual(0);
    expect(signals.reasons.length).toBeGreaterThan(0);
  });

  it('should return oversold buy signal for extremely low RSI', () => {
    const prices = Array.from({ length: 100 }, (_, i) => 100 - i * 0.5);
    const volumes = prices.map(() => 1000000);
    const highs = prices.map(p => p + 1);
    const lows = prices.map(p => p - 1);
    const indicators = service.computeAll(prices, volumes, highs, lows);
    const signals = service.computeSignals(indicators);
    if (indicators.rsi < 30) {
      expect(signals.reasons.some(r => r.includes('RSI oversold'))).toBe(true);
    }
  });

  it('should compute average volume', () => {
    const { prices, volumes, highs, lows } = makePriceData(100);
    const result = service.computeAll(prices, volumes, highs, lows);
    expect(result.avgVolume20).toBeGreaterThan(0);
    expect(result.volumeRatio).toBeGreaterThan(0);
  });

  it('should return 100 RSI for constant price (no losses)', () => {
    const prices = Array.from({ length: 20 }, () => 100);
    const volumes = prices.map(() => 1000000);
    const highs = prices.map(p => p + 1);
    const lows = prices.map(p => p - 1);
    const result = service.computeAll(prices, volumes, highs, lows);
    expect(result.rsi).toBe(100);
  });
});
