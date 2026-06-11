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

interface RemoteAlertRow {
  id: string | number;
  alert_type?: string;
  category?: AlertCategory;
  title: string;
  body: string;
  created_at?: string;
  timestamp?: string;
  symbol: string;
  is_read?: boolean | number;
  isRead?: boolean;
}

interface RemoteAlertEnvelope {
  alerts?: RemoteAlertRow[];
  unreadCount?: number;
}

const STORAGE_KEY_PREFIX = "stockstory_alerts_v3";
const SETTINGS_KEY_PREFIX = "stockstory_alert_settings_v1";
const EMPTY_ALERTS: SmartAlert[] = [];
const ALERT_EVENT_NAME = "alertchange";

function dispatchAlertChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ALERT_EVENT_NAME));
}

function categoryForRemoteType(type?: string): AlertCategory {
  switch (type) {
    case "health_change":
    case "prediction_upgrade":
    case "prediction_downgrade":
      return "Factor";
    case "confidence_change":
      return "Risk";
    case "new_opportunity":
      return "Market";
    default:
      return "News";
  }
}

function adaptRemoteAlert(row: RemoteAlertRow): SmartAlert {
  return {
    id: String(row.id),
    category: row.category || categoryForRemoteType(row.alert_type),
    title: row.title,
    body: row.body,
    timestamp: row.timestamp || row.created_at || "Data unavailable",
    symbol: row.symbol,
    isRead: row.isRead ?? Boolean(row.is_read),
  };
}

function mergeAlerts(local: SmartAlert[], remote: SmartAlert[]): SmartAlert[] {
  const byId = new Map<string, SmartAlert>();
  for (const alert of local) byId.set(alert.id, alert);
  for (const alert of remote) byId.set(alert.id, alert);
  return [...byId.values()].sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
}

export class AlertEngine {
  private static isInitialSyncStarted = false;

  private static getStorageKey(): string {
    const uid = loadAuthSession().uid || "anonymous";
    return `${STORAGE_KEY_PREFIX}_${uid}`;
  }

  private static getSettingsKey(): string {
    const uid = loadAuthSession().uid || "anonymous";
    return `${SETTINGS_KEY_PREFIX}_${uid}`;
  }

  private static readLocalAlerts(): SmartAlert[] {
    if (typeof window === "undefined") return [...EMPTY_ALERTS];
    const raw = window.localStorage.getItem(this.getStorageKey());
    if (!raw) return [...EMPTY_ALERTS];
    try {
      const parsed = JSON.parse(raw) as SmartAlert[];
      return Array.isArray(parsed) ? parsed : [...EMPTY_ALERTS];
    } catch {
      return [...EMPTY_ALERTS];
    }
  }

  private static writeLocalAlerts(alerts: SmartAlert[]): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(this.getStorageKey(), JSON.stringify(alerts));
    dispatchAlertChange();
  }

  private static syncAlertsWithBackend(): void {
    if (typeof window === "undefined") return;

    authenticatedFetchOnlyIfSignedIn("/api/alerts")
      .then(async (response) => {
        if (!response || !response.ok) return;
        const envelope = await response.json() as RemoteAlertEnvelope;
        const remote = Array.isArray(envelope.alerts) ? envelope.alerts.map(adaptRemoteAlert) : [];
        if (remote.length === 0) return;
        this.writeLocalAlerts(mergeAlerts(this.readLocalAlerts(), remote));
      })
      .catch(() => {
        // Remote failure never erases the local-first cache.
      });
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
    this.writeLocalAlerts(alerts);
  }

  public static generateAlert(category: AlertCategory, symbol: string, title: string, body: string): void {
    if (!this.isCategoryEnabled(category)) return;
    const alerts = this.getAlerts();
    const next: SmartAlert = {
      id: `local-${Date.now().toString(36)}`,
      category,
      title,
      body,
      timestamp: new Date().toISOString(),
      symbol,
      isRead: false,
    };
    alerts.unshift(next);
    this.writeLocalAlerts(alerts);

    AnalyticsCoordinator.trackEvent("alert_created", JSON.stringify({
      alert_type: category,
      timestamp: new Date().toISOString(),
    }));
  }

  public static markAsRead(id: string): void {
    const alerts = this.getAlerts();
    const found = alerts.find(a => a.id === id);
    if (!found) return;
    found.isRead = true;
    this.writeLocalAlerts(alerts);

    if (!id.startsWith("local-")) {
      authenticatedFetchOnlyIfSignedIn(`/api/alerts/${encodeURIComponent(id)}/read`, { method: "POST" }).catch(() => {
        // Local state remains available if remote persistence fails.
      });
    }
  }

  public static markAllAsRead(): void {
    const alerts = this.getAlerts();
    alerts.forEach(a => { a.isRead = true; });
    this.writeLocalAlerts(alerts);
    authenticatedFetchOnlyIfSignedIn("/api/alerts/read-all", { method: "POST" }).catch(() => {
      // Local state remains available if remote persistence fails.
    });
  }

  public static deleteAlert(id: string): void {
    const next = this.getAlerts().filter(a => a.id !== id);
    this.writeLocalAlerts(next);

    if (!id.startsWith("local-")) {
      authenticatedFetchOnlyIfSignedIn(`/api/alerts/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {
        // Local dismissal remains available if remote persistence fails.
      });
    }
  }

  public static isCategoryEnabled(category: AlertCategory): boolean {
    if (typeof window === "undefined") return true;
    const raw = window.localStorage.getItem(this.getSettingsKey());
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
      Market: true,
    };
    const raw = window.localStorage.getItem(key);
    if (raw) {
      try { current = JSON.parse(raw); } catch { /* keep defaults */ }
    }
    current[category] = isEnabled;
    window.localStorage.setItem(key, JSON.stringify(current));
  }
}

export default AlertEngine;
