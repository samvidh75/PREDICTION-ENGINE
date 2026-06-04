import { loadAuthSession } from "../auth/sessionStore";
import { AnalyticsCoordinator } from "../diagnostics/AnalyticsCoordinator";

export type AlertCategory = "Factor" | "Risk" | "Momentum" | "News" | "Market";

export interface SmartAlert {
  id: string;
  category: AlertCategory;
  title: string;
  body: string;
  timestamp: string;
  symbol: string;
  isRead: boolean;
}

const STORAGE_KEY_PREFIX = "stockstory_alerts_v2";
const SETTINGS_KEY_PREFIX = "stockstory_alert_settings_v1";

const DEFAULT_ALERTS: SmartAlert[] = [
  {
    id: "a1",
    category: "Factor",
    title: "Factor Rating Upgraded",
    body: "RELIANCE has moved to a high health classification as operating margins consolidate.",
    timestamp: "10 mins ago",
    symbol: "RELIANCE",
    isRead: false
  },
  {
    id: "a2",
    category: "Risk",
    title: "Risk Level Drift",
    body: "INFY is showing minor risk exposure drift due to tech sector volatility adjustments.",
    timestamp: "1 hour ago",
    symbol: "INFY",
    isRead: false
  },
  {
    id: "a3",
    category: "News",
    title: "High-Sentiment News Detected",
    body: "HAL cleared significant government project clearances, stabilizing domestic manufacturing timelines.",
    timestamp: "3 hours ago",
    symbol: "HAL",
    isRead: true
  },
  {
    id: "a4",
    category: "Momentum",
    title: "Momentum Breakout Active",
    body: "HDFCBANK pricing has expanded beyond the 50-day moving average with supportive retail volumes.",
    timestamp: "5 hours ago",
    symbol: "HDFCBANK",
    isRead: false
  },
  {
    id: "a5",
    category: "Market",
    title: "Market Regime Switch",
    body: "Broad Indian indices entered a BULL regime with 82% of tickers trading above their 50-day average.",
    timestamp: "1 day ago",
    symbol: "NIFTY50",
    isRead: true
  }
];

export class AlertEngine {
  private static getStorageKey(): string {
    const uid = loadAuthSession().uid || "anonymous";
    return `${STORAGE_KEY_PREFIX}_${uid}`;
  }

  private static getSettingsKey(): string {
    const uid = loadAuthSession().uid || "anonymous";
    return `${SETTINGS_KEY_PREFIX}_${uid}`;
  }

  private static isInitialSyncStarted = false;

  private static syncAlertsWithBackend(): void {
    if (typeof window === "undefined") return;
    const uid = loadAuthSession().uid || "anonymous";
    
    fetch(`/api/alerts?uid=${uid}`)
      .then(res => res.json())
      .then((lists: SmartAlert[]) => {
        if (Array.isArray(lists) && lists.length > 0) {
          const key = this.getStorageKey();
          window.localStorage.setItem(key, JSON.stringify(lists));
          // Dispatch a custom event to notify listening pages
          window.dispatchEvent(new Event("alertchange"));
        }
      })
      .catch(() => {});
  }

  public static getAlerts(): SmartAlert[] {
    if (typeof window === "undefined") return DEFAULT_ALERTS;
    
    if (!this.isInitialSyncStarted) {
      this.isInitialSyncStarted = true;
      this.syncAlertsWithBackend();
    }

    const key = this.getStorageKey();
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      window.localStorage.setItem(key, JSON.stringify(DEFAULT_ALERTS));
      return DEFAULT_ALERTS;
    }
    try {
      return JSON.parse(raw) as SmartAlert[];
    } catch {
      return DEFAULT_ALERTS;
    }
  }

  public static saveAlerts(alerts: SmartAlert[]): void {
    if (typeof window === "undefined") return;
    const key = this.getStorageKey();
    window.localStorage.setItem(key, JSON.stringify(alerts));
    window.dispatchEvent(new Event("alertchange"));

    // Async sync to backend
    const uid = loadAuthSession().uid || "anonymous";
    fetch(`/api/investor-state?uid=${uid}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alerts })
    }).catch(() => {});
  }

  public static generateAlert(category: AlertCategory, symbol: string, title: string, body: string): void {
    if (!this.isCategoryEnabled(category)) return;
    const alerts = this.getAlerts();
    const next: SmartAlert = {
      id: Math.random().toString(36).substring(2, 9),
      category,
      title,
      body,
      timestamp: "Just now",
      symbol,
      isRead: false
    };
    alerts.unshift(next);
    this.saveAlerts(alerts);

    const uid = loadAuthSession().uid || "anonymous";
    AnalyticsCoordinator.trackEvent("alert_created", JSON.stringify({
      uid,
      alert_type: category,
      timestamp: new Date().toISOString()
    }));
  }

  public static markAsRead(id: string): void {
    const alerts = this.getAlerts();
    const found = alerts.find(a => a.id === id);
    if (found) {
      found.isRead = true;
      this.saveAlerts(alerts);
    }
  }

  public static markAllAsRead(): void {
    const alerts = this.getAlerts();
    alerts.forEach(a => { a.isRead = true; });
    this.saveAlerts(alerts);
  }

  public static deleteAlert(id: string): void {
    const alerts = this.getAlerts();
    const next = alerts.filter(a => a.id !== id);
    this.saveAlerts(next);
  }

  // Enable/Disable category channels
  public static isCategoryEnabled(category: AlertCategory): boolean {
    if (typeof window === "undefined") return true;
    const key = this.getSettingsKey();
    const raw = window.localStorage.getItem(key);
    if (!raw) return true;
    try {
      const parsed = JSON.parse(raw) as Record<AlertCategory, boolean>;
      return parsed[category] !== false;
    } catch {
      return true;
    }
  }

  public static setCategoryStatus(category: AlertCategory, isEnabled: boolean): void {
    if (typeof window === "undefined") return;
    const key = this.getSettingsKey();
    let current: Record<AlertCategory, boolean> = {
      Factor: true,
      Risk: true,
      Momentum: true,
      News: true,
      Market: true
    };
    const raw = window.localStorage.getItem(key);
    if (raw) {
      try { current = JSON.parse(raw); } catch { /* ignore */ }
    }
    current[category] = isEnabled;
    window.localStorage.setItem(key, JSON.stringify(current));
  }
}
export default AlertEngine;
