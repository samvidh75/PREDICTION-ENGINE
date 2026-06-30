/**
 * TRACK-50 AGENT A — Event Analytics Framework
 * 
 * Typed event definitions for the entire StockStory India application.
 * Tracks: Discovery, Engagement, Trust, Retention events.
 * Non-blocking, fire-and-forget. Respects user privacy (no PII).
 */
export type EventCategory = 'discovery' | 'engagement' | 'trust' | 'retention';

export interface AnalyticsEvent {
  category: EventCategory;
  action: string;
  label?: string;
  value?: number;
  timestamp: string;
  page?: string;
  metadata?: Record<string, string | number | boolean>;
}

// ── DISCOVERY EVENTS ───────────────────────────────────────────────────────

export interface SearchEvent extends AnalyticsEvent {
  category: 'discovery';
  action: 'search_performed' | 'search_success' | 'search_failed' | 'search_selected';
  label: string; // search query
  metadata: {
    symbols_found: number;
    time_ms: number;
  };
}

export interface StockViewEvent extends AnalyticsEvent {
  category: 'discovery';
  action: 'stock_viewed';
  label: string; // symbol
  metadata: {
    from_page: string;
    is_watchlist: boolean;
  };
}

export interface CompareEvent extends AnalyticsEvent {
  category: 'discovery';
  action: 'compare_performed';
  label: string; // "SYMA_vs_SYMB"
  metadata: {
    symbol_a: string;
    symbol_b: string;
  };
}

// ── ENGAGEMENT EVENTS ───────────────────────────────────────────────────────

export interface SuperpageEngagementEvent extends AnalyticsEvent {
  category: 'engagement';
  action: 'superpage_view' | 'superpage_scroll_50' | 'superpage_scroll_100' | 'superpage_tab_switch';
  label: string; // symbol
  metadata: {
    time_on_page_ms: number;
    sections_viewed: number;
  };
}

export interface WatchlistEvent extends AnalyticsEvent {
  category: 'engagement';
  action: 'watchlist_add' | 'watchlist_remove';
  label: string; // symbol
}

// ── TRUST EVENTS ────────────────────────────────────────────────────────────

export interface TrustEvent extends AnalyticsEvent {
  category: 'trust';
  action: 'trust_centre_visit' | 'prediction_journal_visit' | 'limitations_click';
  metadata?: {
    time_on_page_ms?: number;
    section?: string;
  };
}

// ── RETENTION EVENTS ────────────────────────────────────────────────────────

export interface RetentionEvent extends AnalyticsEvent {
  category: 'retention';
  action: 'session_start' | 'session_end' | 'daily_active' | 'returning_user';
  metadata: {
    session_duration_ms?: number;
    pages_visited?: number;
  };
}

// ── FEEDBACK EVENTS ─────────────────────────────────────────────────────────

export interface FeedbackEvent {
  page: string;
  component?: string;
  symbol?: string;
  feedback_type: 'confusing' | 'useful' | 'missing' | 'incorrect';
  comment?: string;
  timestamp: string;
}

// ── ENGINE ──────────────────────────────────────────────────────────────────

export class EventAnalyticsEngine {
  private events: AnalyticsEvent[] = [];
  private feedbackQueue: FeedbackEvent[] = [];
  private sessionStart: string;
  private pagesVisited: Set<string> = new Set();

  constructor() {
    this.sessionStart = new Date().toISOString();
  }

  // ── Public API ──────────────────────────────────────────────────────────

  trackSearch(event: Omit<SearchEvent, 'category' | 'timestamp'>): void {
    this.record({
      category: 'discovery',
      ...event,
      timestamp: new Date().toISOString(),
    });
  }

  trackStockView(symbol: string, fromPage: string, isWatchlist: boolean): void {
    this.record({
      category: 'discovery',
      action: 'stock_viewed',
      label: symbol,
      timestamp: new Date().toISOString(),
      metadata: { from_page: fromPage, isWatchlist },
    } as any);
  }

  trackCompare(symbolA: string, symbolB: string): void {
    this.record({
      category: 'discovery',
      action: 'compare_performed',
      label: `${symbolA}_vs_${symbolB}`,
      timestamp: new Date().toISOString(),
      metadata: { symbol_a: symbolA, symbol_b: symbolB },
    } as CompareEvent);
  }

  trackSuperpageView(symbol: string, timeMs: number, sectionsViewed: number): void {
    this.record({
      category: 'engagement',
      action: 'superpage_view',
      label: symbol,
      timestamp: new Date().toISOString(),
      metadata: { time_on_page_ms: timeMs, sections_viewed: sectionsViewed },
    } as SuperpageEngagementEvent);
  }

  trackSuperpageScroll(symbol: string, depth: 50 | 100): void {
    this.record({
      category: 'engagement',
      action: `superpage_scroll_${depth}`,
      label: symbol,
      timestamp: new Date().toISOString(),
      metadata: { time_on_page_ms: 0, sections_viewed: depth === 100 ? 7 : 3 },
    } as SuperpageEngagementEvent);
  }

  trackWatchlistAction(action: 'watchlist_add' | 'watchlist_remove', symbol: string): void {
    this.record({
      category: 'engagement',
      action,
      label: symbol,
      timestamp: new Date().toISOString(),
    } as WatchlistEvent);
  }

  trackTrustVisit(page: 'trust_centre' | 'prediction_journal', timeMs?: number): void {
    this.record({
      category: 'trust',
      action: page === 'trust_centre' ? 'trust_centre_visit' : 'prediction_journal_visit',
      timestamp: new Date().toISOString(),
      metadata: timeMs ? { time_on_page_ms: timeMs } : undefined,
    } as TrustEvent);
  }


  trackSessionStart(): void {
    this.sessionStart = new Date().toISOString();
    this.record({
      category: 'retention',
      action: 'session_start',
      timestamp: this.sessionStart,
      metadata: {},
    } as RetentionEvent);
  }

  trackSessionEnd(): void {
    const duration = Date.now() - new Date(this.sessionStart).getTime();
    this.record({
      category: 'retention',
      action: 'session_end',
      timestamp: new Date().toISOString(),
      metadata: {
        session_duration_ms: duration,
        pages_visited: this.pagesVisited.size,
      },
    } as RetentionEvent);
  }

  trackPageVisit(page: string): void {
    this.pagesVisited.add(page);
  }

  // ── Feedback ────────────────────────────────────────────────────────────

  submitFeedback(feedback: Omit<FeedbackEvent, 'timestamp'>): void {
    const event: FeedbackEvent = {
      ...feedback,
      timestamp: new Date().toISOString(),
    };
    this.feedbackQueue.push(event);

    // Fire-and-forget to backend
    try {
      fetch('/api/analytics/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // Analytics failures must never break the UI
    }
  }

  // ── Batch flush ─────────────────────────────────────────────────────────

  flush(): void {
    if (this.events.length === 0) return;

    const batch = [...this.events];
    this.events = [];

    try {
      fetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: batch }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // Silently fail — analytics must never break the user experience
    }
  }

  getEventCount(): number {
    return this.events.length;
  }

  getFeedbackQueue(): FeedbackEvent[] {
    return [...this.feedbackQueue];
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private record(event: AnalyticsEvent): void {
    this.events.push(event);

    // Auto-flush every 10 events to avoid memory buildup
    if (this.events.length >= 10) {
      this.flush();
    }
  }
}

// Singleton
export const analytics = new EventAnalyticsEngine();
export default EventAnalyticsEngine;
