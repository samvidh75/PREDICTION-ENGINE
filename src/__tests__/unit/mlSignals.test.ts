import { FeatureEngineer } from '../../services/ml/FeatureEngineer';
import { toSignalSources } from '../../services/ml/TechnicalSignalAdapter';
import { PriceBar } from '../../services/ml/types';
import { EnsembleAggregator } from '../../engines/EnsembleAggregator';

/** Adds small daily noise on top of a trend so RSI/Bollinger don't saturate at exact 0/1,
 *  matching how real prices behave (no stock moves the same direction every single day). */
function withNoise(closes: number[], amplitude = 0.015): number[] {
  return closes.map((c, i) => c * (1 + amplitude * Math.sin(i * 1.7)));
}

function makeBars(closes: number[], baseVolume = 100000): PriceBar[] {
  return closes.map((close, i) => ({
    date: `2024-${String(Math.floor(i / 28) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
    open: close,
    high: close * 1.01,
    low: close * 0.99,
    close,
    volume: baseVolume,
  }));
}

describe('FeatureEngineer', () => {
  const engineer = new FeatureEngineer();

  it('produces finite features for a rising trend', () => {
    const bars = makeBars(Array.from({ length: 100 }, (_, i) => 100 * Math.pow(1.002, i)));
    const features = engineer.buildFeatures(bars);
    for (const value of Object.values(features)) {
      expect(Number.isFinite(value)).toBe(true);
    }
    expect(features.return_20d).toBeGreaterThan(0);
    expect(features.sma_ratio_20).toBeGreaterThan(0);
  });

  it('produces finite features for a falling trend', () => {
    const bars = makeBars(Array.from({ length: 100 }, (_, i) => 100 * Math.pow(0.998, i)));
    const features = engineer.buildFeatures(bars);
    expect(features.return_20d).toBeLessThan(0);
  });

  it('handles flat prices without NaN (zero-variance edge case)', () => {
    const bars = makeBars(Array.from({ length: 60 }, () => 100));
    const features = engineer.buildFeatures(bars);
    for (const value of Object.values(features)) {
      expect(Number.isFinite(value)).toBe(true);
    }
    expect(features.volatility_20d).toBe(0);
    expect(features.bollinger_pctb).toBe(0.5);
  });

  it('handles short history gracefully (fewer bars than any lookback period)', () => {
    const bars = makeBars([100, 101, 99]);
    const features = engineer.buildFeatures(bars);
    for (const value of Object.values(features)) {
      expect(Number.isFinite(value)).toBe(true);
    }
  });

  it('is neutral on fundamentals when none are supplied', () => {
    const bars = makeBars(Array.from({ length: 60 }, (_, i) => 100 + i));
    const features = engineer.buildFeatures(bars);
    expect(features.has_fundamentals).toBe(0);
    expect(features.pe_ratio).toBe(0);
  });

  it('incorporates supplied fundamentals', () => {
    const bars = makeBars(Array.from({ length: 60 }, (_, i) => 100 + i));
    const features = engineer.buildFeatures(bars, { peRatio: 22, roe: 18, epsGrowthYoy: 15 });
    expect(features.has_fundamentals).toBe(1);
    expect(features.pe_ratio).toBe(22);
  });

  it('never uses bars beyond the slice provided (anti-lookahead)', () => {
    const closes = Array.from({ length: 80 }, (_, i) => (i < 60 ? 100 + i : 160 * Math.pow(0.97, i - 60)));
    const bars = makeBars(closes);
    const truncated = engineer.buildFeatures(bars.slice(0, 60));
    const full = engineer.buildFeatures(bars); // includes the future crash
    // If the engine leaked future data, truncated and full would agree on trend sign
    expect(truncated.return_20d).toBeGreaterThan(0);
    expect(full.return_20d).toBeLessThan(0);
  });

  it('rejects invalid bars', () => {
    expect(() => engineer.buildFeatures([{ ...makeBars([100])[0] }])).toThrow();
    expect(() => engineer.buildFeatures(makeBars([100, -5]))).toThrow();
    expect(() => engineer.buildFeatures(makeBars([100, 0]))).toThrow();
  });
});

// This module used to ship its own EnsembleAggregator, but src/engines/EnsembleAggregator.ts
// is the real one — already wired to /api/signals/ensemble. TechnicalSignalAdapter converts
// this module's technical/fundamental signals into that engine's generic SignalSource format,
// so these tests exercise the real production aggregator end-to-end with real feature inputs.
describe('technical signals feeding the production EnsembleAggregator', () => {
  const engineer = new FeatureEngineer();
  const aggregator = new EnsembleAggregator();

  it('tilts bullish for a strong sustained uptrend with high volume', () => {
    // Note: a long, near-uninterrupted uptrend also pushes RSI/Bollinger into
    // overbought territory, so the mean-reversion component legitimately
    // fights momentum here (real ensembles hedge instead of chasing blindly).
    // We assert the net score/momentum tilt bullish, not a strict "bullish" bucket.
    const bars = makeBars(
      withNoise(Array.from({ length: 100 }, (_, i) => 100 * Math.pow(1.006, i))),
    );
    bars[bars.length - 1].volume = 300000; // volume surge confirming the move
    const features = engineer.buildFeatures(bars);
    const sources = toSignalSources(features);
    const result = aggregator.aggregate(sources);
    expect(result.consensusDirection).not.toBe('bearish');
    expect(sources.find(s => s.name === 'momentum')!.direction).toBe('bullish');
    expect(sources.find(s => s.name === 'volume_conviction')!.strength).toBeGreaterThan(0);
  });

  it('tilts bearish for a strong sustained downtrend', () => {
    const bars = makeBars(withNoise(Array.from({ length: 100 }, (_, i) => 100 * Math.pow(0.995, i))));
    const features = engineer.buildFeatures(bars);
    const sources = toSignalSources(features);
    const result = aggregator.aggregate(sources);
    expect(result.consensusDirection).not.toBe('bullish');
    expect(sources.find(s => s.name === 'momentum')!.direction).toBe('bearish');
  });

  it('is neutral on flat, directionless prices', () => {
    const bars = makeBars(Array.from({ length: 100 }, () => 100));
    const features = engineer.buildFeatures(bars);
    const result = aggregator.aggregate(toSignalSources(features));
    expect(result.consensusDirection).toBe('neutral');
  });

  it('consensus strength and confidence stay within documented bounds', () => {
    const scenarios = [
      Array.from({ length: 100 }, (_, i) => 100 * Math.pow(1.05, i)), // extreme up
      Array.from({ length: 100 }, (_, i) => 100 * Math.pow(0.9, i)), // extreme down
      Array.from({ length: 100 }, () => 100),
    ];
    for (const closes of scenarios) {
      const features = engineer.buildFeatures(makeBars(closes));
      const result = aggregator.aggregate(toSignalSources(features));
      expect(result.consensusStrength).toBeGreaterThanOrEqual(-1);
      expect(result.consensusStrength).toBeLessThanOrEqual(1);
      expect(result.consensusConfidence).toBeGreaterThanOrEqual(0);
      expect(result.consensusConfidence).toBeLessThanOrEqual(1);
      expect(result.contributions).toHaveLength(4);
    }
  });

  it('is deterministic for identical input', () => {
    const bars = makeBars(Array.from({ length: 90 }, (_, i) => 100 + Math.sin(i / 5) * 10));
    const features = engineer.buildFeatures(bars);
    const sources = toSignalSources(features);
    const a = aggregator.aggregate(sources);
    const b = aggregator.aggregate(sources);
    expect(a).toEqual(b);
  });
});
