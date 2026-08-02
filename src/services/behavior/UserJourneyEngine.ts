// src/services/behavior/UserJourneyEngine.ts

export interface UserEvent {
  id: string;
  timestamp: number;
  type: 'search' | 'stock_explore' | 'watchlist_create' | 'portfolio_use' | 'upgrade_click' | 'feature_discover';
  metadata: Record<string, any>;
}

export class UserJourneyEngine {
  private static STORAGE_KEY = 'stockstory_user_journey_events';

  public static trackEvent(
    type: UserEvent['type'],
    metadata: Record<string, any> = {}
  ): void {
    const event: UserEvent = {
      id: (globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296).toString(36).substring(2, 11),
      timestamp: Date.now(),
      type,
      metadata,
    };

    try {
      const existing = this.getEvents();
      existing.push(event);
      // Keep last 200 events for locally personalized curation
      if (existing.length > 200) {
        existing.shift();
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existing));
      if (import.meta.env.DEV) {
        console.info(`[UserJourneyEngine] Tracked: ${type}`, metadata);
      }
    } catch (e) {
      if (import.meta.env.DEV) {
        console.warn('[UserJourneyEngine] Failed to save local event', e);
      }
    }
  }

  public static getEvents(): UserEvent[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public static getEventsByType(type: UserEvent['type']): UserEvent[] {
    return this.getEvents().filter((e) => e.type === type);
  }

  public static clearEvents(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
