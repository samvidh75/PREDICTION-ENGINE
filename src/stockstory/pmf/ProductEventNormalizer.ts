/**
 * ProductEventNormalizer — Normalizes raw analytics events to PMF metric keys.
 *
 * Maps EventAnalyticsEngine events to PmfMetricRegistry metric keys and
 * extracts dimensions for aggregation.
 */

import { PmfMetricRegistry } from './PmfMetricRegistry';

export interface NormalizedMetricEvent {
  metricKey: string;
  timestamp: string;
  userId?: string;
  sessionId?: string;
  value: number;
  dimensions: Record<string, string>;
}

export interface NormalizationResult {
  events: NormalizedMetricEvent[];
  skipped: number;
  errors: string[];
  eventType?: string;
  [Symbol.iterator](): Iterator<NormalizedMetricEvent>;
}

export class ProductEventNormalizer {
  private skipped = 0;
  private errors: string[] = [];
  private _eventType: string | undefined;

  normalize(
    rawEvents: Record<string, unknown> | Array<Record<string, unknown>>,
  ): NormalizationResult {
    this.skipped = 0;
    this.errors = [];
    this._eventType = undefined;

    const arr = Array.isArray(rawEvents) ? rawEvents : [rawEvents];
    const events: NormalizedMetricEvent[] = [];
    const source = arr.length > 0 ? arr[0] : {};

    // Detect and store eventType from the event
    if (typeof source.eventType === 'string') {
      this._eventType = source.eventType;
    }

    for (const raw of arr) {
      try {
        const normalized = this.normalizeOne(raw);
        if (normalized) {
          events.push(normalized);
        } else {
          this.skipped++;
        }
      } catch (err) {
        this.errors.push(
          `Normalization error: ${err instanceof Error ? err.message : String(err)}`,
        );
        this.skipped++;
      }
    }

    const result: NormalizationResult = {
      events,
      skipped: this.skipped,
      errors: this.errors,
      eventType: this._eventType,
      [Symbol.iterator](): Iterator<NormalizedMetricEvent> {
        let i = 0;
        const evts = events;
        return {
          next(): IteratorResult<NormalizedMetricEvent> {
            if (i < evts.length) {
              return { value: evts[i++], done: false };
            }
            return { value: undefined as unknown as NormalizedMetricEvent, done: true };
          },
        };
      },
    };

    return result;
  }

  private normalizeOne(
    raw: Record<string, unknown>,
  ): NormalizedMetricEvent | null {
    const category = String(raw.category ?? '');
    const action = String(raw.action ?? '');
    const label = String(raw.label ?? '');
    const timestamp = String(raw.timestamp ?? new Date().toISOString());
    const userId = raw.userId ? String(raw.userId) : undefined;
    const sessionId = raw.sessionId ? String(raw.sessionId) : undefined;
    const value = typeof raw.value === 'number' ? raw.value : 1;
    const metadata = raw.metadata as Record<string, string | number | boolean> | undefined;

    const metricKey = this.mapToMetricKey(category, action);
    if (!metricKey) return null;

    if (!PmfMetricRegistry.validateKey(metricKey)) {
      this.errors.push(`Unknown metric key: ${metricKey}`);
      return null;
    }

    const dimensions: Record<string, string> = {};
    if (label) dimensions.label = label;
    if (metadata) {
      for (const [k, v] of Object.entries(metadata)) {
        dimensions[k] = String(v);
      }
    }

    return { metricKey, timestamp, userId, sessionId, value, dimensions };
  }

  private mapToMetricKey(category: string, action: string): string | null {
    const map: Record<string, Record<string, string>> = {
      discovery: {
        search_performed: 'pmf.activation.first_search',
        stock_viewed: 'pmf.activation.first_stock_view',
        compare_performed: 'pmf.activation.first_compare',
      },
      engagement: {
        superpage_view: 'pmf.engagement.stock_pages_per_session',
        watchlist_add: 'pmf.activation.first_watchlist_add',
        watchlist_remove: 'pmf.engagement.sessions_per_user',
      },
      retention: {
        session_start: 'pmf.engagement.sessions_per_user',
        session_end: 'pmf.engagement.sessions_per_user',
        daily_active: 'pmf.retention.wau',
        returning_user: 'pmf.retention.d1',
      },
      trust: {
        trust_centre_visit: 'pmf.premium.intent_click_rate',
      },
    };

    return map[category]?.[action] ?? null;
  }

  getSkippedCount(): number {
    return this.skipped;
  }

  getErrorCount(): number {
    return this.errors.length;
  }

  reset(): void {
    this.skipped = 0;
    this.errors = [];
  }
}
