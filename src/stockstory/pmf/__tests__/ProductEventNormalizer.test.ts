import { describe, it, expect } from 'vitest';
import { ProductEventNormalizer } from '../ProductEventNormalizer';
import type { NormalizedMetricEvent } from '../ProductEventNormalizer';

function makeValidEvent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    category: 'discovery',
    action: 'search_performed',
    userId: 'user_123',
    timestamp: '2024-01-15T10:30:00.000Z',
    metadata: { label: 'Search result click' },
    ...overrides,
  };
}

describe('ProductEventNormalizer', () => {
  const normalizer = new ProductEventNormalizer();

  it('normalizes valid events from an array', () => {
    const result = normalizer.normalize([makeValidEvent()]);
    expect(result.events.length).toBeGreaterThan(0);
    expect(result.skipped).toBe(0);
    expect(result.errors).toEqual([]);
    const event = result.events[0];
    expect(event.metricKey).toBeDefined();
    expect(typeof event.value).toBe('number');
    expect(event.timestamp).toBeDefined();
  });

  it('skips events with unknown category/action', () => {
    const result = normalizer.normalize([
      makeValidEvent({ category: 'unknown_category', userId: 'user_1' }),
    ]);
    expect(result.skipped).toBe(1);
    expect(result.events.length).toBe(0);
    expect(result.errors).toEqual([]);
  });

  it('normalizes multiple events in batch', () => {
    const result = normalizer.normalize([
      makeValidEvent({ userId: 'user_1' }),
      makeValidEvent({ userId: 'user_2' }),
    ]);
    expect(result.events.length).toBe(2);
    expect(result.skipped).toBe(0);
  });

  it('skips invalid events in batch while processing valid ones', () => {
    const result = normalizer.normalize([
      makeValidEvent({ userId: 'user_1' }),
      makeValidEvent({ category: 'invalid' }),
      makeValidEvent({ userId: 'user_3' }),
    ]);
    expect(result.events.length).toBe(2);
    expect(result.skipped).toBe(1);
  });

  it('emits event with correct metricKey', () => {
    const result = normalizer.normalize([makeValidEvent()]);
    expect(result.events.length).toBeGreaterThan(0);
    expect(result.events.some((e: NormalizedMetricEvent) => e.metricKey.includes('pmf'))).toBe(true);
  });

  it('preserves dimensions in normalized events', () => {
    const result = normalizer.normalize([makeValidEvent({
      metadata: { label: 'Search result click', symbol: 'RELIANCE' },
    })]);
    const event = result.events[0];
    expect(event.dimensions).toBeDefined();
    expect(event.dimensions?.symbol).toBe('RELIANCE');
  });

  it('normalizes engagement events with correct metricKey', () => {
    const result = normalizer.normalize([{
      category: 'engagement',
      action: 'superpage_view',
      userId: 'user_1',
      timestamp: '2024-01-15T10:00:00.000Z',
      metadata: { label: 'Stock Page View', symbol: 'TCS' },
    }]);
    expect(result.events[0].metricKey).toContain('pmf.engagement');
  });
});
