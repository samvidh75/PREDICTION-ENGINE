import { describe, it, expect } from 'vitest';
import { ProductEventNormalizer } from '../ProductEventNormalizer';
import type { NormalizedMetricEvent } from '../ProductEventNormalizer';

function makeValidEvent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    category: 'research',
    action: 'view',
    userId: 'user_123',
    timestamp: '2024-01-15T10:30:00.000Z',
    metadata: { label: 'Research View' },
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

  it('skips events with missing required fields', () => {
    const result = normalizer.normalize([
      makeValidEvent({ category: '', userId: 'user_1' }),
    ]);
    expect(result.skipped).toBe(1);
    expect(result.events.length).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
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
      makeValidEvent({ category: '' }),
      makeValidEvent({ userId: 'user_3' }),
    ]);
    expect(result.events.length).toBe(2);
    expect(result.skipped).toBe(1);
  });

  it('emits research view event with correct metricKey', () => {
    const result = normalizer.normalize([makeValidEvent()]);
    expect(result.events.length).toBeGreaterThan(0);
    expect(result.events.some((e: NormalizedMetricEvent) => e.metricKey.includes('research'))).toBe(true);
  });

  it('preserves metadata in normalized events', () => {
    const result = normalizer.normalize([makeValidEvent({
      metadata: { label: 'Research View', symbol: 'RELIANCE' },
    })]);
    const event = result.events[0];
    expect(event.metadata).toBeDefined();
    expect(event.metadata?.symbol).toBe('RELIANCE');
  });
});
    expect(() =>
      normalizer.normalize({
        eventType: 'discovery',
        action: 'page_view',
        userId: '', // empty userId
        timestamp: '2024-01-15T10:00:00.000Z',
        metadata: { label: 'Test' },
      }),
    ).toThrow();
  });

  it('extracts metric label from metadata', () => {
    const result = normalizer.normalize({
      eventType: 'engagement',
      action: 'alert_view',
      userId: 'user_1',
      timestamp: '2024-01-15T10:00:00.000Z',
      metadata: { label: 'Alert: Price Target', category: 'price_target' },
    });
    expect(result.some((r) => r.metricKey === 'pmf.engagement.alerts_viewed')).toBe(true);
  });
});
