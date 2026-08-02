// src/components/edge-ai/edgeAiContextMapper.ts
// Phase 4 — Maps MarketBrain research data into safe chat context.
//
// Input is expected to be the MarketBrainPanelViewModel (or a plain object
// with compatible shape). Every field is defensively sanitised to cap
// string length, array length, and strip forbidden public-copy terms.
// =========================================================================

import type { EdgeAiResearchContext } from './edgeAiTypes';
import { containsForbiddenRecommendationLanguage } from '../../systems/market-brain/marketBrainGuardrails';

const MAX_STRING_LENGTH = 280;
const MAX_ARRAY_LENGTH = 5;
const MAX_SYMBOL_LENGTH = 24;

/* ── Helpers ────────────────────────────────────────────────────────── */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function safeString(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  if (containsForbiddenRecommendationLanguage(trimmed)) return '';
  return trimmed.length > MAX_STRING_LENGTH
    ? trimmed.slice(0, MAX_STRING_LENGTH) + '…'
    : trimmed;
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => safeString(item))
    .filter(Boolean)
    .slice(0, MAX_ARRAY_LENGTH);
}

function safeNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

/* ── Public API ─────────────────────────────────────────────────────── */

/**
 * Build an EdgeAiResearchContext from any compatible input object.
 *
 * Accepts either a full MarketBrainPanelViewModel or a plain object with
 * matching keys. Returns null when there is not enough data to provide
 * a useful chat experience.
 */
/** Alias for backward compatibility */
export const buildResearchContext = toEdgeAiResearchContext;

export function toEdgeAiResearchContext(
  input: unknown,
): EdgeAiResearchContext | null {
  if (!isPlainObject(input)) return null;

  const symbol = safeString(input.symbol) || safeString(input.ticker);
  const companyName = safeString(input.companyName) || safeString(input.name) || '';

  if (!symbol) return null;

  // Gather text from known sub-objects
  const narrative = mergeText(
    input.narrative,
    input.explanation,
    input.evidenceSummary,
    input.headline,
  );

  const risksToReview = mergeText(input.risksToReview, input.risks);
  const whatToWatch = mergeText(input.whatToWatch, input.watchItems);

  // Merge nested plain-object fields
  const research = isPlainObject(input.research) ? input.research : {};
  const move = isPlainObject(input.whyDidThisMove) ? input.whyDidThisMove : {};

  if (narrative.length === 0) {
    narrative.push(...mergeText(research.summary, research.thesis));
  }
  if (risksToReview.length === 0) {
    risksToReview.push(...safeStringArray(research.risksToReview));
  }
  if (whatToWatch.length === 0) {
    whatToWatch.push(...safeStringArray(research.whatToWatch));
  }

  // Price data (from top-level or nested price object)
  const priceObj = isPlainObject(input.price) ? input.price : {};
  const currentPrice = safeNumber(input.currentPrice, 0)
    || safeNumber(priceObj.current, 0);
  const changeAbs = safeNumber(input.changeAbs, 0)
    || safeNumber(priceObj.changeAbs, 0);
  const changePercent = safeNumber(input.changePercent, 0)
    || safeNumber(priceObj.changePercent, 0);

  // Sector
  const sector = safeString(input.sector)
    || safeString(input.industry)
    || safeString(research.sector)
    || '';

  return {
    symbol: symbol.slice(0, MAX_SYMBOL_LENGTH).toUpperCase(),
    companyName,
    narrative,
    risksToReview,
    whatToWatch,
    sector,
    currentPrice,
    changeAbs,
    changePercent,
  };
}

/**
 * Collect safe strings from one or more fields, deduplicate, and return
 * up to MAX_ARRAY_LENGTH items.
 */
function mergeText(...sources: unknown[]): string[] {
  const collected: string[] = [];
  for (const source of sources) {
    if (Array.isArray(source)) {
      for (const item of source) {
        const s = safeString(item);
        if (s) collected.push(s);
      }
    } else {
      const s = safeString(source);
      if (s) collected.push(s);
    }
  }
  // Deduplicate case-insensitively
  const seen = new Set<string>();
  return collected.filter((item) => {
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, MAX_ARRAY_LENGTH);
}
