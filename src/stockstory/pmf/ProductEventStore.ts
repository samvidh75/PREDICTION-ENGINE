/**
 * ProductEventStore — In-memory + persistence abstraction for PMF metric events.
 *
 * Stores NormalizedMetricEvents in a ring buffer for real-time queries
 * and provides batch flush for persistence.
 */

import type { NormalizedMetricEvent } from './ProductEventNormalizer';

export interface StoredMetricEvent extends NormalizedMetricEvent {
  id: string;
  storedAt: string;
}

export type PersistFn = (events: StoredMetricEvent[]) => Promise<void>;

export interface StoreStats {
  totalStored: number;
  bufferSize: number;
  flushCount: number;
  oldestTimestamp: string | null;
  newestTimestamp: string | null;
}

const DEFAULT_MAX_BUFFER = 10_000;

export class ProductEventStore {
  private buffer: StoredMetricEvent[] = [];
  private flushCount = 0;
  private totalStored = 0;
  private persistFn: PersistFn | null = null;
  private maxBuffer: number;

  constructor(opts?: { maxBuffer?: number; persistFn?: PersistFn }) {
    this.maxBuffer = opts?.maxBuffer ?? DEFAULT_MAX_BUFFER;
    this.persistFn = opts?.persistFn ?? null;
  }

  setPersistFn(fn: PersistFn): void {
    this.persistFn = fn;
  }

  store(event: NormalizedMetricEvent): StoredMetricEvent {
    const stored: StoredMetricEvent = {
      ...event,
      id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      storedAt: new Date().toISOString(),
    };

    this.buffer.push(stored);
    this.totalStored++;

    if (this.buffer.length >= this.maxBuffer) {
      this.flush().catch(() => {});
    }

    return stored;
  }

  storeBatch(events: NormalizedMetricEvent[]): StoredMetricEvent[] {
    return events.map((e) => this.store(e));
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0 || !this.persistFn) return;

    const batch = this.buffer.splice(0, this.buffer.length);
    this.flushCount++;

    try {
      await this.persistFn(batch);
    } catch {
      // Re-add to buffer on failure
      this.buffer.unshift(...batch);
      // Trim buffer to max size
      if (this.buffer.length > this.maxBuffer) {
        this.buffer.splice(this.maxBuffer);
      }
    }
  }

  queryRecent(count: number): StoredMetricEvent[] {
    return this.buffer.slice(-count);
  }

  queryByMetricKey(metricKey: string, limit = 100): StoredMetricEvent[] {
    const results: StoredMetricEvent[] = [];
    // Search from newest to oldest
    for (let i = this.buffer.length - 1; i >= 0 && results.length < limit; i--) {
      if (this.buffer[i].metricKey === metricKey) {
        results.unshift(this.buffer[i]);
      }
    }
    return results;
  }

  getStats(): StoreStats {
    return {
      totalStored: this.totalStored,
      bufferSize: this.buffer.length,
      flushCount: this.flushCount,
      oldestTimestamp: this.buffer.length > 0 ? this.buffer[0].timestamp : null,
      newestTimestamp:
        this.buffer.length > 0 ? this.buffer[this.buffer.length - 1].timestamp : null,
    };
  }

  clear(): void {
    this.buffer = [];
  }
}
