import { describe, expect, it } from 'vitest';
import { ProviderCallLedger } from './ProviderCallLedger';
import type { CallLedgerEntry } from './types';

function entry(overrides: Partial<Omit<CallLedgerEntry, 'id' | 'createdAt'>> = {}): Omit<CallLedgerEntry, 'id' | 'createdAt'> {
  return {
    provider: 'test',
    operation: 'quote',
    symbol: 'ABC',
    requestKeyHash: 'hash',
    cacheState: 'miss',
    coalescedFollowerCount: 0,
    actualUpstreamCalls: 1,
    attemptCount: 1,
    statusClass: 'success',
    errorCategory: null,
    latencyMs: 10,
    quotaRemaining: 99,
    cooldownUntil: null,
    sourceAsOf: null,
    retrievedAt: '2026-06-13T00:00:00.000Z',
    ...overrides,
  };
}

describe('ProviderCallLedger', () => {
  it('sums coalesced follower counts in aggregate stats', () => {
    const ledger = new ProviderCallLedger();

    ledger.record(entry({ coalescedFollowerCount: 2 }));
    ledger.record(entry({ coalescedFollowerCount: 3, statusClass: 'rate_limited', errorCategory: 'retryable_429' }));

    expect(ledger.getStats()).toMatchObject({
      totalCalls: 2,
      totalUpstreamCalls: 2,
      totalCoalesced: 5,
      successCount: 1,
      errorCount: 1,
      rateLimitedCount: 1,
    });
  });

  it('keeps bounded memory while forwarding records to a persistence adapter', async () => {
    const persisted: CallLedgerEntry[] = [];
    const ledger = new ProviderCallLedger(1, {
      record: persistedEntry => {
        persisted.push(persistedEntry);
      },
    });

    ledger.record(entry({ symbol: 'ABC' }));
    ledger.record(entry({ symbol: 'XYZ' }));
    await Promise.resolve();

    expect(ledger.getEntries()).toHaveLength(1);
    expect(ledger.getEntries()[0]?.symbol).toBe('XYZ');
    expect(persisted.map(e => e.symbol)).toEqual(['ABC', 'XYZ']);
  });
});
