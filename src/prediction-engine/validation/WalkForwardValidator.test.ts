import { describe, it, expect } from 'vitest';
import { WalkForwardValidator, WalkForwardWindow } from './WalkForwardValidator';
import { UnifiedPredictionEngine } from '../UnifiedPredictionEngine';
import { UnifiedHorizon } from '../types';

describe('WalkForwardValidator', () => {
  const engine = new UnifiedPredictionEngine();

  const windows: WalkForwardWindow[] = [
    { trainStart: '2025-01-01', trainEnd: '2025-06-30', testStart: '2025-07-01', testEnd: '2025-09-30' },
    { trainStart: '2025-04-01', trainEnd: '2025-09-30', testStart: '2025-10-01', testEnd: '2025-12-31' },
  ];

  function makeHistory(dates: string[], horizon: UnifiedHorizon = 90) {
    return dates.map((date, i) => ({
      symbol: `SYM${i % 5}`,
      predictionDate: date,
      horizon,
      actualReturn: i % 2 === 0 ? 0.05 : -0.02,
    }));
  }

  it('produces valid results', async () => {
    const validator = new WalkForwardValidator(engine, windows);
    const history = makeHistory([
      '2025-07-15', '2025-08-10', '2025-09-05',
      '2025-10-15', '2025-11-20', '2025-12-10',
    ]);
    const results = await validator.validate(history);

    expect(results).toHaveLength(2);
    for (const r of results) {
      expect(r).toHaveProperty('window');
      expect(r).toHaveProperty('predictionCount');
      expect(r).toHaveProperty('hitRate');
      expect(r).toHaveProperty('symbolCount');
      expect(r).toHaveProperty('avgReturnByDecile');
      expect(r).toHaveProperty('avgConfidenceByDecile');
      expect(r).toHaveProperty('classificationAccuracy');
      expect(r).toHaveProperty('scoreStability');
      expect(r).toHaveProperty('missingDataImpact');
    }
  });

  it('hit rate calculation works', async () => {
    const validator = new WalkForwardValidator(engine, windows);
    const history = makeHistory(['2025-07-15', '2025-07-16', '2025-07-17', '2025-07-18'], 90);
    const results = await validator.validate(history);

    const hitRate = results[0].hitRate;
    expect(hitRate).toBeGreaterThanOrEqual(0);
    expect(hitRate).toBeLessThanOrEqual(1);
  });

  it('empty data returns graceful result', async () => {
    const validator = new WalkForwardValidator(engine, windows);
    const results = await validator.validate([]);

    for (const r of results) {
      expect(r.predictionCount).toBe(0);
      expect(r.symbolCount).toBe(0);
      expect(r.hitRate).toBe(0);
    }
  });

  it('handles null actual returns', async () => {
    const validator = new WalkForwardValidator(engine, windows);
    const history = [
      { symbol: 'ABC', predictionDate: '2025-07-15', horizon: 90 as UnifiedHorizon, actualReturn: null },
      { symbol: 'DEF', predictionDate: '2025-08-10', horizon: 90 as UnifiedHorizon, actualReturn: 0.03 },
    ];
    const results = await validator.validate(history);
    expect(results[0].predictionCount).toBe(2);
    expect(results[0].missingDataImpact).toBeGreaterThan(0);
  });
});
