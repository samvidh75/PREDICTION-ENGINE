/**
 * Percentile Engine Tests — RC-ENGINE-004
 */
import { describe, it, expect } from 'vitest';
import { PercentileEngine } from '../scoring/PercentileEngine';
import { SectorPercentileEngine } from '../scoring/SectorPercentileEngine';
import { SectorDistributionEngine } from '../analytics/SectorDistributionEngine';

describe('PercentileEngine', () => {
  it('builds distribution from values', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const dist = PercentileEngine.buildDistribution(values);
    expect(dist.count).toBe(10);
    expect(dist.mean).toBeCloseTo(5.5);
    expect(dist.percentiles.p50).toBeCloseTo(5);
    expect(dist.percentiles.p90).toBeCloseTo(9);
  });

  it('computes percentile rank correctly', () => {
    const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const dist = PercentileEngine.buildDistribution(values);

    expect(PercentileEngine.percentileRank(30, dist)).toBeCloseTo(0.3);
    expect(PercentileEngine.percentileRank(50, dist)).toBeCloseTo(0.5);
    expect(PercentileEngine.percentileRank(90, dist)).toBeCloseTo(0.9);
    expect(PercentileEngine.percentileRank(100, dist)).toBe(1.0);
  });

  it('scores by percentile with standard map', () => {
    const values = Array.from({ length: 100 }, (_, i) => i + 1); // 1-100
    const dist = PercentileEngine.buildDistribution(values);

    // Value 95 = 95th percentile → should get P90 score (95)
    expect(PercentileEngine.scoreByPercentile(95, dist)).toBe(95);

    // Value 50 = 50th percentile → P50 score (65)
    expect(PercentileEngine.scoreByPercentile(50, dist)).toBe(65);

    // Value 10 = 10th percentile → P10 score (30)
    expect(PercentileEngine.scoreByPercentile(10, dist)).toBe(30);

    // Value 1 = below 10th → below score (15)
    expect(PercentileEngine.scoreByPercentile(1, dist)).toBe(15);
  });

  it('scores inverse correctly (lower is better)', () => {
    const values = [10, 20, 30, 40, 50]; // PE ratios (5 values)
    const dist = PercentileEngine.buildDistribution(values);

    // PE 10 = lowest (P20) — inverted = P80 → P75 band → 85
    expect(PercentileEngine.scoreByPercentileInverse(10, dist)).toBe(85);

    // PE 50 = highest (P100) — inverted = P0 → below band → 15
    expect(PercentileEngine.scoreByPercentileInverse(50, dist)).toBe(15);

    // PE 30 = median (P60) — inverted = P40 → P25-P50 band → 65
    expect(PercentileEngine.scoreByPercentileInverse(30, dist)).toBe(65);
  });

  it('computes z-score', () => {
    const values = [8, 10, 12]; // mean=10, stdDev~1.63
    const dist = PercentileEngine.buildDistribution(values);

    const z = PercentileEngine.zScore(12, dist);
    expect(z).toBeGreaterThan(0); // above mean
  });

  it('returns 50 for null values', () => {
    const values = [1, 2, 3];
    const dist = PercentileEngine.buildDistribution(values);
    expect(PercentileEngine.scoreByPercentile(null, dist)).toBe(50);
    expect(PercentileEngine.scoreByPercentile(undefined, dist)).toBe(50);
  });

  it('handles empty distribution gracefully', () => {
    const dist = PercentileEngine.buildDistribution([]);
    expect(dist.count).toBe(0);
    expect(PercentileEngine.scoreByPercentile(10, dist)).toBe(50);
  });
});

describe('SectorPercentileEngine with SectorDistributionEngine', () => {
  // Initialise distributions before tests
  SectorDistributionEngine.initialise();

  it('registers banking distributions correctly', () => {
    const dist = SectorPercentileEngine.getDistribution('BANKING', 'roe');
    expect(dist).toBeDefined();
    expect(dist!.count).toBeGreaterThan(0);
  });

  it('scores HDFC Bank ROE against banking peers', () => {
    // HDFC Bank ROE ~15% — should be around P75 for banking
    const score = SectorPercentileEngine.score(0.15, 'banking', 'roe');
    expect(score).toBeGreaterThanOrEqual(65); // at least P50
    expect(score).toBeLessThanOrEqual(95);
  });

  it('scores Infosys PE correctly in IT sector', () => {
    // INFY PE 22 in IT sector (median PE 25) — should be around P50-P75 (lower PE = better)
    const score = SectorPercentileEngine.score(22, 'IT', 'peRatio');
    expect(score).toBeGreaterThanOrEqual(45); // around P50-P75 inverted
    expect(score).toBeLessThanOrEqual(95);
  });

  it('scores FMCG PE 55 fairly (not penalised)', () => {
    // FMCG PE 55 — sector median 45, P90 = 65 — PE 55 is above median but not extreme
    const score = SectorPercentileEngine.score(55, 'fmcg', 'peRatio');
    // Inverse: PE 55 → rank ~65% → inverted rank ~35% → P25-P50 band → score 45-65
    expect(score).toBeGreaterThanOrEqual(30);
    expect(score).toBeLessThanOrEqual(75);
  });

  it('returns neutral 50 for unknown sector', () => {
    const score = SectorPercentileEngine.score(0.15, 'aerospace', 'roe');
    expect(score).toBe(50);
  });

  it('returns neutral 50 when peer count insufficient', () => {
    // No distribution registered for this sector
    expect(SectorPercentileEngine.hasSufficientData('aerospace', 'roe')).toBe(false);
  });

  it('ranks a value correctly', () => {
    // ROE 12% in banking — banking ROE median 11%, so ~P55
    const rank = SectorPercentileEngine.rank(0.12, 'banking', 'roe');
    expect(rank).toBeGreaterThanOrEqual(0.45);
    expect(rank).toBeLessThanOrEqual(0.70);
  });

  it('peer count returns reasonable values for initialised sectors', () => {
    const count = SectorPercentileEngine.getPeerCount('banking');
    expect(count).toBe(100); // reference data uses 100 as approximate peer count
  });
});

describe('SectorDistributionEngine', () => {
  it('initialises all 7 sectors without error', () => {
    expect(() => SectorDistributionEngine.initialise()).not.toThrow();
  });

  it('has reference data for all metrics in Banking', () => {
    const ref = SectorDistributionEngine.getReference('BANKING', 'roe');
    expect(ref).toBeDefined();
    expect(ref!.p50).toBeGreaterThan(0);
    expect(ref!.p90).toBeGreaterThan(ref!.p50);
  });

  it('FMCG PE reference is appropriately high', () => {
    const ref = SectorDistributionEngine.getReference('FMCG', 'peRatio');
    expect(ref).toBeDefined();
    expect(ref!.p50).toBeGreaterThan(40); // FMCG median PE should be high
  });

  it('IT D/E is appropriately low', () => {
    const ref = SectorDistributionEngine.getReference('IT', 'debtToEquity');
    expect(ref).toBeDefined();
    expect(ref!.p90).toBeLessThan(1.0); // IT rarely has high D/E
  });
});
