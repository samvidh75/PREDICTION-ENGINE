import { describe, it, expect } from 'vitest';
import { technicalEngine } from '../engines/TechnicalEngine';
import { TechnicalMetrics } from '../types';

function makeBaseMetrics(overrides: Partial<TechnicalMetrics> = {}): TechnicalMetrics {
  return {
    currentPrice: 3500,
    ma50: 3400,
    ma200: 3000,
    rsi: 55,
    macd: 25,
    macdSignal: 15,
    macdHistogram: 10,
    priceChange1W: 2.5,
    priceChange1M: 5.0,
    priceChange3M: 12.0,
    priceChange6M: 20.0,
    priceChange1Y: 35.0,
    volatility30: 22.0,
    beta: 0.9,
    atr: 45.0,
    volume: 1_500_000,
    avgVolume: 1_200_000,
    volumeRatio: 1.25,
    lastUpdated: new Date('2025-01-15'),
    period: '1D',
    ...overrides,
  };
}

describe('TechnicalEngine', () => {
  it('should score a strong uptrend stock above 75', () => {
    const metrics = makeBaseMetrics();
    const result = technicalEngine.analyze(metrics);

    expect(result.overall).toBeGreaterThanOrEqual(75);
    expect(result.direction).toBe('bullish');
    expect(result.trend).toBe('uptrend');
    expect(result.momentumStatus).toBe('strong');
    expect(result.confidence).toBeGreaterThan(0.7);
    expect(result.reasoning).toContain('₹3500');
  });

  it('should score a weak downtrend stock below 25', () => {
    const metrics = makeBaseMetrics({
      currentPrice: 2700,
      ma50: 3000,
      ma200: 3200,
      rsi: 28,
      macd: -30,
      macdSignal: -20,
      macdHistogram: -10,
      priceChange1W: -3.0,
      priceChange1M: -8.0,
      priceChange3M: -15.0,
      priceChange6M: -22.0,
      priceChange1Y: -30.0,
      volatility30: 55.0,
      beta: 1.6,
    });

    const result = technicalEngine.analyze(metrics);

    expect(result.overall).toBeLessThanOrEqual(25);
    expect(result.direction).toBe('bearish');
    expect(result.trend).toBe('downtrend');
    expect(result.momentumStatus).toBe('weak');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('should score a neutral stock in 30-70 range', () => {
    const metrics = makeBaseMetrics({
      currentPrice: 3200,
      ma50: 3250,
      ma200: 3100,
      rsi: 48,
      macd: 2,
      macdSignal: 0,
      macdHistogram: 2,
      priceChange1W: 0.5,
      priceChange1M: -1.0,
      priceChange3M: 3.0,
      priceChange6M: 5.0,
      priceChange1Y: 8.0,
      volatility30: 30.0,
      beta: 1.05,
    });

    const result = technicalEngine.analyze(metrics);

    expect(result.overall).toBeGreaterThanOrEqual(30);
    expect(result.overall).toBeLessThanOrEqual(70);
    // Neutral direction possible
    expect(['bullish', 'neutral', 'bearish']).toContain(result.direction);
  });

  it('should order TCS, INFY, RELIANCE by descending technical score', () => {
    const tcs: TechnicalMetrics = makeBaseMetrics({
      currentPrice: 3500, ma50: 3400, ma200: 3000,
      rsi: 58, macd: 30, macdSignal: 18, macdHistogram: 12,
      priceChange1M: 6.0, priceChange3M: 14.0, priceChange6M: 25.0, priceChange1Y: 40.0,
      volatility30: 20.0, beta: 0.85,
    });
    const infy: TechnicalMetrics = makeBaseMetrics({
      currentPrice: 1600, ma50: 1550, ma200: 1450,
      rsi: 65, macd: 10, macdSignal: 8, macdHistogram: 2,
      priceChange1W: 0.5, priceChange1M: 2.0, priceChange3M: 5.0, priceChange6M: 12.0, priceChange1Y: 18.0,
      volatility30: 30.0, beta: 0.95,
    });
    const reliance: TechnicalMetrics = makeBaseMetrics({
      currentPrice: 2500, ma50: 2550, ma200: 2400,
      rsi: 45, macd: -5, macdSignal: 0, macdHistogram: -5,
      priceChange1M: -2.0, priceChange3M: 1.0, priceChange6M: 4.0, priceChange1Y: 10.0,
      volatility30: 35.0, beta: 1.2,
    });

    const tcsResult = technicalEngine.analyze(tcs);
    const infyResult = technicalEngine.analyze(infy);
    const relianceResult = technicalEngine.analyze(reliance);

    expect(tcsResult.overall).toBeGreaterThan(infyResult.overall);
    expect(infyResult.overall).toBeGreaterThan(relianceResult.overall);
    expect(tcsResult.direction).toBe('bullish');
  });

  it('should have dataCompleteness of exactly 1 with all fields', () => {
    const metrics = makeBaseMetrics();
    const result = technicalEngine.analyze(metrics);
    expect(result.dataCompleteness).toBe(1.0);
  });

  it('should handle minimal data gracefully', () => {
    const minimal = makeBaseMetrics();
    // zero out optional fields
    delete minimal.ma50;
    delete minimal.ma200;
    delete minimal.rsi;
    delete minimal.macd;
    delete minimal.macdSignal;
    delete minimal.macdHistogram;
    delete minimal.priceChange1W;
    delete minimal.priceChange1M;
    delete minimal.priceChange3M;
    delete minimal.priceChange6M;
    delete minimal.priceChange1Y;
    delete minimal.volatility30;
    delete minimal.beta;
    delete minimal.volumeRatio;

    const result = technicalEngine.analyze(minimal);
    expect(result.dataCompleteness).toBeLessThan(0.5);
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
  });
});
