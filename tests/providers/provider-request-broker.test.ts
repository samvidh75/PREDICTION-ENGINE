import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProviderCallLedger } from '../../src/services/providers/broker/ProviderCallLedger';
import { ProviderQuotaPolicy } from '../../src/services/providers/broker/ProviderQuotaPolicy';
import { ProviderRequestBroker } from '../../src/services/providers/broker/ProviderRequestBroker';
import { InMemoryProviderBrokerStore } from '../../src/services/providers/broker/InMemoryProviderBrokerStore';

function brokerFixture() {
  const ledger = new ProviderCallLedger();
  const quota = new ProviderQuotaPolicy({
    test: { provider: 'test', perMinute: 100, perDay: 100, burst: 100, maxConcurrent: 25, cooldownMs: 1_000 },
  });
  const store = new InMemoryProviderBrokerStore();
  return { broker: new ProviderRequestBroker(quota, ledger, store), ledger, quota, store };
}

describe('provider request broker contract', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('single-flights twenty identical quote requests and charges quota once', async () => {
    const { broker, ledger, quota } = brokerFixture();
    let upstreamCalls = 0;
    const fetcher = vi.fn(async () => {
      upstreamCalls += 1;
      await new Promise(resolve => setTimeout(resolve, 5));
      return { data: { price: 123 }, status: 200 };
    });

    const results = await Promise.all(Array.from({ length: 20 }, () => (
      broker.execute('test', 'quote', 'RELIANCE', { token: `secret-${Math.random()}`, range: '1d' }, fetcher)
    )));

    expect(results).toHaveLength(20);
    expect(results.every(result => result.success)).toBe(true);
    expect(upstreamCalls).toBe(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(quota.getRunLevelCount()).toBe(1);
    expect(ledger.getEntries()).toHaveLength(1);
    expect(ledger.getEntries()[0]).toMatchObject({ actualUpstreamCalls: 1, coalescedFollowerCount: 19 });
  });

  it('does not expose authorization headers or tokens in ledger output', async () => {
    const { broker, ledger } = brokerFixture();
    const secret = 'secret-auth-token';

    await broker.execute('test', 'quote', 'RELIANCE', { authorization: `Bearer ${secret}`, token: secret }, async () => ({
      data: { price: 1 },
      status: 200,
    }));

    const ledgerOutput = JSON.stringify(ledger.getEntries());
    expect(ledgerOutput).not.toContain(secret);
    expect(ledgerOutput).not.toContain('Bearer');
  });

  it('returns stale data to twenty consumers and performs one background revalidation', async () => {
    vi.useFakeTimers();
    const { broker, ledger, quota } = brokerFixture();
    let release: (() => void) | undefined;
    let revalidations = 0;
    const fetcher = vi.fn(async () => {
      if (fetcher.mock.calls.length === 1) return { data: { price: 100 }, status: 200 };
      revalidations += 1;
      await new Promise<void>(resolve => {
        release = resolve;
      });
      return { data: { price: 101 }, status: 200 };
    });

    await broker.execute('test', 'quote', 'RELIANCE', { token: 'secret' }, fetcher);
    await vi.advanceTimersByTimeAsync(31_000);

    const results = await Promise.all(Array.from({ length: 20 }, () => (
      broker.execute('test', 'quote', 'RELIANCE', { token: 'changed-secret' }, fetcher)
    )));

    expect(results.every(result => result.cacheState === 'stale' && result.data?.price === 100)).toBe(true);
    expect(revalidations).toBe(1);
    expect(quota.getRunLevelCount()).toBe(1);

    release?.();
    await vi.runAllTimersAsync();

    expect(quota.getRunLevelCount()).toBe(2);
    expect(ledger.getEntries()[0]).toMatchObject({
      cacheState: 'stale_revalidating',
      actualUpstreamCalls: 1,
      coalescedFollowerCount: 19,
    });

    const fresh = await broker.execute('test', 'quote', 'RELIANCE', { token: 'other-secret' }, fetcher);
    expect(fresh).toMatchObject({ cacheState: 'fresh', data: { price: 101 } });
  });

  it('bounds negative cache for unavailable responses', async () => {
    vi.useFakeTimers();
    const { broker } = brokerFixture();
    let upstreamCalls = 0;
    const fetcher = vi.fn(async () => {
      upstreamCalls += 1;
      return { data: null, status: 404 };
    });

    const first = await broker.execute('test', 'quote', 'MISSING', { token: 'secret' }, fetcher);
    expect(first.success).toBe(false);
    expect(upstreamCalls).toBe(1);

    const repeated = await Promise.all(Array.from({ length: 5 }, () => (
      broker.execute('test', 'quote', 'MISSING', { token: 'changed-secret' }, fetcher)
    )));
    expect(repeated.every(result => result.cacheState === 'negative')).toBe(true);
    expect(upstreamCalls).toBe(1);

    await vi.advanceTimersByTimeAsync(30_001);
    await broker.execute('test', 'quote', 'MISSING', { token: 'secret' }, fetcher);
    expect(upstreamCalls).toBe(2);
  });
});
