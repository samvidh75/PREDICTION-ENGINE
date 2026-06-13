import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CacheHierarchyEngine } from '../../src/backend/persistence/cache/cacheHierarchyEngine';
import type { AppEnv } from '../../src/backend/config/env';

const env: AppEnv = {
  nodeEnv: 'test',
  isProduction: false,
  allowedOrigins: [],
  cookieSecret: 'test',
};

describe('cache hierarchy single-flight contract', () => {
  beforeEach(() => {
    delete process.env.REDIS_URL;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete process.env.REDIS_URL;
  });

  it('coalesces concurrent misses', async () => {
    const cache = new CacheHierarchyEngine({ env });
    const fetcher = vi.fn(async () => ({ value: 1 }));

    const results = await Promise.all(Array.from({ length: 20 }, () => (
      cache.getOrFetchSWR('quote:ABC', { ttlMs: 1_000, staleTtlMs: 1_000 }, fetcher, { domain: 'provider' })
    )));

    expect(results.every(result => result.value === 1)).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('coalesces stale revalidation while returning stale values immediately', async () => {
    vi.useFakeTimers();
    const cache = new CacheHierarchyEngine({ env });
    let release: (() => void) | undefined;
    const fetcher = vi.fn(async () => {
      if (fetcher.mock.calls.length === 1) return { value: 1 };
      await new Promise<void>(resolve => {
        release = resolve;
      });
      return { value: 2 };
    });

    await cache.getOrFetchSWR('quote:ABC', { ttlMs: 1_000, staleTtlMs: 10_000 }, fetcher, { domain: 'provider' });
    await vi.advanceTimersByTimeAsync(1_001);

    const results = await Promise.all(Array.from({ length: 20 }, () => (
      cache.getOrFetchSWR('quote:ABC', { ttlMs: 1_000, staleTtlMs: 10_000 }, fetcher, { domain: 'provider' })
    )));

    expect(results.every(result => result.value === 1)).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(cache.stats().staleRevalidationsInFlight).toBe(1);

    release?.();
    await vi.runAllTimersAsync();

    await expect(cache.getOrFetchSWR('quote:ABC', { ttlMs: 1_000, staleTtlMs: 10_000 }, fetcher, { domain: 'provider' }))
      .resolves.toEqual({ value: 2 });
  });

  it('expires stale entries and negative-cache entries, and resets deterministically', async () => {
    vi.useFakeTimers();
    const cache = new CacheHierarchyEngine({ env });
    const fail = vi.fn(async () => {
      throw new Error('unavailable');
    });

    await cache.getOrFetchSWR('profile:ABC', { ttlMs: 1_000, staleTtlMs: 1_000 }, async () => ({ value: 1 }), { domain: 'provider' });
    await vi.advanceTimersByTimeAsync(2_001);
    expect(cache.get('cache:provider:profile:ABC')).toEqual({ hit: false });

    await expect(cache.getOrFetchSWR('negative:ABC', { ttlMs: 1_000, staleTtlMs: 1_000 }, fail, { domain: 'provider', negativeTtlMs: 500 }))
      .rejects.toThrow('unavailable');
    await expect(cache.getOrFetchSWR('negative:ABC', { ttlMs: 1_000, staleTtlMs: 1_000 }, fail, { domain: 'provider', negativeTtlMs: 500 }))
      .rejects.toThrow('Cache negative entry');
    expect(fail).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(501);
    await expect(cache.getOrFetchSWR('negative:ABC', { ttlMs: 1_000, staleTtlMs: 1_000 }, fail, { domain: 'provider', negativeTtlMs: 500 }))
      .rejects.toThrow('unavailable');
    expect(fail).toHaveBeenCalledTimes(2);

    cache.resetForTests();
    expect(cache.stats()).toMatchObject({ entries: 0, missInFlight: 0, staleRevalidationsInFlight: 0, negativeEntries: 0 });
  });
});
