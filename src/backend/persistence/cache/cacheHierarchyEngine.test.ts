import { describe, expect, it, vi, afterEach } from 'vitest';
import { CacheHierarchyEngine } from './cacheHierarchyEngine';
import type { AppEnv } from '../../config/env';

const env: AppEnv = {
  nodeEnv: 'test',
  isProduction: false,
  allowedOrigins: [],
  cookieSecret: 'test',
};

describe('CacheHierarchyEngine', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete process.env.REDIS_URL;
  });

  it('coalesces concurrent cache misses into one fetch', async () => {
    const cache = new CacheHierarchyEngine({ env });
    let calls = 0;

    const fetcher = vi.fn(async () => {
      calls += 1;
      await new Promise(resolve => setTimeout(resolve, 5));
      return { value: 1 };
    });

    const [a, b, c] = await Promise.all([
      cache.getOrFetchSWR('quote:ABC', { ttlMs: 1_000, staleTtlMs: 1_000 }, fetcher, { domain: 'provider' }),
      cache.getOrFetchSWR('quote:ABC', { ttlMs: 1_000, staleTtlMs: 1_000 }, fetcher, { domain: 'provider' }),
      cache.getOrFetchSWR('quote:ABC', { ttlMs: 1_000, staleTtlMs: 1_000 }, fetcher, { domain: 'provider' }),
    ]);

    expect([a, b, c]).toEqual([{ value: 1 }, { value: 1 }, { value: 1 }]);
    expect(calls).toBe(1);
    expect(cache.stats().missInFlight).toBe(0);
  });

  it('returns stale data immediately and runs exactly one stale revalidation', async () => {
    vi.useFakeTimers();
    const cache = new CacheHierarchyEngine({ env });
    let release: (() => void) | undefined;
    let revalidations = 0;

    const fetcher = vi.fn(async () => {
      if (fetcher.mock.calls.length === 1) return { value: 1 };
      revalidations += 1;
      await new Promise<void>(resolve => {
        release = resolve;
      });
      return { value: 2 };
    });

    await cache.getOrFetchSWR('quote:ABC', { ttlMs: 1_000, staleTtlMs: 10_000 }, fetcher, { domain: 'provider' });
    await vi.advanceTimersByTimeAsync(1_500);

    const [a, b, c] = await Promise.all([
      cache.getOrFetchSWR('quote:ABC', { ttlMs: 1_000, staleTtlMs: 10_000 }, fetcher, { domain: 'provider' }),
      cache.getOrFetchSWR('quote:ABC', { ttlMs: 1_000, staleTtlMs: 10_000 }, fetcher, { domain: 'provider' }),
      cache.getOrFetchSWR('quote:ABC', { ttlMs: 1_000, staleTtlMs: 10_000 }, fetcher, { domain: 'provider' }),
    ]);

    expect([a, b, c]).toEqual([{ value: 1 }, { value: 1 }, { value: 1 }]);
    expect(revalidations).toBe(1);
    expect(cache.stats().staleRevalidationsInFlight).toBe(1);

    release?.();
    await vi.runAllTimersAsync();

    expect(cache.stats().staleRevalidationsInFlight).toBe(0);
  });

  it('deletes expired stale entries and bounds negative cache entries', async () => {
    vi.useFakeTimers();
    const cache = new CacheHierarchyEngine({ env });

    await cache.getOrFetchSWR('profile:ABC', { ttlMs: 1_000, staleTtlMs: 1_000 }, async () => ({ value: 1 }), { domain: 'provider' });
    await vi.advanceTimersByTimeAsync(2_001);

    expect(cache.get('cache:provider:profile:ABC')).toEqual({ hit: false });

    const failingFetcher = vi.fn(async () => {
      throw new Error('upstream unavailable');
    });

    await expect(cache.getOrFetchSWR('missing:ABC', { ttlMs: 1_000, staleTtlMs: 1_000 }, failingFetcher, { domain: 'provider', negativeTtlMs: 500 }))
      .rejects.toThrow('upstream unavailable');
    await expect(cache.getOrFetchSWR('missing:ABC', { ttlMs: 1_000, staleTtlMs: 1_000 }, failingFetcher, { domain: 'provider', negativeTtlMs: 500 }))
      .rejects.toThrow('Cache negative entry');
    expect(failingFetcher).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(501);
    await expect(cache.getOrFetchSWR('missing:ABC', { ttlMs: 1_000, staleTtlMs: 1_000 }, failingFetcher, { domain: 'provider', negativeTtlMs: 500 }))
      .rejects.toThrow('upstream unavailable');
    expect(failingFetcher).toHaveBeenCalledTimes(2);
  });
});
