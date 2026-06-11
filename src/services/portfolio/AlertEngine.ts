import { loadAuthSession } from "../auth/sessionStore";
import { authenticatedFetchOnlyIfSignedIn } from "../auth/authenticatedFetch";
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
const ALERT_EVENT_NAME = "alertchange";

const EMPTY_ALERTS: SmartAlert[] = [];

function dispatchAlertChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ALERT_EVENT_NAME));
}

function hasAuthenticatedSession(): boolean {
  const session = loadAuthSession();
  return session.status === "authenticated" && Boolean(session.uid);
}

function logRemoteSyncFailure(operation: string, detail: { status?: number; code?: string }): void {
  console.warn("[AlertEngine] remote_sync_failed", {
    component: "AlertEngine",
    operation,
    status: detail.status,
    code: detail.code,
  });
}

function alertTimestamp(alert: SmartAlert): number {
  const parsed = Date.parse(alert.timestamp);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeAlerts(value: unknown): SmartAlert[] {
  if (!Array.isArray(value)) return [];
  return value.filter((alert): alert is SmartAlert => {
    const candidate = adaptRemoteAlert(alert);
    return (
      typeof candidate.id === "string" &&
      typeof candidate.category === "string" &&
      typeof candidate.title === "string" &&
      typeof candidate.body === "string" &&
      typeof candidate.timestamp === "string" &&
      typeof candidate.symbol === "string" &&
      typeof candidate.isRead === "boolean"
    );
  }).map(adaptRemoteAlert);
}

function adaptRemoteAlert(alert: unknown): SmartAlert {
  const candidate = alert as Partial<SmartAlert> & {
    alert_type?: string;
    created_at?: string;
    is_read?: boolean | number;
  };
  return {
    id: String(candidate.id ?? ""),
    category: normalizeCategory(candidate.category ?? candidate.alert_type),
    title: String(candidate.title ?? ""),
    body: String(candidate.body ?? ""),
    timestamp: String(candidate.timestamp ?? candidate.created_at ?? ""),
    symbol: String(candidate.symbol ?? ""),
    isRead: typeof candidate.isRead === "boolean" ? candidate.isRead : Boolean(candidate.is_read),
  };
}

function normalizeCategory(value: unknown): AlertCategory {
  const raw = String(value ?? "").toLowerCase();
  if (raw.includes("risk")) return "Risk";
  if (raw.includes("momentum")) return "Momentum";
  if (raw.includes("news")) return "News";
  if (raw.includes("market")) return "Market";
  return "Factor";
}

function mergeAlertsByTimestamp(localAlerts: SmartAlert[], remoteAlerts: SmartAlert[]): SmartAlert[] {
  const byId = new Map<string, SmartAlert>();
  for (const alert of localAlerts) {
    byId.set(alert.id, alert);
  }
  for (const alert of remoteAlerts) {
    const existing = byId.get(alert.id);
    if (!existing || alertTimestamp(alert) >= alertTimestamp(existing)) {
      byId.set(alert.id, alert);
    }
  }
  return Array.from(byId.values()).sort((a, b) => alertTimestamp(b) - alertTimestamp(a));
}

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
    if (!hasAuthenticatedSession()) return;

    authenticatedFetchOnlyIfSignedIn("/api/alerts")
      .then(async response => {
        if (!response) return;
        if (!response.ok) {
          logRemoteSyncFailure("load", { status: response.status });
          return;
        }
        const payload = await response.json();
        const remoteAlerts = normalizeAlerts(payload?.alerts);
        if (remoteAlerts.length === 0) return;
        const localAlerts = this.readLocalAlerts();
        const merged = mergeAlertsByTimestamp(localAlerts, remoteAlerts);
        window.localStorage.setItem(this.getStorageKey(), JSON.stringify(merged));
        dispatchAlertChange();
      })
      .catch(error => {
        logRemoteSyncFailure("load", { code: error instanceof Error ? error.name : "UNKNOWN_ERROR" });
      });
  }

  private static readLocalAlerts(): SmartAlert[] {
    if (typeof window === "undefined") return [...EMPTY_ALERTS];
    const raw = window.localStorage.getItem(this.getStorageKey());
    if (!raw) return [...EMPTY_ALERTS];
    try {
      return normalizeAlerts(JSON.parse(raw));
    } catch {
      return [...EMPTY_ALERTS];
    }
  }

  public static getAlerts(): SmartAlert[] {
    if (typeof window === "undefined") return [...EMPTY_ALERTS];
    
    if (!this.isInitialSyncStarted) {
      this.isInitialSyncStarted = true;
      this.syncAlertsWithBackend();
    }

    return this.readLocalAlerts();
  }

  public static saveAlerts(alerts: SmartAlert[]): void {
    if (typeof window === "undefined") return;
    const normalizedAlerts = normalizeAlerts(alerts);
    const key = this.getStorageKey();
    window.localStorage.setItem(key, JSON.stringify(normalizedAlerts));
    dispatchAlertChange();

    // Bulk local saves remain local-first. Remote writes use canonical alert mutation endpoints.
  }

  public static generateAlert(category: AlertCategory, symbol: string, title: string, body: string): void {
    if (!this.isCategoryEnabled(category)) return;
    const alerts = this.getAlerts();
    const next: SmartAlert = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
      category,
      title,
      body,
      timestamp: new Date().toISOString(),
      symbol,
      isRead: false
    };
    alerts.unshift(next);
    this.saveAlerts(alerts);
    this.createRemoteAlert(next);

    const uid = loadAuthSession().uid || "anonymous";
    AnalyticsCoordinator.trackEvent("alert_created", JSON.stringify({
      account_state: uid === "anonymous" ? "anonymous" : "authenticated",
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
      this.markRemoteAlertAsRead(id);
    }
  }

  public static markAllAsRead(): void {
    const alerts = this.getAlerts();
    alerts.forEach(a => { a.isRead = true; });
    this.saveAlerts(alerts);
    this.markAllRemoteAlertsAsRead();
  }

  public static deleteAlert(id: string): void {
    const alerts = this.getAlerts();
    const next = alerts.filter(a => a.id !== id);
    this.saveAlerts(next);
    this.deleteRemoteAlert(id);
  }

  private static createRemoteAlert(alert: SmartAlert): void {
    if (!hasAuthenticatedSession()) return;
    authenticatedFetchOnlyIfSignedIn("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: alert.category,
        title: alert.title,
        body: alert.body,
        symbol: alert.symbol,
      }),
    }).then(response => {
      if (response && !response.ok) logRemoteSyncFailure("create", { status: response.status });
    }).catch(error => {
      logRemoteSyncFailure("create", { code: error instanceof Error ? error.name : "UNKNOWN_ERROR" });
    });
  }

  private static markRemoteAlertAsRead(id: string): void {
    if (!hasAuthenticatedSession()) return;
    if (!/^\d+$/.test(id)) return;
    authenticatedFetchOnlyIfSignedIn(`/api/alerts/${id}/read`, { method: "POST" })
      .then(response => {
        if (response && !response.ok) logRemoteSyncFailure("mark_read", { status: response.status });
      })
      .catch(error => logRemoteSyncFailure("mark_read", { code: error instanceof Error ? error.name : "UNKNOWN_ERROR" }));
  }

  private static markAllRemoteAlertsAsRead(): void {
    if (!hasAuthenticatedSession()) return;
    authenticatedFetchOnlyIfSignedIn("/api/alerts/read-all", { method: "POST" })
      .then(response => {
        if (response && !response.ok) logRemoteSyncFailure("mark_all_read", { status: response.status });
      })
      .catch(error => logRemoteSyncFailure("mark_all_read", { code: error instanceof Error ? error.name : "UNKNOWN_ERROR" }));
  }

  private static deleteRemoteAlert(id: string): void {
    if (!hasAuthenticatedSession()) return;
    if (!/^\d+$/.test(id)) return;
    authenticatedFetchOnlyIfSignedIn(`/api/alerts/${id}`, { method: "DELETE" })
      .then(response => {
        if (response && !response.ok) logRemoteSyncFailure("delete", { status: response.status });
      })
      .catch(error => logRemoteSyncFailure("delete", { code: error instanceof Error ? error.name : "UNKNOWN_ERROR" }));
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
