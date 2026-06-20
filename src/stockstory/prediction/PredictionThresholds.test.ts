import { describe, it, expect } from 'vitest';
import { PREDICTION_THRESHOLDS, classifyScore } from './PredictionThresholds';

describe('PredictionThresholds', () => {
  it('should have correct threshold values', () => {
    expect(PREDICTION_THRESHOLDS.EXCELLENT).toBe(80);
    expect(PREDICTION_THRESHOLDS.HEALTHY).toBe(65);
    expect(PREDICTION_THRESHOLDS.STABLE).toBe(50);
    expect(PREDICTION_THRESHOLDS.WEAKENING).toBe(35);
  });

  it('should map score to correct classification label', () => {
    expect(classifyScore(85)).toBe('Excellent');
    expect(classifyScore(80)).toBe('Excellent');
    expect(classifyScore(79)).toBe('Healthy');
    expect(classifyScore(65)).toBe('Healthy');
    expect(classifyScore(64)).toBe('Stable');
    expect(classifyScore(50)).toBe('Stable');
    expect(classifyScore(49)).toBe('Weakening');
    expect(classifyScore(35)).toBe('Weakening');
    expect(classifyScore(34)).toBe('At Risk');
    expect(classifyScore(0)).toBe('At Risk');
    expect(classifyScore(null)).toBe('At Risk');
  });
});
