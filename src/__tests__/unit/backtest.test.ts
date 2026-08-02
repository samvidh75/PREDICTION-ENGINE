import { WalkForwardValidator } from '../../services/backtest/WalkForwardValidator';
import { computeMetrics, pricesToReturns } from '../../services/backtest/PerformanceMetrics';
import { BacktestBar } from '../../services/backtest/types';

// Note: MonteCarloSimulator and RegimeDetector standalones used to live here
// too, but src/engines/{MonteCarloSimulator,RegimeDetector}.ts are the real
// versions (richer regime taxonomy, richer MC output). Rather than maintain
// duplicates, MonteCarloSimulator's real bug (declared `seed` config was
// silently ignored, using raw Math.random() every time) was fixed in place —
// see src/engines/__tests__/{MonteCarloSimulator,RegimeDetector}.test.ts.

function makeBars(closes: number[]): BacktestBar[] {
  return closes.map((close, i) => ({
    date: `2024-01-${String((i % 28) + 1).padStart(2, '0')}-${Math.floor(i / 28)}`,
    close,
  }));
}

describe('PerformanceMetrics', () => {
  it('computes max drawdown on a known series', () => {
    // 100 -> 110 -> 88 -> 99: peak 110, trough 88 => 20% drawdown
    const returns = pricesToReturns([100, 110, 88, 99]);
    const metrics = computeMetrics(returns);
    expect(metrics.maxDrawdownPct).toBeCloseTo(20, 6);
  });

  it('total return matches compounded growth', () => {
    const metrics = computeMetrics([0.1, 0.1]);
    expect(metrics.totalReturnPct).toBeCloseTo(21, 8); // 1.1 * 1.1 = 1.21
  });

  it('win rate counts positive periods', () => {
    const metrics = computeMetrics([0.01, -0.01, 0.02, -0.02]);
    expect(metrics.winRate).toBe(0.5);
  });

  it('handles empty input and rejects NaN', () => {
    expect(computeMetrics([]).numPeriods).toBe(0);
    expect(() => computeMetrics([0.01, NaN])).toThrow();
  });
});

describe('WalkForwardValidator', () => {
  it('never leaks test data into training (anti-lookahead)', () => {
    const closes = Array.from({ length: 400 }, (_, i) => 100 + i * 0.1);
    const bars = makeBars(closes);
    const seenLengths: number[] = [];
    const validator = new WalkForwardValidator({ trainWindowDays: 252, testWindowDays: 63, stepDays: 21 });
    validator.validate(bars, trainReturns => {
      seenLengths.push(trainReturns.length);
      return 1;
    });
    // Strategy only ever sees exactly the training window
    expect(seenLengths.every(len => len === 252)).toBe(true);
    expect(seenLengths.length).toBeGreaterThan(0);
  });

  it('fully-invested strategy on rising market yields positive OOS return', () => {
    const closes = Array.from({ length: 400 }, (_, i) => 100 * Math.pow(1.001, i));
    const result = new WalkForwardValidator({
      trainWindowDays: 252,
      testWindowDays: 63,
      stepDays: 63,
    }).validate(makeBars(closes), () => 1);
    expect(result.aggregateOutOfSample.totalReturnPct).toBeGreaterThan(0);
    expect(result.equityCurve.length).toBeGreaterThan(0);
  });

  it('cash strategy has zero return except costs', () => {
    const closes = Array.from({ length: 350 }, (_, i) => 100 + Math.sin(i) * 5);
    const result = new WalkForwardValidator({
      trainWindowDays: 252,
      testWindowDays: 63,
      stepDays: 63,
    }).validate(makeBars(closes), () => 0);
    expect(result.aggregateOutOfSample.totalReturnPct).toBeCloseTo(0, 6);
  });

  it('clamps out-of-range and non-finite exposures', () => {
    const closes = Array.from({ length: 350 }, (_, i) => 100 + i * 0.05);
    const validator = new WalkForwardValidator({ trainWindowDays: 252, testWindowDays: 63, stepDays: 63 });
    // Exposure 5 must be clamped to 1; NaN clamped to 0 — both must not throw
    expect(() => validator.validate(makeBars(closes), () => 5)).not.toThrow();
    expect(() => validator.validate(makeBars(closes), () => NaN)).not.toThrow();
  });

  it('rejects insufficient data', () => {
    const validator = new WalkForwardValidator({ trainWindowDays: 252, testWindowDays: 63, stepDays: 21 });
    expect(() => validator.validate(makeBars([100, 101]), () => 1)).toThrow();
  });
});

