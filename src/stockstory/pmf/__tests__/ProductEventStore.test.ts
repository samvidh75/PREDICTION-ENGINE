import { describe, it, expect, vi } from 'vitest';
import { ProductEventStore } from '../ProductEventStore';

function makeStoreEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: overrides.id as string ?? `evt_${Date.now()}_${Math.random()}`,
    metricKey: overrides.metricKey as string ?? 'pmf.test.event',
    value: (overrides.value as number) ?? 1,
    timestamp: overrides.timestamp as string ?? new Date().toISOString(),
    metadata: (overrides.metadata as Record<string, unknown>) ?? {},
  };
}

describe('ProductEventStore', () => {
  it('stores and retrieves events', () => {
    const store = new ProductEventStore(100);
    store.store(makeStoreEvent({ metricKey: 'pmf.activation.signup' }));
    const stats = store.getStats();
    expect(stats.totalStored).toBe(1);
    expect(stats.bufferSize).toBe(1);
  });

  it('stores batch of events', () => {
    const store = new ProductEventStore(100);
    const result = store.storeBatch([
      makeStoreEvent({ metricKey: 'pmf.activation.signup' }),
      makeStoreEvent({ metricKey: 'pmf.activation.first_search' }),
    ]);
    expect(result.stored).toBe(2);
    expect(result.errors).toEqual([]);
    expect(store.getStats().totalStored).toBe(2);
  });

  it('queries events by metric key', () => {
    const store = new ProductEventStore(100);
    store.store(makeStoreEvent({ metricKey: 'pmf.activation.signup', id: 'e1' }));
    store.store(makeStoreEvent({ metricKey: 'pmf.activation.signup', id: 'e2' }));
    store.store(makeStoreEvent({ metricKey: 'pmf.activation.first_search', id: 'e3' }));

    const results = store.queryByMetricKey('pmf.activation.signup', 10);
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.metricKey === 'pmf.activation.signup')).toBe(true);
  });

  it('returns all stored events', () => {
    const store = new ProductEventStore(100);
    store.store(makeStoreEvent({ metricKey: 'pmf.test.a', id: 'e1' }));
    store.store(makeStoreEvent({ metricKey: 'pmf.test.b', id: 'e2' }));
    expect(store.getAll()).toHaveLength(2);
  });

  it('limits buffer to max size', () => {
    const store = new ProductEventStore(3);
    store.store(makeStoreEvent({ metricKey: 'pmf.test.1', id: 'e1' }));
    store.store(makeStoreEvent({ metricKey: 'pmf.test.2', id: 'e2' }));
    store.store(makeStoreEvent({ metricKey: 'pmf.test.3', id: 'e3' }));
    store.store(makeStoreEvent({ metricKey: 'pmf.test.4', id: 'e4' }));
    // Buffer should keep newest events up to max
    expect(store.getStats().bufferSize).toBe(3);
    expect(store.getStats().totalStored).toBe(4);
  });

  it('calls persist callback when buffer is full', () => {
    const persistFn = vi.fn();
    const store = new ProductEventStore(3, persistFn);
    store.store(makeStoreEvent({ metricKey: 'pmf.test.1' }));
    store.store(makeStoreEvent({ metricKey: 'pmf.test.2' }));
    store.store(makeStoreEvent({ metricKey: 'pmf.test.3' }));
    expect(persistFn).not.toHaveBeenCalled();
    store.store(makeStoreEvent({ metricKey: 'pmf.test.4' }));
    expect(persistFn).toHaveBeenCalledOnce();
  });

  it('returns correct oldest and newest timestamps', () => {
    const store = new ProductEventStore(100);
    const t1 = '2024-01-01T00:00:00.000Z';
    const t2 = '2024-01-02T00:00:00.000Z';
    store.store(makeStoreEvent({ metricKey: 'pmf.test', timestamp: t1 }));
    store.store(makeStoreEvent({ metricKey: 'pmf.test', timestamp: t2 }));
    const stats = store.getStats();
    expect(stats.oldestTimestamp).toBe(t1);
    expect(stats.newestTimestamp).toBe(t2);
  });

  it('reports flush count', () => {
    const persistFn = vi.fn();
    const store = new ProductEventStore(2, persistFn);
    store.store(makeStoreEvent({ metricKey: 'pmf.test.1', id: 'e1' }));
    store.store(makeStoreEvent({ metricKey: 'pmf.test.2', id: 'e2' }));
    store.store(makeStoreEvent({ metricKey: 'pmf.test.3', id: 'e3' }));
    expect(store.getStats().flushCount).toBe(1);
  });
});
    store.flush();
    expect(persistFn).toHaveBeenCalled();
  });

  it('reports correct stats', () => {
    const store = new ProductEventStore({ maxEvents: 50 });
    expect(store.getStats().maxEvents).toBe(50);
    expect(store.getStats().currentSize).toBe(0);
    expect(store.getStats().totalFlushed).toBe(0);

    store.add(makeEvent('user_1', 'pmf.activation.signup_completed'));
    const stats = store.getStats();
    expect(stats.currentSize).toBe(1);
    expect(stats.totalAdded).toBe(1);
  });
});
