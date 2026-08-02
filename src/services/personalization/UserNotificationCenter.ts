/**
 * UserNotificationCenter — unified entry point for personal research notifications.
 *
 * Manages:
 *   1. Persistent alerts (from AlertStore — localStorage + remote sync)
 *   2. Ephemeral alerts (in-memory only, session-scoped — e.g., "Score updated")
 *   3. Notification badge count for UI
 *
 * Compliance-safe: no advice, no guarantees, no Buy/Sell/Hold.
 */
import {
  ingestAlerts,
  getAlerts,
  getUnacknowledgedCount,
  getAlertsBySymbol,
  getAlertsByType,
  acknowledgeAlert,
  acknowledgeAllAlerts,
  removeAlert,
  clearAllAlerts,
  subscribeAlerts,
  syncAlertsToRemote,
  pullAlertsFromRemote,
  type AlertStoreItem,
} from "./AlertStore.js";
import type { AlertChangeView } from "../../research/contracts/productContracts.js";

// ── Ephemeral (in-memory) alerts ─────────────────────────────────────────────

let ephemeralAlerts: AlertChangeView[] = [];

/**
 * Push an in-memory-only alert (survives page navigation but not reload).
 */
export function notifyEphemeral(alert: AlertChangeView): void {
  ephemeralAlerts.push(alert);
  // Keep only last 50 ephemeral alerts
  if (ephemeralAlerts.length > 50) {
    ephemeralAlerts = ephemeralAlerts.slice(-50);
  }
}

/**
 * Get all ephemeral alerts (most recent first).
 */
export function getEphemeralAlerts(): AlertChangeView[] {
  return [...ephemeralAlerts].reverse();
}

/**
 * Clear all ephemeral alerts.
 */
export function clearEphemeralAlerts(): void {
  ephemeralAlerts = [];
}

// ── Unified interface ────────────────────────────────────────────────────────

export interface NotificationSnapshot {
  /** Total unacknowledged persistent alerts */
  persistentUnread: number;
  /** Count of current-session ephemeral alerts */
  ephemeralCount: number;
  /** Combined badge count */
  badgeCount: number;
  /** Latest 10 persistent alert items */
  recentPersistent: AlertStoreItem[];
  /** Latest 5 ephemeral alerts */
  recentEphemeral: AlertChangeView[];
}

/**
 * Get a unified snapshot of all notifications for the UI.
 */
export function getNotificationSnapshot(): NotificationSnapshot {
  const persistentUnread = getUnacknowledgedCount();
  const persistentAll = getAlerts();

  return {
    persistentUnread,
    ephemeralCount: ephemeralAlerts.length,
    badgeCount: persistentUnread + ephemeralAlerts.length,
    recentPersistent: persistentAll.slice(0, 10),
    recentEphemeral: getEphemeralAlerts().slice(0, 5),
  };
}

/**
 * Push one or more alerts through the full pipeline:
 *   deduplicate → store → notify listeners.
 */
export function pushAlerts(alerts: AlertChangeView[]): AlertChangeView[] {
  return ingestAlerts(alerts);
}

/**
 * Acknowledge everything (persistent + ephemeral).
 */
export function acknowledgeAll(): void {
  acknowledgeAllAlerts();
  clearEphemeralAlerts();
}

// ── Re-exports for convenience ───────────────────────────────────────────────

export {
  // AlertStore core
  getAlerts,
  getUnacknowledgedCount,
  getAlertsBySymbol,
  getAlertsByType,
  acknowledgeAlert,
  removeAlert,
  clearAllAlerts,
  subscribeAlerts,
  syncAlertsToRemote,
  pullAlertsFromRemote,
};

export type { AlertStoreItem, AlertChangeView };
