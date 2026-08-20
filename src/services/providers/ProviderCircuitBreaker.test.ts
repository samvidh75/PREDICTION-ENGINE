import { describe, it, expect } from 'vitest';
import { ProviderCircuitBreaker, CircuitOpenError } from './ProviderCircuitBreaker';
import { ProviderHealthMonitor } from './ProviderHealthMonitor';

describe('ProviderCircuitBreaker', () => {
  it('opens after failureThreshold consecutive failures and fast-fails with CircuitOpenError', async () => {
    const breaker = new ProviderCircuitBreaker({ failureThreshold: 3, openTimeoutMs: 10_000 });
    const alwaysFails = () => Promise.reject(new Error('upstream down'));

    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(alwaysFails)).rejects.toThrow('upstream down');
    }

    // The circuit is now open: the fourth call must not even attempt fn().
    let attempted = false;
    await expect(
      breaker.execute(() => {
        attempted = true;
        return Promise.resolve('should not run');
      }),
    ).rejects.toBeInstanceOf(CircuitOpenError);
    expect(attempted).toBe(false);
  });

  // Reproduces the production incident: a provider hitting a handful of real
  // errors opened its circuit breaker, and every request during the open
  // window was then also recorded as a fresh ProviderHealthMonitor failure —
  // turning 3 real errors into dozens of synthetic ones and sidelining the
  // provider for far longer (and far more totally) than either mechanism
  // intended on its own. The two must stay decoupled: only a call the
  // breaker actually attempted may count against the health monitor.
  it('a caller that skips recording CircuitOpenError does not compound into ProviderHealthMonitor.Unavailable', async () => {
    const breaker = new ProviderCircuitBreaker({ failureThreshold: 3, openTimeoutMs: 10_000 });
    const monitor = new ProviderHealthMonitor(5, 10);
    const provider = {};

    const call = async () => {
      try {
        await breaker.execute(() => Promise.reject(new Error('upstream down')));
      } catch (err) {
        if (!(err instanceof CircuitOpenError)) monitor.recordFailure(provider);
      }
    };

    // 3 genuine failures open the breaker (below the monitor's own
    // degradedThreshold of 5, so it's still Healthy on the monitor's terms).
    await call();
    await call();
    await call();
    expect(monitor.getStatus(provider)).toBe('Healthy');

    // 20 more calls land while the breaker is open — all CircuitOpenError,
    // none of them real provider attempts.
    for (let i = 0; i < 20; i++) await call();

    // Only the 3 genuine failures should be on record — nowhere near the
    // unavailableThreshold(10), let alone Unavailable.
    expect(monitor.getStatus(provider)).toBe('Healthy');
  });

  it('demonstrates the bug when a caller naively records every rejection (regression guard)', async () => {
    const breaker = new ProviderCircuitBreaker({ failureThreshold: 3, openTimeoutMs: 10_000 });
    const monitor = new ProviderHealthMonitor(5, 10);
    const provider = {};

    const naiveCall = async () => {
      try {
        await breaker.execute(() => Promise.reject(new Error('upstream down')));
      } catch {
        monitor.recordFailure(provider); // the old, buggy behaviour
      }
    };

    for (let i = 0; i < 3; i++) await naiveCall();
    for (let i = 0; i < 20; i++) await naiveCall();

    // This is what production hit: 3 real errors ballooned into Unavailable.
    expect(monitor.getStatus(provider)).toBe('Unavailable');
  });
});
