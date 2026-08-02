/**
 * WatchlistIntelligenceEngine — bridges watchlist CRUD with thesis tracking
 *
 * Aggregates thesis views for all watchlisted symbols, computes deltas from
 * saved state, and prioritizes companies needing review. Compliance-safe:
 * produces research signals only — no Buy/Sell/Hold, no guarantees, no advice.
 */
import type { WatchlistThesisView, AlertChangeView } from "../../research/contracts/productContracts.js";
import { trackThesis, type ThesisTrackingInput } from "../../research/watchlist/watchlistEngine.js";
import { getPersistedStockResearch } from "../../lib/stockResearchSnapshot.js";
import type { FactorScoreSet } from "../../lib/scoring.js";

// ── Types ────────────────────────────────────────────────────────────────────

export interface WatchlistIntelligence {
  /** Per-ticker thesis view with current state */
  items: WatchlistThesisView[];
  /** Items whose thesis changed since last save (new/weakening/strengthening) */
  changedItems: WatchlistThesisView[];
  /** Tickers that need review (weakening, needs review, unhealthy) */
  needsReview: WatchlistThesisView[];
  /** Alerts generated from thesis changes */
  alerts: AlertChangeView[];
  /** When this intelligence was computed */
  generatedAt: string;
}

export interface WatchlistIntelligenceOptions {
  /** Maximum number of items to return */
  limit?: number;
  /** Only include items with thesis changes */
  changesOnly?: boolean;
  /** Filter to specific tickers */
  tickers?: string[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function compositeScore(scores: FactorScoreSet): number | null {
  const values = [
    scores.quality, scores.valuation, scores.growth,
    scores.momentum, scores.health, scores.riskAdjusted,
  ].filter((v): v is number => v !== null && Number.isFinite(v));
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function generateAlertId(symbol: string, type: string): string {
  return `${symbol}-${type}-${Date.now()}`;
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class WatchlistIntelligenceEngine {
  /**
   * Build intelligence for a set of tickers using current research data.
   * Compares current thesis against previously-saved thesis state.
   */
  static async buildIntelligence(
    tickers: string[],
    previousThesis: Map<string, WatchlistThesisView> = new Map(),
    options: WatchlistIntelligenceOptions = {}
  ): Promise<WatchlistIntelligence> {
    const { limit = 50, changesOnly = false, tickers: filterTickers } = options;
    const targetTickers = filterTickers ?? tickers;
    const items: WatchlistThesisView[] = [];
    const alerts: AlertChangeView[] = [];

    for (const symbol of targetTickers.slice(0, limit)) {
      try {
        const synData = await getPersistedStockResearch(symbol).catch(() => null);
        if (!synData) continue;

        const prevScore = previousThesis.get(symbol)?.score ?? null;
        const currentScore = compositeScore(synData.scores);

        const input: ThesisTrackingInput = {
          symbol,
          companyName: synData.companyName ?? synData.name ?? symbol,
          currentScore,
          previousScore: prevScore,
          factorChanges: [],
          riskChanges: [],
          lastUpdated: null,
        };

        const thesis = trackThesis(input);
        items.push(thesis);

        // Generate alerts for meaningful thesis changes
        const prev = previousThesis.get(symbol);
        if (prev && prev.currentStatus !== thesis.currentStatus) {
          const direction = thesis.currentStatus === "Weakening" || thesis.currentStatus === "Needs review"
            ? "thesis_change" as const : "watchlist_review" as const;

          alerts.push({
            id: generateAlertId(symbol, direction),
            symbol,
            type: direction,
            title: `${symbol} thesis ${thesis.currentStatus.toLowerCase()}`,
            body: `Research thesis for ${thesis.companyName} changed from ${prev.currentStatus.toLowerCase()} to ${thesis.currentStatus.toLowerCase()}. Score: ${currentScore ?? "N/A"}. Conviction: ${thesis.conviction}.`,
            timestamp: new Date().toISOString(),
            acknowledged: false,
          });
        }
      } catch {
        // Skip tickers that fail to load — don't block the whole batch
      }
    }

    // Sort items by review priority (needs review first, then by score ascending)
    const priorityOrder: Record<string, number> = {
      "Weakening": 0,
      "Needs review": 1,
      "Strengthening": 2,
      "Stable": 3,
      "Research signals pending": 4,
      "Tracking begins now": 5,
    };

    items.sort((a, b) => {
      const pa = priorityOrder[a.currentStatus] ?? 99;
      const pb = priorityOrder[b.currentStatus] ?? 99;
      if (pa !== pb) return pa - pb;
      return (a.score ?? 0) - (b.score ?? 0);
    });

    const changedItems = items.filter(i => {
      const prev = previousThesis.get(i.symbol);
      if (!prev) return false;
      return prev.currentStatus !== i.currentStatus;
    });

    const needsReview = items.filter(i =>
      i.currentStatus === "Weakening" ||
      i.currentStatus === "Needs review" ||
      i.conviction === "Unhealthy" ||
      i.conviction === "Very Unhealthy"
    );

    return {
      items: changesOnly ? changedItems : items,
      changedItems,
      needsReview,
      alerts,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Quick review priority for a single ticker — lightweight, no full intelligence build.
   */
  static async getReviewPriority(symbol: string): Promise<WatchlistThesisView | null> {
    try {
      const synData = await getPersistedStockResearch(symbol).catch(() => null);
      if (!synData) return null;

      const input: ThesisTrackingInput = {
        symbol,
        companyName: synData.name ?? synData.companyName ?? symbol,
        currentScore: compositeScore(synData.scores),
        previousScore: null,
        factorChanges: [],
        riskChanges: [],
        lastUpdated: null,
      };

      return trackThesis(input);
    } catch {
      return null;
    }
  }

  /**
   * Summarize what changed for a ticker since a saved thesis view.
   * Returns a human-readable diff string (no advice).
   */
  static summarizeChange(
    symbol: string,
    previous: WatchlistThesisView,
    current: WatchlistThesisView
  ): string | null {
    if (previous.currentStatus === current.currentStatus) {
      if (previous.score === current.score) return null;
      const dir = (current.score ?? 0) > (previous.score ?? 0) ? "improved" : "declined";
      return `${symbol} score ${dir} from ${previous.score ?? "N/A"} to ${current.score ?? "N/A"}.`;
    }

    const prevLabel = previous.currentStatus;
    const currLabel = current.currentStatus;
    return `${symbol} thesis shifted from "${prevLabel}" to "${currLabel}". Score: ${current.score ?? "N/A"}. Conviction: ${current.conviction}.`;
  }
}

/** Singleton convenience accessor */
export const watchlistIntelligence = WatchlistIntelligenceEngine;
