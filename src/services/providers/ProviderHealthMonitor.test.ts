import { describe, it, expect } from 'vitest';
import { ProviderHealthMonitor } from './ProviderHealthMonitor';

class FakeProvider {}

describe('ProviderHealthMonitor', () => {
  it('escalates Healthy → Degraded → Unavailable as failures accumulate', () => {
    const monitor = new ProviderHealthMonitor(5, 10);
    const provider = new FakeProvider();

    expect(monitor.getStatus(provider)).toBe('Healthy');

    for (let i = 0; i < 5; i++) monitor.recordFailure(provider);
    expect(monitor.getStatus(provider)).toBe('Degraded');

    for (let i = 0; i < 5; i++) monitor.recordFailure(provider);
    expect(monitor.getStatus(provider)).toBe('Unavailable');
  });

  it('clears failures on success', () => {
    const monitor = new ProviderHealthMonitor(5, 10);
    const provider = new FakeProvider();

    for (let i = 0; i < 10; i++) monitor.recordFailure(provider);
    expect(monitor.getStatus(provider)).toBe('Unavailable');

    monitor.recordSuccess(provider);
    expect(monitor.getStatus(provider)).toBe('Healthy');
  });

  // The bug this guards against: an Unavailable provider is skipped outright by
  // ProviderCoordinator.invokeChain(), so it can never be called, so it can
  // never record the success that would clear it. Without a cooldown the
  // sideline was permanent for the process lifetime and every request 503'd
  // without attempting a fetch.
  it('re-probes an Unavailable provider once the cooldown elapses', () => {
    const monitor = new ProviderHealthMonitor(5, 10, 50);
    const provider = new FakeProvider();

    for (let i = 0; i < 10; i++) monitor.recordFailure(provider);
    expect(monitor.getStatus(provider)).toBe('Unavailable');

    // Still sidelined immediately after failing.
    expect(monitor.getStatus(provider)).toBe('Unavailable');

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        // Half-open: Degraded is attempted by invokeChain, Unavailable is not.
        expect(monitor.getStatus(provider)).toBe('Degraded');

        // A successful probe restores full health.
        monitor.recordSuccess(provider);
        expect(monitor.getStatus(provider)).toBe('Healthy');
        resolve();
      }, 60);
    });
  });

  it('waits out another cooldown when the probe fails again', () => {
    const monitor = new ProviderHealthMonitor(5, 10, 50);
    const provider = new FakeProvider();

    for (let i = 0; i < 10; i++) monitor.recordFailure(provider);

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(monitor.getStatus(provider)).toBe('Degraded');

        monitor.recordFailure(provider);
        expect(monitor.getStatus(provider)).toBe('Unavailable');
        resolve();
      }, 60);
    });
  });

  it('tracks providers independently', () => {
    const monitor = new ProviderHealthMonitor(5, 10);
    class OtherProvider {}
    const failing = new FakeProvider();
    const healthy = new OtherProvider();

    for (let i = 0; i < 10; i++) monitor.recordFailure(failing);

    expect(monitor.getStatus(failing)).toBe('Unavailable');
    expect(monitor.getStatus(healthy)).toBe('Healthy');
  });
});
