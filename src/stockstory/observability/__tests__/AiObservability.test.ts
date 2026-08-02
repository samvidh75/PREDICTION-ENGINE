import { describe, it, expect, beforeEach } from 'vitest';
import { AiObservability } from '../AiObservability';

describe('AiObservability', () => {
  let obs: AiObservability;

  beforeEach(() => {
    obs = new AiObservability();
  });

  it('stores emitted events', () => {
    obs.emit({
      taskType: 'generate_thesis',
      providerMode: 'deterministic',
      latencyMs: 5,
      validationPassed: true,
      fallbackUsed: false,
      costEstimate: 0,
      timestamp: new Date().toISOString(),
    });

    const events = obs.getEvents();
    expect(events.length).toBe(1);
    expect(events[0].taskType).toBe('generate_thesis');
  });

  it('filters by task type', () => {
    obs.emit({ taskType: 'generate_thesis', providerMode: 'deterministic', latencyMs: 5, validationPassed: true, fallbackUsed: false, costEstimate: 0, timestamp: '2026-01-01' });
    obs.emit({ taskType: 'parse_scanner_query', providerMode: 'deterministic', latencyMs: 3, validationPassed: true, fallbackUsed: false, costEstimate: 0, timestamp: '2026-01-01' });

    const filtered = obs.getEvents({ taskType: 'generate_thesis' });
    expect(filtered.length).toBe(1);
  });

  it('computes stats', () => {
    obs.emit({ taskType: 'generate_thesis', providerMode: 'deterministic', latencyMs: 10, validationPassed: true, fallbackUsed: false, costEstimate: 0, timestamp: '2026-01-01' });
    obs.emit({ taskType: 'generate_thesis', providerMode: 'deterministic', latencyMs: 20, validationPassed: false, fallbackUsed: true, costEstimate: 0, timestamp: '2026-01-01' });

    const stats = obs.getStats();
    expect(stats.totalEvents).toBe(2);
    expect(stats.avgLatencyMs).toBe(15);
    expect(stats.fallbackCount).toBe(1);
    expect(stats.validationFailureCount).toBe(1);
  });

  it('clears events', () => {
    obs.emit({ taskType: 'generate_thesis', providerMode: 'deterministic', latencyMs: 5, validationPassed: true, fallbackUsed: false, costEstimate: 0, timestamp: '2026-01-01' });
    obs.clear();
    expect(obs.getEvents().length).toBe(0);
  });

  it('calls registered handlers', () => {
    let called = false;
    obs.onEvent(() => { called = true; });
    obs.emit({ taskType: 'generate_thesis', providerMode: 'deterministic', latencyMs: 5, validationPassed: true, fallbackUsed: false, costEstimate: 0, timestamp: '2026-01-01' });
    expect(called).toBe(true);
  });

  it('handles callback errors gracefully', () => {
    obs.onEvent(() => { throw new Error('handler error'); });
    expect(() => {
      obs.emit({ taskType: 'generate_thesis', providerMode: 'deterministic', latencyMs: 5, validationPassed: true, fallbackUsed: false, costEstimate: 0, timestamp: '2026-01-01' });
    }).not.toThrow();
  });
});
