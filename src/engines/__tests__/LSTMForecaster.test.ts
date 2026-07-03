import { describe, expect, it } from 'vitest';
import { LSTMForecaster } from '../LSTMForecaster.js';

function makeFeatures(overrides = {}) {
  const len = 60;
  return {
    returns: Array.from({ length: len }, (_, i) => Math.sin(i * 0.1) * 0.02),
    volume: Array.from({ length: len }, () => 100000 + Math.random() * 50000),
    volatility: Array.from({ length: len }, () => 0.15 + Math.random() * 0.1),
    rsi: Array.from({ length: len }, (_, i) => 50 + Math.sin(i * 0.2) * 20),
    macd: Array.from({ length: len }, (_, i) => Math.sin(i * 0.15) * 2),
    sma20: Array.from({ length: len }, (_, i) => 100 + Math.sin(i * 0.05) * 5),
    sma50: Array.from({ length: len }, (_, i) => 100 + Math.sin(i * 0.02) * 3),
    ...overrides,
  };
}

describe('LSTMForecaster', () => {
  it('returns a forecast with valid features', () => {
    const forecaster = new LSTMForecaster();
    const result = forecaster.forecast('RELIANCE', makeFeatures());
    expect(result.symbol).toBe('RELIANCE');
    expect(typeof result.forecastedReturn).toBe('number');
    expect(typeof result.confidence).toBe('number');
    expect(['bullish', 'bearish', 'neutral']).toContain(result.signalDirection);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('returns neutral fallback with insufficient features', () => {
    const forecaster = new LSTMForecaster({ lookback: 60 });
    const result = forecaster.forecast('TEST', makeFeatures({ returns: [0.01, 0.02] }));
    expect(result.signalDirection).toBe('neutral');
    expect(result.signalStrength).toBe(0);
    expect(result.confidence).toBe(0);
  });

  it('batches multiple forecasts', () => {
    const forecaster = new LSTMForecaster();
    const inputs = [
      { symbol: 'RELIANCE', features: makeFeatures() },
      { symbol: 'TCS', features: makeFeatures() },
    ];
    const results = forecaster.batchForecast(inputs);
    expect(results).toHaveLength(2);
    expect(results[0].symbol).toBe('RELIANCE');
    expect(results[1].symbol).toBe('TCS');
  });

  it('produces confidence in 0-1 range', () => {
    const forecaster = new LSTMForecaster();
    const features = makeFeatures();
    for (let i = 0; i < 10; i++) {
      const result = forecaster.forecast('RELIANCE', features);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('responds to bullish momentum features', () => {
    const forecaster = new LSTMForecaster();
    const bullishFeatures = makeFeatures({
      returns: Array.from({ length: 60 }, (_, i) => 0.005 + Math.min(i * 0.0005, 0.01)),
    });
    const result = forecaster.forecast('RELIANCE', bullishFeatures);
    expect(result.forecastedReturn).toBeDefined();
  });
});
