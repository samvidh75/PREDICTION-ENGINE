import { describe, expect, it } from 'vitest';
import { EnsembleAggregator } from '../EnsembleAggregator.js';

describe('EnsembleAggregator', () => {
  it('aggregates unanimous bullish signals', () => {
    const aggregator = new EnsembleAggregator();
    const result = aggregator.aggregate([
      { name: 'LSTM', direction: 'bullish', strength: 0.7, confidence: 0.8 },
      { name: 'Technical', direction: 'bullish', strength: 0.6, confidence: 0.7 },
    ]);
    expect(result.consensusDirection).toBe('bullish');
    expect(result.consensusStrength).toBeGreaterThan(0);
    expect(result.consensusConfidence).toBeGreaterThan(0);
  });

  it('aggregates unanimous bearish signals', () => {
    const aggregator = new EnsembleAggregator({ consensusThreshold: 0.3 });
    const result = aggregator.aggregate([
      { name: 'LSTM', direction: 'bearish', strength: 0.8, confidence: 0.9 },
      { name: 'Technical', direction: 'bearish', strength: 0.5, confidence: 0.6 },
    ]);
    expect(result.consensusDirection).toBe('bearish');
    expect(result.consensusStrength).toBeLessThan(0);
  });

  it('returns neutral with conflicting signals', () => {
    const aggregator = new EnsembleAggregator({ consensusThreshold: 0.3 });
    const result = aggregator.aggregate([
      { name: 'LSTM', direction: 'bullish', strength: 0.2, confidence: 0.5 },
      { name: 'Technical', direction: 'bearish', strength: 0.2, confidence: 0.5 },
    ]);
    expect(result.consensusDirection).toBe('neutral');
  });

  it('returns empty result for zero signals', () => {
    const aggregator = new EnsembleAggregator();
    const result = aggregator.aggregate([]);
    expect(result.consensusDirection).toBe('neutral');
    expect(result.signalCount).toBe(0);
    expect(result.consensusStrength).toBe(0);
  });

  it('supports weighted aggregation', () => {
    const aggregator = new EnsembleAggregator();
    const result = aggregator.weightedAggregate(
      [
        { name: 'A', direction: 'bullish', strength: 1, confidence: 1 },
        { name: 'B', direction: 'bearish', strength: 1, confidence: 1 },
      ],
      { A: 4, B: 1 },
    );
    expect(result.consensusDirection).toBe('bullish');
  });

  it('computes agreement score correctly', () => {
    const aggregator = new EnsembleAggregator();
    const result = aggregator.aggregate([
      { name: 'A', direction: 'bullish', strength: 0.5, confidence: 0.8 },
      { name: 'B', direction: 'bullish', strength: 0.4, confidence: 0.7 },
      { name: 'C', direction: 'bearish', strength: 0.3, confidence: 0.6 },
    ]);
    expect(result.agreementScore).toBeGreaterThan(0);
    expect(result.agreementScore).toBeLessThanOrEqual(1);
  });
});
