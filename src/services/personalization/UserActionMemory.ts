/**
 * UserActionMemory — lightweight action-history tracking for personalization.
 *
 * Records research actions (searches, watchlist operations, thesis checks, preset usage)
 * so the system can suggest "what to research next" without giving advice.
 *
 * Key design decisions:
 *   - localStorage-first, like other personalization stores
 *   - Never persists PII beyond ticker symbols and action types
 *   - Compliance-safe: suggestions are "recently viewed" / "not checked recently",
 *     never "should buy", "should sell", or any personalized recommendation.
 */
import { loadAuthSession } from "../auth/sessionStore";

// ── Types ────────────────────────────────────────────────────────────────────

export type ActionType =
  | "search"
  | "watchlist_add"
  | "watchlist_remove"
  | "thesis_check"
  | "preset_save"
  | "preset_use"
  | "alert_view"
  | "digest_view"
  | "profile_update"
  | "scenario_run"
  | "compare_open"
  | "watchlist_review"
  | "invest_review";

export interface ActionRecord {
  id: string;
  action: ActionType;
  symbol: string | null; // null for non-ticker actions
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface ActionMemoryState {
  actions: ActionRecord[];
  /** Ticker → last action timestamp */
  tickerRecency: Record<string, string>;
}

export interface ResearchSuggestion {
  symbol: string;
  reason: string; // e.g., "Not checked in 7 days", "Recently added to watchlist"
  lastAction: string;
  thesisStatus: string | null;
}

// ── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY_PREFIX = "stockstory_action_memory_v1";
const MAX_ACTIONS = 500;
const MEMORY_EVENT = "actionmemorychange";

function dispatchChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(MEMORY_EVENT));
}

export function subscribeActions(fn: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(MEMORY_EVENT, fn);
  return () => window.removeEventListener(MEMORY_EVENT, fn);
}

function storageKey(): string {
  const uid = loadAuthSession().uid ?? "anonymous";
  return `${STORAGE_KEY_PREFIX}_${uid}`;
}

function loadState(): ActionMemoryState {
  if (typeof window === "undefined") return { actions: [], tickerRecency: {} };
  try {
    const raw = localStorage.getItem(storageKey());
    return raw ? JSON.parse(raw) : { actions: [], tickerRecency: {} };
  } catch {
    return { actions: [], tickerRecency: {} };
  }
}

function saveState(state: ActionMemoryState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(), JSON.stringify(state));
  } catch {
    // localStorage full
  }
}

function makeId(): string {
  return `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Record a user action. Updates ticker recency map if the action has a symbol.
 */
export function recordAction(
  action: ActionType,
  symbol: string | null = null,
  metadata?: Record<string, unknown>
): ActionRecord {
  const state = loadState();
  const record: ActionRecord = {
    id: makeId(),
    action,
    symbol: symbol ? symbol.toUpperCase() : null,
    timestamp: new Date().toISOString(),
    metadata,
  };

  state.actions.push(record);

  // Update ticker recency
  if (record.symbol) {
    state.tickerRecency[record.symbol] = record.timestamp;
  }

  // Trim
  if (state.actions.length > MAX_ACTI) {
    state.actions = state.actions.slice(-MAX_ACTI);
  }

  saveState(state);
  dispatchChange();
  return record;
}

/**
 * Get the most recent N actions.
 */
export function getRecentActions(n: number = 20): ActionRecord[] {
  const state = loadState();
  return [...state.actions].reverse().slice(0, n);
}

/**
 * Get actions for a specific ticker.
 */
export function getActionsBySymbol(symbol: string): ActionRecord[] {
  const state = loadState();
  return state.actions
    .filter((a) => a.symbol === symbol.toUpperCase())
    .reverse();
}

/**
 * Get the last time a ticker was interacted with (ISO string or null).
 */
export function getLastInteraction(symbol: string): string | null {
  const state = loadState();
  return state.tickerRecency[symbol.toUpperCase()] ?? null;
}

/**
 * Get all tickers with recorded interactions, sorted by recency (most recent first).
 */
export function getTickerRecencyList(): Array<{ symbol: string; lastAction: string }> {
  const state = loadState();
  return Object.entries(state.tickerRecency)
    .map(([symbol, lastAction]) => ({ symbol, lastAction }))
    .sort((a, b) => new Date(b.lastAction).getTime() - new Date(a.lastAction).getTime());
}

/**
 * Clear all action memory.
 */
export function clearActionMemory(): void {
  saveState({ actions: [], tickerRecency: {} });
  dispatchChange();
}

// ── Research Suggestions ─────────────────────────────────────────────────────

/**
 * Generate compliance-safe "what to research next" suggestions.
 *
 * Suggests tickers that:
 *   1. Were recently added to the watchlist but haven't been checked recently
 *   2. Were checked over 7 days ago (might need review)
 *   3. Are new additions since the last session
 *
 * This is NOT a recommendation engine — it simply surfaces tickers you've
 * shown interest in but haven't looked at lately.
 */
export function getResearchSuggestions(
  watchlistTickers: string[],
  thesisStatuses?: Map<string, string>
): ResearchSuggestion[] {
  const state = loadState();
  const suggestions: ResearchSuggestion[] = [];
  const now = Date.now();
  const staleThreshold = 7 * 24 * 60 * 60 * 1000; // 7 days
  const recentThreshold = 2 * 24 * 60 * 60 * 1000; // 2 days

  for (const symbol of watchlistTickers) {
    const upper = symbol.toUpperCase();
    const lastAction = state.tickerRecency[upper];
    const thesisStatus = thesisStatuses?.get(upper) ?? null;

    if (!lastAction) {
      // Never interacted — newly added to watchlist
      suggestions.push({
        symbol: upper,
        reason: "Newly added to your watchlist — start research",
        lastAction: "never",
        thesisStatus,
      });
      continue;
    }

    const elapsed = now - new Date(lastAction).getTime();

    if (thesisStatus === "Weakening" || thesisStatus === "Needs review") {
      suggestions.push({
        symbol: upper,
        reason: `Thesis needs review — last checked ${Math.round(elapsed / (24 * 60 * 60 * 1000))} days ago`,
        lastAction,
        thesisStatus,
      });
    } else if (elapsed > staleThreshold) {
      suggestions.push({
        symbol: upper,
        reason: `Not checked in ${Math.round(elapsed / (24 * 60 * 60 * 1000))} days — may want to review`,
        lastAction,
        thesisStatus,
      });
    }
  }

  // Prioritize: needs-review first, then stale, then new
  suggestions.sort((a, b) => {
    if (a.thesisStatus === "Weakening" && b.thesisStatus !== "Weakening") return -1;
    if (b.thesisStatus === "Weakening" && a.thesisStatus !== "Weakening") return 1;
    if (a.thesisStatus === "Needs review" && b.thesisStatus !== "Needs review") return -1;
    if (b.thesisStatus === "Needs review" && a.thesisStatus !== "Needs review") return 1;
    return new Date(a.lastAction === "never" ? 0 : a.lastAction).getTime() -
           new Date(b.lastAction === "never" ? 0 : b.lastAction).getTime();
  });

  return suggestions.slice(0, 20);
}


