/**
 * Privacy-first anonymous telemetry
 * - No PII, no IP storage, no cookies
 * - Only tracks feature usage counts and latency
 */

interface AnalyticsEvent {
  event: string;
  timestamp: number;
  metadata?: Record<string, string | number | boolean>;
}

const PENDING_KEY = 'stockstory_analytics_pending';

class AnonymousAnalytics {
  private isOnline: boolean = navigator.onLine;
  private remoteUrl: string | null = null;

  constructor() {
    window.addEventListener('online', () => this.flush());
    window.addEventListener('offline', () => { this.isOnline = false; });
  }

  setRemoteUrl(url: string) {
    this.remoteUrl = url;
  }

  track(event: string, metadata?: Record<string, string | number | boolean>) {
    const payload: AnalyticsEvent = { event, timestamp: Date.now(), metadata };
    const pending = this.getPending();

    pending.push(payload);
    localStorage.setItem(PENDING_KEY, JSON.stringify(pending));

    if (this.isOnline && this.remoteUrl) {
      this.flush();
    }
  }

  private async flush() {
    const pending = this.getPending();
    if (pending.length === 0 || !this.remoteUrl) return;

    try {
      const response = await fetch(this.remoteUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: pending, sentAt: Date.now() }),
        keepalive: true,
      });

      if (response.ok) {
        localStorage.removeItem(PENDING_KEY);
      } else {
        this.isOnline = false;
      }
    } catch {
      this.isOnline = false;
    }
  }

  private getPending(): AnalyticsEvent[] {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : [];
  }
}

export const analytics = new AnonymousAnalytics();
