// src/components/ai-orchestrator/researchAiContext.ts
// Phase 18 — Builds safe ResearchAiContext from each surface's DTOs.
// =========================================================================

import type { ResearchAiContext, ResearchAiSurface } from './researchAiTypes';

const MAX_STRING_LENGTH = 280;
const MAX_ARRAY_LENGTH = 5;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function safeString(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
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
  const seen = new Set<string>();
  return collected.filter((item) => {
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, MAX_ARRAY_LENGTH);
}

/** Build context from a MarketBrain research payload (stock detail, why-did-this-move). */
export function buildStockResearchContext(
  surface: ResearchAiSurface,
  symbol: string,
  companyName: string,
  data: unknown,
): ResearchAiContext | null {
  if (!isPlainObject(data)) return null;
  const research = isPlainObject((data as Record<string, unknown>).research)
    ? (data as Record<string, unknown>).research as Record<string, unknown>
    : data;

  const narrative = mergeText(
    research.narrative,
    research.explanation,
    research.evidenceSummary,
    research.headline,
    research.thesis,
  );
  const risksToReview = mergeText(research.risksToReview, research.risks);
  const whatToWatch = mergeText(research.whatToWatch, research.watchItems);
  const sector = safeString(research.sector) || safeString(research.industry) || '';
  const currentPrice = safeNumber(
    (data as Record<string, unknown>).currentPrice,
    safeNumber(research.currentPrice, 0),
  );
  const changeAbs = safeNumber(
    (data as Record<string, unknown>).changeAbs,
    safeNumber(research.changeAbs, 0),
  );
  const changePercent = safeNumber(
    (data as Record<string, unknown>).changePercent,
    safeNumber(research.changePercent, 0),
  );

  if (!symbol) return null;

  return {
    surface,
    symbol: symbol.trim().toUpperCase(),
    companyName: safeString(companyName) || symbol,
    narrative,
    risksToReview,
    whatToWatch,
    sector,
    currentPrice,
    changeAbs,
    changePercent,
  };
}

/** Build context from a scanner result item. */
export function buildScannerContext(
  symbol: string,
  companyName: string,
  scanResult: unknown,
): ResearchAiContext | null {
  if (!symbol) return null;
  const data = isPlainObject(scanResult) ? scanResult as Record<string, unknown> : {};
  return {
    surface: 'scanner',
    symbol: symbol.trim().toUpperCase(),
    companyName: safeString(companyName) || symbol,
    narrative: mergeText(data.summary, data.reason, data.headline),
    risksToReview: mergeText(data.risks, data.warnings),
    whatToWatch: mergeText(data.watchItems, data.triggers),
    sector: safeString(data.sector) || '',
    currentPrice: safeNumber(data.currentPrice, 0),
    changeAbs: safeNumber(data.changeAbs, 0),
    changePercent: safeNumber(data.changePercent, 0),
  };
}

/** Build context from a compare view model. */
export function buildCompareContext(
  symbols: string[],
  companies: string[],
  compareData: unknown,
): ResearchAiContext | null {
  if (symbols.length === 0) return null;
  const data = isPlainObject(compareData) ? compareData as Record<string, unknown> : {};
  return {
    surface: 'compare',
    symbol: symbols.slice(0, 3).join('/'),
    companyName: companies.slice(0, 3).join(' vs ') || symbols[0],
    narrative: mergeText(data.summary, data.comparison, data.highlights),
    risksToReview: mergeText(data.risksToReview),
    whatToWatch: mergeText(data.whatToWatch),
    sector: safeString(data.sector) || '',
    currentPrice: 0,
    changeAbs: 0,
    changePercent: 0,
  };
}

/** Build context from watchlist thesis changes. */
export function buildWatchlistContext(
  symbol: string,
  companyName: string,
  thesisData: unknown,
): ResearchAiContext | null {
  if (!symbol) return null;
  const data = isPlainObject(thesisData) ? thesisData as Record<string, unknown> : {};
  return {
    surface: 'watchlist',
    symbol: symbol.trim().toUpperCase(),
    companyName: safeString(companyName) || symbol,
    narrative: mergeText(data.thesis, data.bullCase, data.bearCase),
    risksToReview: mergeText(data.risksToReview, data.risks),
    whatToWatch: mergeText(data.whatToWatch, data.watchItems, data.triggers),
    sector: safeString(data.sector) || '',
    currentPrice: safeNumber(data.currentPrice, 0),
    changeAbs: safeNumber(data.changeAbs, 0),
    changePercent: safeNumber(data.changePercent, 0),
    extraContext: safeString(data.stance) || undefined,
  };
}

/** Build context from an alert / important change. */
export function buildAlertContext(
  symbol: string,
  companyName: string,
  alertData: unknown,
): ResearchAiContext | null {
  if (!symbol) return null;
  const data = isPlainObject(alertData) ? alertData as Record<string, unknown> : {};
  return {
    surface: 'alerts',
    symbol: symbol.trim().toUpperCase(),
    companyName: safeString(companyName) || symbol,
    narrative: mergeText(data.change, data.summary, data.description),
    risksToReview: mergeText(data.risksToReview, data.risks),
    whatToWatch: mergeText(data.whatToWatch, data.nextSteps),
    sector: safeString(data.sector) || '',
    currentPrice: safeNumber(data.currentPrice, 0),
    changeAbs: safeNumber(data.changeAbs, 0),
    changePercent: safeNumber(data.changePercent, 0),
    extraContext: safeString(data.changeType) || undefined,
  };
}

/** Compress context to fit within a character budget. */
export function compressResearchContext(
  context: ResearchAiContext,
  maxChars: number = 2000,
): ResearchAiContext {
  const budget = Math.max(maxChars, 500);

  let current = estimateChars(context);
  if (current <= budget) return context;

  // Reduce arrays
  const compressed = { ...context };
  compressed.narrative = truncateArray(compressed.narrative, Math.floor(budget / 6));
  compressed.risksToReview = truncateArray(compressed.risksToReview, Math.floor(budget / 8));
  compressed.whatToWatch = truncateArray(compressed.whatToWatch, Math.floor(budget / 8));

  current = estimateChars(compressed);
  if (current <= budget) return compressed;

  // Further reduce by trimming string lengths
  compressed.narrative = compressed.narrative.map((s) =>
    s.length > 120 ? s.slice(0, 120) + '…' : s,
  );
  compressed.risksToReview = compressed.risksToReview.map((s) =>
    s.length > 80 ? s.slice(0, 80) + '…' : s,
  );
  compressed.whatToWatch = compressed.whatToWatch.map((s) =>
    s.length > 80 ? s.slice(0, 80) + '…' : s,
  );

  return compressed;
}

function estimateChars(ctx: ResearchAiContext): number {
  return (
    ctx.narrative.reduce((a, s) => a + s.length, 0) +
    ctx.risksToReview.reduce((a, s) => a + s.length, 0) +
    ctx.whatToWatch.reduce((a, s) => a + s.length, 0) +
    ctx.sector.length +
    ctx.companyName.length +
    (ctx.extraContext?.length ?? 0)
  );
}

function truncateArray(arr: string[], maxTotalChars: number): string[] {
  let total = 0;
  const result: string[] = [];
  for (const item of arr) {
    if (total + item.length > maxTotalChars) break;
    result.push(item);
    total += item.length;
  }
  return result;
}
