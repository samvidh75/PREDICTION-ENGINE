import { describe, expect, it } from 'vitest';
import { ProviderQuotaPolicy } from './ProviderQuotaPolicy';

describe('ProviderQuotaPolicy', () => {
  it('enforces injected provider budgets and reports remaining budget', () => {
    const quota = new ProviderQuotaPolicy({
      test: {
        provider: 'test',
        perMinute: 2,
        perDay: 3,
        burst: 2,
        maxConcurrent: 1,
        cooldownMs: 1_000,
      },
    });
    quota.setRunLevelMax(2);

    quota.checkQuota(' TEST ');
    quota.recordCallStart('test');

    expect(() => quota.checkQuota('test')).toThrow(/Rate limited/);

    quota.recordCallEnd('test');
    expect(quota.getRemainingBudget('test')).toMatchObject({
      provider: 'test',
      perMinuteRemaining: 1,
      perDayRemaining: 2,
      burstRemaining: 1,
      concurrentRemaining: 1,
      runLevelRemaining: 1,
    });

    quota.checkQuota('test');
    quota.recordCallStart('test');
    quota.recordCallEnd('test', 429, 5_000);

    expect(quota.getRemainingBudget('test').cooldownUntil).toEqual(expect.any(Number));
    expect(() => quota.checkQuota('test')).toThrow(/budget exhausted|Rate limited/);
  });
});
