import { afterEach, describe, expect, it, vi } from 'vitest';
import { classifyHttpStatus, classifyNetworkError, parseRetryAfter } from '../../src/services/providers/broker/ProviderErrorClassifier';
import { ProviderCallLedger } from '../../src/services/providers/broker/ProviderCallLedger';
import { ProviderQuotaPolicy } from '../../src/services/providers/broker/ProviderQuotaPolicy';
import { ProviderRequestBroker } from '../../src/services/providers/broker/ProviderRequestBroker';
import { InMemoryProviderBrokerStore } from '../../src/services/providers/broker/InMemoryProviderBrokerStore';

function brokerFixture() {
  const ledger = new ProviderCallLedger();
  const quota = new ProviderQuotaPolicy({
    test: { provider: 'test', perMinute: 100, perDay: 100, burst: 100, maxConcurrent: 5, cooldownMs: 1_000 },
  });
  return { broker: new ProviderRequestBroker(quota, ledger, new InMemoryProviderBrokerStore()), ledger, quota };
}

async function runWithTimers<T>(promise: Promise<T>): Promise<T> {
  await vi.runAllTimersAsync();
  return promise;
}

describe('provider error classifier and retry contract', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it.each([400, 401, 403, 404])('never retries permanent HTTP %i', async status => {
    const { broker } = brokerFixture();
    const fetcher = vi.fn(async () => ({ data: null, status }));

    const result = await broker.execute('test', 'quote', 'ABC', { token: 'secret-token' }, fetcher);

    expect(result.success).toBe(false);
    expect(result.attemptCount).toBe(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each([408, 425, 500])('retries bounded transient HTTP %i', async status => {
    vi.useFakeTimers();
    const { broker } = brokerFixture();
    const fetcher = vi.fn(async () => ({ data: null, status }));

    const promise = broker.execute('test', 'quote', `ABC-${status}`, { token: 'secret-token' }, fetcher);
    const result = await runWithTimers(promise);

    expect(result.success).toBe(false);
    expect(result.attemptCount).toBe(3);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('retries bounded timeout failures', async () => {
    vi.useFakeTimers();
    const { broker } = brokerFixture();
    const fetcher = vi.fn(async () => {
      throw Object.assign(new Error('request timeout'), { name: 'AbortError' });
    });

    const promise = broker.execute('test', 'quote', 'TIMEOUT', { token: 'secret-token' }, fetcher);
    const result = await runWithTimers(promise);

    expect(result.statusClass).toBe('timeout');
    expect(result.attemptCount).toBe(3);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('honors Retry-After on 429 and enters cooldown', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-13T00:00:00.000Z'));
    const { broker, ledger, quota } = brokerFixture();
    const fetcher = vi.fn(async () => ({ data: null, status: 429, headers: { 'Retry-After': '7' } }));

    const promise = broker.execute('test', 'quote', 'RATE', { token: 'secret-token' }, fetcher);
    const result = await runWithTimers(promise);

    expect(result.statusClass).toBe('rate_limited');
    expect(result.error?.retryAfterMs).toBeGreaterThan(0);
    expect(result.error?.retryAfterMs).toBeLessThanOrEqual(7_000);
    expect(quota.getQuotaState('test')?.cooldownUntil).toBe(new Date('2026-06-13T00:00:07.000Z').getTime());
    expect(ledger.getEntries()[0]?.cooldownUntil).toBe(new Date('2026-06-13T00:00:07.000Z').getTime());
  });

  it('parses Retry-After seconds and HTTP-date values', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-13T00:00:00.000Z'));

    expect(parseRetryAfter('3')).toBe(3_000);
    expect(parseRetryAfter('Sat, 13 Jun 2026 00:00:05 GMT')).toBe(5_000);
  });

  it('classifies network, timeout, and unknown errors without leaking tokens', () => {
    const secret = 'secret-token';
    const timeout = classifyNetworkError(Object.assign(new Error(`timeout token=${secret}`), { name: 'AbortError' }));
    const network = classifyNetworkError(Object.assign(new Error('fetch failed'), { code: 'ENOTFOUND' }));
    const unknown = classifyHttpStatus(302, `redirect Bearer ${secret}`);

    expect(timeout.category).toBe('retryable_timeout');
    expect(network.category).toBe('retryable_network');
    expect(unknown.category).toBe('unknown');
    expect(JSON.stringify([timeout, network, unknown])).not.toContain(secret);
  });
});
