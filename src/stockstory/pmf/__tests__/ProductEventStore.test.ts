import { describe, it, expect, vi } from 'vitest';
import { ProductEventStore } from '../ProductEventStore';

function makeStoreEvent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    metricKey: (overrides.metricKey as string) ?? 'pmf.test.event',
    value: (overrides.value as number) ?? 1,
    timestamp: (overrides.timestamp as string) ?? new Date().toISOString(),
    userId: 'user_1',
    sessionId: 'session_1',
    dimensions: {},
    ...overrides,
  };
}

describe('ProductEventStore', () => {
  it('stores and retrieves events', () => {
    const store = new ProductEventStore({ maxBuffer: 100 });
    store.store(makeStoreEvent({ metricKey: 'pmf.activation.signup' }) as any);
    const stats = store.getStats();
    expect(stats.totalStored).toBe(1);
    expect(stats.bufferSize).toBe(1);
  });

  it('stores batch of events', () => {
    const store = new ProductEventStore({ maxBuffer: 100 });
    const result = store.storeBatch([
      makeStoreEvent({ metricKey: 'pmf.activation.signup' }),
      makeStoreEvent({ metricKey: 'pmf.activation.first_search' }),
    ] as any[]);
    expect(result).toHaveLength(2);
    expect(store.getStats().totalStored).toBe(2);
  });

  it('queries events by metric key', () => {
    const store = new ProductEventStore({ maxBuffer: 100 });
    store.store(makeStoreEvent({ metricKey: 'pmf.activation.signup' }) as any);
    store.store(makeStoreEvent({ metricKey: 'pmf.activation.signup' }) as any);
    store.store(makeStoreEvent({ metricKey: 'pmf.activation.first_search' }) as any);

    const results = store.queryByMetricKey('pmf.activation.signup', 10);
    expect(results).toHaveLength(2);
    expect(results.every((r: any) => r.metricKey === 'pmf.activation.signup')).toBe(true);
  });

  it('returns all stored events via queryRecent', () => {
    const store = new ProductEventStore({ maxBuffer: 100 });
    store.store(makeStoreEvent({ metricKey: 'pmf.test.a' }) as any);
    store.store(makeStoreEvent({ metricKey: 'pmf.test.b' }) as any);
    expect(store.queryRecent(10)).toHaveLength(2);
  });

  it('limits buffer to max size', () => {
    const store = new ProductEventStore({ maxBuffer: 3 });
    store.store(makeStoreEvent({ metricKey: 'pmf.test.1' }) as any);
    store.store(makeStoreEvent({ metricKey: 'pmf.test.2' }) as any);
    store.store(makeStoreEvent({ metricKey: 'pmf.test.3' }) as any);
    store.store(makeStoreEvent({ metricKey: 'pmf.test.4' }) as any);
    expect(store.getStats().bufferSize).toBe(3);
    expect(store.getStats().totalStored).toBe(4);
  });

  it('calls persist callback when buffer is full', () => {
    const persistFn = vi.fn();
    const store = new ProductEventStore({ maxBuffer: 3, persistFn });
    store.store(makeStoreEvent({ metricKey: 'pmf.test.1' }) as any);
    store.store(makeStoreEvent({ metricKey: 'pmf.test.2' }) as any);
    store.store(makeStoreEvent({ metricKey: 'pmf.test.3' }) as any);
    expect(persistFn).not.toHaveBeenCalled();
    store.store(makeStoreEvent({ metricKey: 'pmf.test.4' }) as any);
    expect(persistFn).toHaveBeenCalledOnce();
  });

  it('returns correct oldest and newest timestamps', () => {
    const store = new ProductEventStore({ maxBuffer: 100 });
    const t1 = '2024-01-01T00:00:00.000Z';
    const t2 = '2024-01-02T00:00:00.000Z';
    store.store(makeStoreEvent({ metricKey: 'pmf.test', timestamp: t1 }) as any);
    store.store(makeStoreEvent({ metricKey: 'pmf.test', timestamp: t2 }) as any);
    const stats = store.getStats();
    expect(stats.oldestTimestamp).toBe(t1);
    expect(stats.newestTimestamp).toBe(t2);
  });

  it('reports flush count', () => {
    const persistFn = vi.fn();
    const store = new ProductEventStore({ maxBuffer: 2, persistFn });
    store.store(makeStoreEvent({ metricKey: 'pmf.test.1' }) as any);
    store.store(makeStoreEvent({ metricKey: 'pmf.test.2' }) as any);
    store.store(makeStoreEvent({ metricKey: 'pmf.test.3' }) as any);
    expect(store.getStats().flushCount).toBe(1);
  });
});
