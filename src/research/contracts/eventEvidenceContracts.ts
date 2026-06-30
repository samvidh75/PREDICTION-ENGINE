// ─────────────────────────────────────────────────────────────────────────────
// Phase 19C-4 — Event Evidence Retrieval Contracts
//
// Types for evidence items that the browser-local LLM can cite when
// explaining why a stock moved or what events surround it.
//
// All data comes from existing deterministic app sources — no new providers,
// no scraping, no fake data.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The kind/category of a retrieved event evidence item.
 */
export type EventEvidenceKind =
  | 'news_headline'
  | 'alert_event'
  | 'corporate_action'
  | 'result_event'
  | 'filing_event'
  | 'analyst_event';

/**
 * Directional impact assessment for an event.
 */
export type EventEvidenceImpact = 'positive' | 'negative' | 'neutral' | 'mixed';

/**
 * A single piece of event evidence from a deterministic app data source.
 */
export interface EventEvidenceItem {
  /** Unique stable id */
  id: string;
  /** Evidence kind */
  kind: EventEvidenceKind;
  /** Short display label (e.g. "Q3 Results", "Board Meeting") */
  label: string;
  /** Full detail text */
  detail: string;
  /** Impact assessment */
  impact: EventEvidenceImpact;
  /** ISO date string or relative label (e.g. "2026-01-15", "2 days ago") */
  date: string;
  /** Optional source reference (e.g. "Alert #42", "News headline") */
  source?: string | null;
  /** Optional confidence signal */
  confidence?: 'high' | 'medium' | 'low' | null;
}

/**
 * A time-bucketed collection of event evidence items for a stock.
 */
export interface EventEvidencePack {
  symbol: string;
  /** Items sorted by recency, most recent first */
  items: EventEvidenceItem[];
  /** Number of items in the pack */
  totalCount: number;
  /** Timestamp when this pack was built */
  retrievedAt: number;
  /** Items grouped by kind for easy rendering */
  byKind: Record<EventEvidenceKind, EventEvidenceItem[]>;
  /** Key items considered most relevant */
  highlighted: EventEvidenceItem[];
}
