import { describe, expect, it } from 'vitest';
import { ProviderQuotaPolicy } from '../../src/services/providers/broker/ProviderQuotaPolicy';

function quota() {
  return new ProviderQuotaPolicy({
    test: { provider: 'test', perMinute: 2, perDay: 3, burst: 2, maxConcurrent: 1, cooldownMs: 1_000 },
  });
}

describe('provider quota policy contract', () => {
  it('enforces per-minute budget', () => {
    const q = quota();
    q.recordCallEnd('test');
    q.recordCallEnd('test');

    expect(() => q.checkQuota('test')).toThrow(/Rate limited/);
  });

  it('enforces per-day budget', () => {
    const q = new ProviderQuotaPolicy({
      test: { provider: 'test', perMinute: 10, perDay: 1, burst: 10, maxConcurrent: 1, cooldownMs: 1_000 },
    });
    q.recordCallEnd('test');

    expect(() => q.checkQuota('test')).toThrow(/Rate limited/);
  });

  it('enforces burst budget', () => {
    const q = new ProviderQuotaPolicy({
      test: { provider: 'test', perMinute: 10, perDay: 10, burst: 1, maxConcurrent: 1, cooldownMs: 1_000 },
    });
    q.recordCallEnd('test');

    expect(() => q.checkQuota('test')).toThrow(/Rate limited/);
  });

  it('enforces concurrent limit and releases slots after success and failure', () => {
    const q = quota();

    q.checkQuota('test');
    q.recordCallStart('test');
    expect(() => q.checkQuota('test')).toThrow(/Rate limited/);

    q.recordCallEnd('test', 200);
    expect(q.getRemainingBudget('test').concurrentRemaining).toBe(1);

    q.checkQuota('test');
    q.recordCallStart('test');
    q.recordCallEnd('test', 500);
    expect(q.getRemainingBudget('test').concurrentRemaining).toBe(1);
  });

  it('enforces run-level maximum', () => {
    const q = quota();
    q.setRunLevelMax(1);
    q.recordCallEnd('test');

    expect(() => q.checkQuota('test')).toThrow(/budget exhausted/);
  });

  it('reports remaining budgets accurately', () => {
    const q = quota();
    q.recordCallEnd('test');

    expect(q.getRemainingBudget(' TEST ')).toMatchObject({
      provider: 'test',
      perMinuteRemaining: 1,
      perDayRemaining: 2,
      burstRemaining: 1,
      concurrentRemaining: 1,
    });
  });
});
