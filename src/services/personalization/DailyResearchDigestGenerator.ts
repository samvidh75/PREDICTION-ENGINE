/**
 * DailyResearchDigestGenerator — produces daily and weekly research summaries.
 *
 * Aggregates:
 *   - Watchlist thesis changes (from ThesisHistoryStore)
 *   - Recent alerts (from AlertStore)
 *   - Top movers by score change
 *
 * Generates DailyResearchDigest payloads for display or email.
 * Compliance-safe: research signals only — no advice, no guarantees.
 */
import { getLatestThesisMap, getAllThesisSymbols, type ThesisSnapshot } from "./ThesisHistoryStore.js";
import { getAlerts, getUnacknowledgedCount, type AlertStoreItem } from "./AlertStore.js";
import type {
  DailyResearchDigest,
  ResearchDigestItem,
  WatchlistThesisView,
  AlertChangeView,
} from "../../research/contracts/productContracts.js";
import { loadAuthSession } from "../auth/sessionStore";

// ── Types ────────────────────────────────────────────────────────────────────

export interface DigestOptions {
  /** Limit on number of watchlist updates shown */
  maxWatchlistUpdates?: number;
  /** Only include alerts from the last N days */
  alertWindowDays?: number;
  /** If true, only include thesis changes (not stable items) */
  changesOnly?: boolean;
}

export interface WeeklyReviewItem {
  symbol: string;
  companyName: string;
  thesisHistory: ThesisSnapshot[];
  currentThesis: WatchlistThesisView;
  /** Whether thesis strengthened or weakened over the week */
  trend: "improving" | "stable" | "declining";
}

export interface WeeklyThesisReview {
  weekStart: string;
  weekEnd: string;
  uid: string;
  reviewedSymbols: WeeklyReviewItem[];
  alertsTriggeredThisWeek: number;
  thesesImproved: number;
  thesesDeclined: number;
  thesesStable: number;
  generatedAt: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function resolveUid(): string {
  return loadAuthSession().uid ?? "anonymous";
}

function filterByWindow<T extends { timestamp?: string }>(
  items: T[],
  days: number
): T[] {
  if (days <= 0) return items;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return items.filter((item) => {
    const ts = item.timestamp ? new Date(item.timestamp).getTime() : 0;
    return ts >= cutoff;
  });
}

function alertToDigestItem(alert: AlertChangeView): ResearchDigestItem {
  return {
    symbol: alert.symbol,
    companyName: alert.symbol, // Best effort — can be enriched later
    alertType: alert.type,
    title: alert.title,
    body: alert.body,
    thesisStatus: null,
    score: null,
  };
}

// ── Generator ────────────────────────────────────────────────────────────────

export class DigestGenerator {
  /**
   * Generate a daily research digest.
   */
  static generate(
    options: DigestOptions = {}
  ): DailyResearchDigest {
    const { maxWatchlistUpdates = 20, alertWindowDays = 1, changesOnly = false } = options;
    const uid = resolveUid();

    // ── Alerts ──────────────────────────────────────────────────────────
    const allAlerts = getAlerts();
    const windowAlerts = filterByWindow(
      allAlerts.map((a) => a.alert),
      alertWindowDays
    );
    const byType: Record<string, number> = {};
    for (const a of windowAlerts) {
      byType[a.type] = (byType[a.type] ?? 0) + 1;
    }

    // ── Thesis changes ───────────────────────────────────────────────────
    const allSymbols = getAllThesisSymbols();
    const thesisChanges: DailyResearchDigest["thesisChanges"] = [];

    // Compare latest snapshot with previous snapshot for each symbol
    for (const { symbol, latest } of allSymbols) {
      const allSnapshots = /* will load from store separately if needed */ [];
      // For now, derive thesisChange from current vs previous snapshot
      if (changesOnly && latest.thesis.currentStatus === "Stable") continue;

      thesisChanges.push({
        symbol,
        from: null, // Would need previous snapshot lookup
        to: latest.thesis.currentStatus as WatchlistThesisView["currentStatus"],
      });
    }

    // ── Watchlist updates ────────────────────────────────────────────────
    const watchlistUpdates: ResearchDigestItem[] = windowAlerts
      .slice(0, maxWatchlistUpdates)
      .map(alertToDigestItem);

    // ── Top movers ───────────────────────────────────────────────────────
    const topMovers: DailyResearchDigest["topMovers"] = allSymbols
      .map(({ symbol, latest }) => ({
        symbol,
        scoreChange: latest.thesis.score ?? 0,
      }))
      .sort((a, b) => b.scoreChange - a.scoreChange)
      .slice(0, 5);

    return {
      date: new Date().toISOString().split("T")[0],
      uid,
      watchlistUpdates,
      alertSummary: {
        total: windowAlerts.length,
        unread: getUnacknowledgedCount(),
        byType,
      },
      thesisChanges: thesisChanges.slice(0, maxWatchlistUpdates),
      topMovers,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate a weekly thesis review comparing current vs start-of-week state.
   */
  static generateWeeklyReview(): WeeklyThesisReview {
    const uid = resolveUid();
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);

    const weekStartISO = weekStart.toISOString();
    const weekEndISO = now.toISOString();

    const allSymbols = getAllThesisSymbols();
    const reviewedSymbols: WeeklyReviewItem[] = [];
    let thesesImproved = 0;
    let thesesDeclined = 0;
    let thesesStable = 0;

    for (const { symbol, latest } of allSymbols) {
      const currentThesis = latest.thesis;
      let trend: WeeklyReviewItem["trend"] = "stable";

      if (
        currentThesis.currentStatus === "Strengthening" ||
        currentThesis.conviction === "Healthy" ||
        currentThesis.conviction === "Very Healthy"
      ) {
        thesesImproved++;
        trend = "improving";
      } else if (
        currentThesis.currentStatus === "Weakening" ||
        currentThesis.currentStatus === "Needs review" ||
        currentThesis.conviction === "Unhealthy" ||
        currentThesis.conviction === "Very Unhealthy"
      ) {
        thesesDeclined++;
        trend = "declining";
      } else {
        thesesStable++;
      }

      reviewedSymbols.push({
        symbol,
        companyName: currentThesis.companyName,
        thesisHistory: [], // Would need per-symbol history load
        currentThesis,
        trend,
      });
    }

    const allAlerts = getAlerts();
    const weekAlerts = filterByWindow(
      allAlerts.map((a) => a.alert),
      7
    );

    // Sort: declining first, then stable, then improving
    reviewedSymbols.sort((a, b) => {
      const order: Record<string, number> = { declining: 0, stable: 1, improving: 2 };
      return (order[a.trend] ?? 1) - (order[b.trend] ?? 1);
    });

    return {
      weekStart: weekStartISO.split("T")[0],
      weekEnd: weekEndISO.split("T")[0],
      uid,
      reviewedSymbols,
      alertsTriggeredThisWeek: weekAlerts.length,
      thesesImproved,
      thesesDeclined,
      thesesStable,
      generatedAt: now.toISOString(),
    };
  }
}
