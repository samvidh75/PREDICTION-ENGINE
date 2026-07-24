import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProviderCallLedger } from './ProviderCallLedger';
import { ProviderQuotaPolicy } from './ProviderQuotaPolicy';
import { ProviderRequestBroker } from './ProviderRequestBroker';
import { InMemoryProviderBrokerStore } from './InMemoryProviderBrokerStore';

function makeBroker() {
  const ledger = new ProviderCallLedger();
  const quota = new ProviderQuotaPolicy({
    test: {
      provider: 'test',
      perMinute: 100,
      perDay: 100,
      burst: 100,
      maxConcurrent: 10,
      cooldownMs: 1_000,
    },
  });
  const store = new InMemoryProviderBrokerStore();

  return {
    broker: new ProviderRequestBroker(quota, ledger, store),
    ledger,
    quota,
    store,
  };
}

describe('ProviderRequestBroker', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('single-flights identical misses without keying on secrets', async () => {
    const { broker, ledger, quota } = makeBroker();
    let upstreamCalls = 0;

    const fetcher = vi.fn(async () => {
      upstreamCalls += 1;
      await new Promise(resolve => setTimeout(resolve, 10));
      return { data: { price: 123 }, status: 200 };
    });

    const [leader, follower] = await Promise.all([
      broker.execute('test', 'quote', 'reliance.ns', { token: 'secret-a', region: 'IN' }, fetcher),
      broker.execute('test', 'quote', 'RELIANCE', { token: 'secret-b', region: 'IN' }, fetcher),
    ]);

    expect(leader.success).toBe(true);
    expect(follower.success).toBe(true);
    expect(follower.coalesced).toBe(true);
    expect(upstreamCalls).toBe(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(quota.getRunLevelCount()).toBe(1);

    const entries = ledger.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.actualUpstreamCalls).toBe(1);
    expect(entries[0]?.coalescedFollowerCount).toBe(1);
  });

  it('records run metadata without adding it to request key material', async () => {
    const { broker, ledger } = makeBroker();
    const fetcher = vi.fn(async () => ({ data: { price: 123 }, status: 200 }));

    const first = await broker.execute(
      'test',
      'quote',
      'RELIANCE',
      { region: 'IN' },
      fetcher,
      { runId: 'run-a', cachePolicy: { ttlMs: 30_000, staleWindowMs: 30_000, negativeTtlMs: 30_000 }, timeoutMs: 10_000 },
    );
    const second = await broker.execute(
      'test',
      'quote',
      'RELIANCE',
      { region: 'IN' },
      fetcher,
      { runId: 'run-b', cachePolicy: { ttlMs: 30_000, staleWindowMs: 30_000, negativeTtlMs: 30_000 }, timeoutMs: 10_000 },
    );

    expect(first).toMatchObject({ success: true, cacheState: 'miss', runId: 'run-a' });
    expect(second).toMatchObject({ success: true, cacheState: 'fresh', runId: 'run-b' });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(ledger.getEntries()[0]?.runId).toBe('run-a');
  });

  it('returns stale data immediately and triggers one shared background revalidation', async () => {
    vi.useFakeTimers();

    const { broker, ledger, quota } = makeBroker();
    let revalidateCalls = 0;
    let releaseRevalidation: (() => void) | undefined;

    const fetcher = vi.fn(async () => {
      if (fetcher.mock.calls.length === 1) {
        return { data: { price: 100 }, status: 200 };
      }

      revalidateCalls += 1;
      await new Promise<void>(resolve => {
        releaseRevalidation = resolve;
      });
      return { data: { price: 101 }, status: 200 };
    });

    await expect(broker.execute('test', 'quote', 'RELIANCE', { token: 'secret' }, fetcher))
      .resolves.toMatchObject({ success: true, data: { price: 100 }, cacheState: 'miss' });

    await vi.advanceTimersByTimeAsync(31_000);

    const staleResults = await Promise.all([
      broker.execute('test', 'quote', 'RELIANCE', { token: 'secret' }, fetcher),
      broker.execute('test', 'quote', 'RELIANCE', { token: 'another-secret' }, fetcher),
      broker.execute('test', 'quote', 'RELIANCE.PSX', { token: 'third-secret' }, fetcher),
    ]);

    expect(staleResults).toEqual([
      expect.objectContaining({ success: true, data: { price: 100 }, cacheState: 'stale' }),
      expect.objectContaining({ success: true, data: { price: 100 }, cacheState: 'stale' }),
      expect.objectContaining({ success: true, data: { price: 100 }, cacheState: 'stale' }),
    ]);
    expect(revalidateCalls).toBe(1);
    expect(quota.getRunLevelCount()).toBe(1);

    releaseRevalidation?.();
    await vi.runAllTimersAsync();

    expect(quota.getRunLevelCount()).toBe(2);

    const entries = ledger.getEntries();
    expect(entries).toHaveLength(2);
    expect(entries[0]?.cacheState).toBe('stale_revalidating');
    expect(entries[0]?.actualUpstreamCalls).toBe(1);
    expect(entries[0]?.coalescedFollowerCount).toBe(2);
  });
});
