/**
 * Index Change Tracker
 *
 * Tracks changes in index membership — additions, removals, and rebalancing events.
 * Provides query methods for recent changes and per-symbol histories.
 */

import type { IndexChangeEvent, IndexName } from './IndexTypes';

function stableHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

export class IndexChangeTracker {
  private changes: IndexChangeEvent[] = [];

  /** Record an index change event */
  recordChange(event: Omit<IndexChangeEvent, 'id' | 'detectedAt'>): IndexChangeEvent {
    const key = `${event.indexName}:${event.symbol}:${event.changeType}:${event.effectiveDate}:${Date.now()}`;
    const id = `chg_${stableHash(key)}`;
    const newEvent: IndexChangeEvent = {
      ...event,
      id,
      detectedAt: new Date().toISOString(),
    };
    this.changes.push(newEvent);
    return newEvent;
  }

  /** Get all changes for a specific symbol */
  getChangesBySymbol(symbol: string): IndexChangeEvent[] {
    return this.changes
      .filter(c => c.symbol === symbol)
      .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
  }

  /** Get recent changes, optionally filtered by index and limit */
  getRecentChanges(options?: {
    indexName?: IndexName;
    limit?: number;
    since?: string;
    changeType?: 'added' | 'removed' | 'rebalanced';
  }): IndexChangeEvent[] {
    let filtered = [...this.changes];

    if (options?.indexName) {
      filtered = filtered.filter(c => c.indexName === options.indexName);
    }
    if (options?.since) {
      filtered = filtered.filter(c => c.effectiveDate >= options.since!);
    }
    if (options?.changeType) {
      filtered = filtered.filter(c => c.changeType === options.changeType);
    }

    filtered.sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));

    if (options?.limit && options.limit > 0) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }
}

export const indexChangeTracker = new IndexChangeTracker();