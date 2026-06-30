// ─────────────────────────────────────────────────────────────────────────────
// Phase 19C-6 — Event Evidence → LLM Context Adapter
//
// Bridges EventEvidencePack data into ResearchAiContext so the browser-local
// LLM can reference real events (news, earnings, alerts) in its explanations.
//
// This is a thin enrichment layer — callers build their surface context first,
// then optionally enrich it with event evidence using enrich...Context().
// ─────────────────────────────────────────────────────────────────────────────

import type { EventEvidenceItem, EventEvidenceKind, EventEvidencePack } from '../../research/contracts/eventEvidenceContracts';
import type { ResearchAiContext, ResearchAiSurface } from './researchAiTypes';

/** Minimal news article shape accepted by buildNewsEventPack. */
export interface NewsHeadlineInput {
  headline: string;
  source: string;
  time: string;
  link?: string | null;
  publishedAt?: string | null;
}

const MAX_EVENT_DETAIL = 120;
const MAX_EVENTS_IN_CONTEXT = 8;

/** Forbidden terms that must not leak into LLM context (mirrors researchAiContext). */
const FORBIDDEN_WORDS = /\b(provider|backend|adapter|diagnostic|coverage|freshness|lineage|migration|backfill|rag|vector|embedding|chunk|webllm|webgpu|wasm|ollama|llama|qwen|phi|multibagger|guaranteed|sure shot|buy|sell|hold|target|api)\b/gi;

/** Strip forbidden terms from a text fragment. */
function sanitizeLabel(text: string): string {
  return text.replace(FORBIDDEN_WORDS, '[redacted]');
}

/**
 * Sanitise a single event item into a short LLM-safe text fragment.
 */
function eventToText(item: EventEvidenceItem): string {
  const impactTag = item.impact !== 'neutral' ? `[${item.impact}] ` : '';
  const datePart = item.date ? ` (${item.date.slice(0, 10)})` : '';
  return `${impactTag}${item.kind}: ${sanitizeLabel(item.label).slice(0, 80)}${datePart}`;
}

/**
 * Enrich an existing ResearchAiContext with event evidence data.
 *
 * Populates `whatChanged`, `whyItMatters`, and `historicalContext`
 * fields from the most relevant items in the event pack.
 *
 * @param context   Base ResearchAiContext (from surface builder)
 * @param pack      EventEvidencePack from buildEventEvidencePack()
 * @param surface   Surface identifier (defaults to context.surface)
 * @returns         Enriched context or null if no events available
 */
export function enrichResearchContextWithEvents(
  context: ResearchAiContext,
  pack: EventEvidencePack | null | undefined,
  surface?: ResearchAiSurface,
): ResearchAiContext | null {
  if (!pack || pack.totalCount === 0) return null;

  const targetSurface: ResearchAiSurface = surface ?? context.surface;

  // whatChanged — the 3 most highlighted/impactful events
  const whatChanged = pack.highlighted
    .slice(0, 3)
    .map((item) => eventToText(item));

  // whyItMatters — items with non-neutral impact
  const impactful = pack.items
    .filter((item) => item.impact === 'positive' || item.impact === 'negative')
    .slice(0, 4)
    .map((item) => eventToText(item));

  // historicalContext — broader set of non-neutral & recent items
  const historicalEvents = pack.items
    .slice(0, MAX_EVENTS_IN_CONTEXT)
    .filter((item) => !whatChanged.some((w) => w.includes(item.label.slice(0, 40))))
    .map((item) => eventToText(item));

  // Build source summary for transparency
  const sourceCounts: string[] = [];
  for (const [kind, items] of Object.entries(pack.byKind)) {
    if (items.length > 0) {
      sourceCounts.push(`${items.length} ${kind.replace(/_/g, ' ')}`);
    }
  }

  return {
    ...context,
    surface: targetSurface,
    // Prefer base context whatChanged if already populated
    whatChanged:
      context.whatChanged && context.whatChanged.length > 0
        ? context.whatChanged
        : whatChanged.length > 0
          ? whatChanged
          : undefined,
    // whyItMatters — merge event impactful with existing if present
    whyItMatters:
      context.whyItMatters && context.whyItMatters.length > 0
        ? context.whyItMatters
        : impactful.length > 0
          ? impactful
          : undefined,
    historicalContext:
      historicalEvents.length > 0
        ? historicalEvents
        : context.historicalContext,
    extraContext: [
      context.extraContext,
      sourceCounts.length > 0 ? `Sources: ${sourceCounts.join(', ')}.` : null,
    ]
      .filter(Boolean)
      .join(' '),
  };
}

/**
 * Build a ResearchAiContext from only event evidence (no surface data).
 * Useful for dedicated event-focused surfaces like healthometer or why_move.
 */
export function buildEventContext(
  symbol: string,
  companyName: string,
  pack: EventEvidencePack | null | undefined,
  surface: ResearchAiSurface,
): ResearchAiContext | null {
  if (!pack || pack.totalCount === 0) return null;

  const whatChanged = pack.highlighted.slice(0, 3).map((item) => eventToText(item));
  const impactful = pack.items
    .filter((item) => item.impact === 'positive' || item.impact === 'negative')
    .slice(0, 5)
    .map((item) => eventToText(item));

  const sourceCounts: string[] = [];
  for (const [kind, items] of Object.entries(pack.byKind)) {
    if (items.length > 0) {
      sourceCounts.push(`${items.length} ${kind.replace(/_/g, ' ')}`);
    }
  }

  const narrative = pack.highlighted.map(
    (item) => `${item.kind}: ${sanitizeLabel(item.label).slice(0, MAX_EVENT_DETAIL)}`,
  );

  return {
    surface,
    symbol: symbol.toUpperCase(),
    companyName,
    narrative,
    whatChanged,
    whyItMatters: impactful.length > 0 ? impactful : ['No significant directional events detected'],
    historicalContext: pack.items.slice(0, MAX_EVENTS_IN_CONTEXT).map((item) => eventToText(item)),
    extraContext: `Sources: ${sourceCounts.join(', ')}.`,
  };
}

/* ── Surface-level convenience helpers ────────────────────── */

/**
 * Build a lightweight EventEvidencePack from a news headline array.
 * Useful for surfaces like stock/healthometer that already have
 * deterministic news data and want quick event enrichment.
 */
export function buildNewsEventPack(
  symbol: string,
  news: NewsHeadlineInput[],
): EventEvidencePack | null {
  if (!news || news.length === 0) return null;

  const items: EventEvidenceItem[] = news.map((n, i) => ({
    id: `news-${symbol}-${i}`,
    kind: 'news_headline' as EventEvidenceKind,
    label: sanitizeLabel(n.headline.slice(0, 120)),
    detail: `${n.headline} Source: ${n.source}`.slice(0, 500),
    impact: 'neutral' as const,
    date: n.publishedAt ?? n.time,
    source: n.source,
    confidence: 'high' as const,
  }));

  return {
    symbol,
    items,
    totalCount: items.length,
    retrievedAt: Date.now(),
    byKind: {
      news_headline: items,
      alert_event: [],
      corporate_action: [],
      result_event: [],
      filing_event: [],
      analyst_event: [],
    },
    highlighted: items.slice(0, 3),
  };
}
