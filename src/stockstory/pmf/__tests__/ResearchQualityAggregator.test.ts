import { describe, it, expect } from 'vitest';
import { ResearchQualityAggregator } from '../ResearchQualityAggregator';

describe('ResearchQualityAggregator', () => {
  const aggregator = new ResearchQualityAggregator();

  it('initializes with zero counts', () => {
    const result = aggregator.getAggregated();
    expect(result.totalFeedback).toBe(0);
    expect(result.positiveRate).toBe(0);
  });

  it('tracks positive feedback', () => {
    aggregator.aggregate({
      userId: 'user_1',
      timestamp: new Date().toISOString(),
      metricKey: 'pmf.research.quality_positive_rate',
      value: 1,
      dimensions: { symbol: 'RELIANCE', component: 'thesis', rating: '4' },
    });
    const result = aggregator.getAggregated();
    expect(result.totalFeedback).toBe(1);
    expect(result.positiveRate).toBeGreaterThan(0);
  });

  it('tracks negative feedback', () => {
    aggregator.aggregate({
      userId: 'user_1',
      timestamp: new Date().toISOString(),
      metricKey: 'pmf.research.feedback_count',
      value: 1,
      dimensions: { symbol: 'TCS', component: 'outlook', rating: '2' },
    });
    const result = aggregator.getAggregated();
    expect(result.totalFeedback).toBe(1);
  });

  it('aggregates by component', () => {
    const result = aggregator.getAggregated();
    expect(result.byComponent).toBeDefined();
    if (result.byComponent && result.byComponent.thesis) {
      expect(result.byComponent.thesis.total).toBeGreaterThan(0);
    }
  });

  it('aggregates by symbol', () => {
    const result = aggregator.getAggregated();
    expect(result.bySymbol).toBeDefined();
    expect(Object.keys(result.bySymbol).length).toBeGreaterThan(0);
  });

  it('resets correctly', () => {
    const a2 = new ResearchQualityAggregator();
    a2.reset();
    expect(a2.getAggregated().totalFeedback).toBe(0);
  });
});
