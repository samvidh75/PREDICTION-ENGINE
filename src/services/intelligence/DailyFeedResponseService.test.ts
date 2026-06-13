import { describe, expect, it } from 'vitest';
import { predictionRegistryLineage } from './DailyFeedResponseService';

describe('predictionRegistryLineage', () => {
  it('reports prediction_registry as the Daily Feed source table', () => {
    expect(predictionRegistryLineage('2026-06-13')).toEqual([
      expect.objectContaining({
        sourceTable: 'prediction_registry',
        sourceField: null,
        provider: null,
        asOf: '2026-06-13',
        isFallback: false,
        isSynthetic: false,
      }),
    ]);
  });

  it('keeps an unavailable as-of date explicit', () => {
    expect(predictionRegistryLineage(null)).toEqual([
      expect.objectContaining({
        sourceTable: 'prediction_registry',
        asOf: undefined,
        isFallback: false,
        isSynthetic: false,
      }),
    ]);
  });
});
