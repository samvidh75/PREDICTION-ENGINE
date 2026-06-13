/**
 * F3.1A — ProviderCallLedger
 *
 * Records one sanitized entry per actual upstream provider request.
 * Coalesced followers do not get their own upstream entry — they are counted
 * as `coalescedFollowerCount` on the leader's entry.
 * Never contains secrets, tokens, or raw URLs.
 */

import crypto from 'node:crypto';
import type { CallLedgerEntry, ProviderOperation } from './types';

export interface ProviderCallLedgerPersistence {
  record(entry: CallLedgerEntry): void | Promise<void>;
}

export class ProviderCallLedger {
  private entries: CallLedgerEntry[] = [];
  private readonly maxEntries: number;
  private readonly persistence?: ProviderCallLedgerPersistence;

  constructor(maxEntries = 10_000, persistence?: ProviderCallLedgerPersistence) {
    this.maxEntries = maxEntries;
    this.persistence = persistence;
  }

  /**
   * Record a completed upstream provider call.
   */
  record(entry: Omit<CallLedgerEntry, 'id' | 'createdAt'>): CallLedgerEntry {
    const id = crypto.randomUUID();
    const full: CallLedgerEntry = { id, ...entry, createdAt: new Date().toISOString() };

    if (this.entries.length >= this.maxEntries) {
      this.entries.shift();
    }
    this.entries.push(full);
    if (this.persistence) {
      void Promise.resolve(this.persistence.record(full)).catch(() => {
        // Ledger persistence is observational; broker execution should not fail here.
      });
    }
    return full;
  }

  /**
   * Get all recorded ledger entries (newest first).
   */
  getEntries(limit = 100): CallLedgerEntry[] {
    return [...this.entries].reverse().slice(0, limit);
  }

  /**
   * Get entries for a specific provider and operation.
   */
  getEntriesFor(provider: string, operation: ProviderOperation, limit = 50): CallLedgerEntry[] {
    return this.entries
      .filter(e => e.provider === provider && e.operation === operation)
      .reverse()
      .slice(0, limit);
  }

  /**
   * Get aggregate statistics.
   */
  getStats(): {
    totalCalls: number;
    totalUpstreamCalls: number;
    totalCoalesced: number;
    successCount: number;
    errorCount: number;
    rateLimitedCount: number;
  } {
    const upstream = this.entries.filter(e => e.actualUpstreamCalls > 0);
    const errors = this.entries.filter(e => e.statusClass !== 'success' && e.statusClass !== 'coalesced');
    return {
      totalCalls: this.entries.length,
      totalUpstreamCalls: upstream.length,
      totalCoalesced: this.entries.reduce((sum, e) => sum + e.coalescedFollowerCount, 0),
      successCount: this.entries.filter(e => e.statusClass === 'success').length,
      errorCount: errors.length,
      rateLimitedCount: this.entries.filter(e => e.statusClass === 'rate_limited').length,
    };
  }

  /** Clear all entries (for test isolation). */
  clear(): void {
    this.entries = [];
  }
}

export const callLedger = new ProviderCallLedger();
