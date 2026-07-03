import { describe, expect, it } from 'vitest';
import { RegimeDetector } from '../RegimeDetector.js';

describe('RegimeDetector', () => {
  it('detects bull steady regime', () => {
    const detector = new RegimeDetector();
    const returns = Array.from({ length: 252 }, (_, i) => 0.001 + Math.sin(i * 0.01) * 0.0005);
    const result = detector.detect(returns);
    expect(result.trend).toBe('bullish');
    expect(result.regime).toBe('bull_steady');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('detects bear volatile regime with negative returns', () => {
    const detector = new RegimeDetector();
    const returns = Array.from({ length: 252 }, () => -0.003 + Math.random() * 0.002);
    const result = detector.detect(returns);
    expect(result.trend).toBe('bearish');
  });

  it('returns fallback with insufficient data', () => {
    const detector = new RegimeDetector();
    const result = detector.detect([0.01], 10);
    expect(result.regime).toBe('sideways_low_vol');
    expect(result.confidence).toBe(0);
  });

  it('estimates duration of current trend', () => {
    const detector = new RegimeDetector();
    const returns = [
      ...Array.from({ length: 30 }, () => 0.002),
      ...Array.from({ length: 33 }, () => -0.001),
    ];
    const result = detector.detect(returns);
    expect(result.duration).toBeGreaterThan(0);
  });

  it('computes valid transition probabilities', () => {
    const detector = new RegimeDetector();
    const returns = Array.from({ length: 252 }, () => 0.001);
    const result = detector.detect(returns);
    const totalProb = Object.values(result.transitionProbability).reduce((a, b) => a + b, 0);
    expect(totalProb).toBeCloseTo(1, 1);
  });
});
