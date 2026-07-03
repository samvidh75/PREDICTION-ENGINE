import { v4 as uuidv4 } from 'uuid';

interface AnalyticsEvent {
  event: string;
  timestamp: number;
  metadata?: Record<string, string | number | boolean>;
}

const PENDING_KEY = 'stockstory_analytics_pending_v2';
const SESSION_ID_KEY = 'stockstory_session_id';
const BATCH_SIZE = 50;

export class AnonymousAnalytics {
  private sessionId: string;
  private remoteUrl: string;

  constructor(remoteUrl: string = '') {
    let sid = sessionStorage.getItem(SESSION_ID_KEY);
    if (!sid) {
      sid = uuidv4();
      sessionStorage.setItem(SESSION_ID_KEY, sid);
    }
    this.sessionId = sid;
    this.remoteUrl = remoteUrl;

    window.addEventListener('online', () => this.flush());
    this.flushOnBeforeUnload();
  }

  setRemoteUrl(url: string) {
    this.remoteUrl = url;
  }

  track(event: string, metadata?: Record<string, string | number | boolean>) {
    const payload: AnalyticsEvent = { event, timestamp: Date.now(), metadata };
    const pending = this.getPending();
    pending.push(payload);
    localStorage.setItem(PENDING_KEY, JSON.stringify(pending));

    if (pending.length >= BATCH_SIZE) {
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
        body: JSON.stringify({
          sessionId: this.sessionId,
          events: pending,
          sentAt: Date.now(),
        }),
        keepalive: true,
      });

      if (response.ok) {
        localStorage.removeItem(PENDING_KEY);
      }
    } catch {
      /* will retry on next flush */
    }
  }

  private flushOnBeforeUnload() {
    if (typeof window !== 'undefined' && 'addEventListener' in window) {
      window.addEventListener('beforeunload', () => {
        const pending = this.getPending();
        if (pending.length > 0 && this.remoteUrl) {
          navigator.sendBeacon(
            this.remoteUrl,
            new Blob(
              [
                JSON.stringify({
                  sessionId: this.sessionId,
                  events: pending,
                  sentAt: Date.now(),
                }),
              ],
              { type: 'application/json' }
            )
          );
        }
      });
    }
  }

  private getPending(): AnalyticsEvent[] {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : [];
  }
}

export const analytics = new AnonymousAnalytics(
  import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api/analytics/anonymous`
    : ''
);
