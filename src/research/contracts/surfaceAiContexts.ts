// ─────────────────────────────────────────────────────────────────────────────
// Phase 3 — Dedicated surface-specific AI context adapters
//
// Typed, clean adapter functions from product-contract views → ResearchAiContext.
// Each function accepts the specific typed view and returns a properly populated
// AI context with the correct surface field, trimming & sanitization applied.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AlertChangeView,
  CompareResultView,
  ScannerResultView,
  WatchlistThesisView,
} from "./productContracts";
import type { ResearchAiContext } from "../../components/ai-orchestrator/researchAiTypes";

// ─── Options ─────────────────────────────────────────────────────────────────

export interface SurfaceAiContextOptions {
  /** Max string length for text fields (default 180) */
  maxStringLength?: number;
  /** Max items in array fields (default 5) */
  maxItems?: number;
}

const DEFAULTS: Required<SurfaceAiContextOptions> = {
  maxStringLength: 180,
  maxItems: 5,
};

// ─── Shared sanitization utilities ───────────────────────────────────────────

function sanitizeText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim().slice(0, max);
  return text || null;
}

function sanitizeArray(
  value: unknown[],
  max: number,
): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const deduped = new Set<string>();
  const items = value
    .map((item) => (typeof item === "string" ? sanitizeText(item, max) : null))
    .filter((item): item is string => Boolean(item))
    .filter((item) => {
      const key = item.toLowerCase();
      if (deduped.has(key)) return false;
      deduped.add(key);
      return true;
    })
    .slice(0, max);
  return items.length > 0 ? items : undefined;
}

function hasContent(ctx: ResearchAiContext): boolean {
  // Returns true when at least one informational field is populated
  const informational: unknown[] = [
    ctx.title,
    ctx.companyName,
    ctx.headline,
    ctx.sector,
    ctx.narrative,
    ctx.scannerContext,
    ctx.comparisonContext,
    ctx.watchlistContext,
    ctx.alertContext,
    ctx.researchNarrative,
    ctx.whatToWatch,
    ctx.risksToReview,
    ctx.historicalContext,
  ];
  return informational.some((v) => {
    if (v == null) return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  });
}

// ─── Adapter: Scanner ────────────────────────────────────────────────────────

/**
 * Convert a ScannerResultView into a ResearchAiContext.
 * Returns `null` when the output would carry no meaningful information.
 */
export function toScannerResearchAiContext(
  result: ScannerResultView,
  opts?: SurfaceAiContextOptions,
): ResearchAiContext | null {
  const o = { ...DEFAULTS, ...opts };
  const ctx: ResearchAiContext = {
    surface: "scanner",
    symbol: sanitizeText(result.symbol, 24) ?? null,
    companyName: sanitizeText(result.companyName, o.maxStringLength) ?? null,
    title: sanitizeText(result.oneLineThesis, o.maxStringLength) ?? null,
    sector: sanitizeText(result.sector, o.maxStringLength) ?? null,
    scannerContext: sanitizeArray(
      [result.oneLineThesis, result.keyReason, result.conviction, result.riskMarker],
      o.maxItems,
    ),
  };
  return hasContent(ctx) ? ctx : null;
}

// ─── Adapter: Compare ────────────────────────────────────────────────────────

/**
 * Convert a CompareResultView into a ResearchAiContext.
 * Returns `null` when the output would carry no meaningful information.
 */
export function toCompareResearchAiContext(
  result: CompareResultView,
  opts?: SurfaceAiContextOptions,
): ResearchAiContext | null {
  const o = { ...DEFAULTS, ...opts };
  const symbols =
    result.companies
      .map((c) => c.symbol)
      .filter(Boolean)
      .join("/") || null;
  const names =
    result.companies
      .map((c) => c.companyName)
      .filter(Boolean)
      .join(" vs ") || null;

  const ctx: ResearchAiContext = {
    surface: "compare",
    symbol: symbols,
    companyName: names,
    title: sanitizeText(result.recommendation ?? "Compare research", o.maxStringLength) ?? null,
    comparisonContext: sanitizeArray(
      [
        ...result.companies.flatMap((c) => [c.companyName, ...c.strengths, ...c.risks]),
        ...result.factorComparison.map((f) => f.explanation),
        result.missingDataCaveat,
      ],
      o.maxItems + 3,
    ),
  };
  return hasContent(ctx) ? ctx : null;
}

// ─── Adapter: Watchlist ──────────────────────────────────────────────────────

/**
 * Convert a WatchlistThesisView into a ResearchAiContext.
 * Returns `null` when the output would carry no meaningful information.
 */
export function toWatchlistResearchAiContext(
  result: WatchlistThesisView,
  opts?: SurfaceAiContextOptions,
): ResearchAiContext | null {
  const o = { ...DEFAULTS, ...opts };
  const ctx: ResearchAiContext = {
    surface: "watchlist",
    symbol: sanitizeText(result.symbol, 24) ?? null,
    companyName: sanitizeText(result.companyName, o.maxStringLength) ?? null,
    title: sanitizeText(result.currentStatus, o.maxStringLength) ?? null,
    watchlistContext: sanitizeArray(
      [result.conviction, result.lastThesis, result.scoreDirection],
      o.maxItems,
    ),
    whatToWatch: sanitizeArray(
      result.previousStatus ? [`Previous status: ${result.previousStatus}`] : [],
      o.maxItems,
    ),
  };
  return hasContent(ctx) ? ctx : null;
}

// ─── Adapter: Alerts ─────────────────────────────────────────────────────────

/**
 * Convert an AlertChangeView into a ResearchAiContext.
 * Returns `null` when the output would carry no meaningful information.
 */
export function toAlertsResearchAiContext(
  result: AlertChangeView,
  opts?: SurfaceAiContextOptions,
): ResearchAiContext | null {
  const o = { ...DEFAULTS, ...opts };
  const ctx: ResearchAiContext = {
    surface: "alerts",
    symbol: sanitizeText(result.symbol, 24) ?? null,
    title: sanitizeText(result.title, o.maxStringLength) ?? null,
    alertContext: sanitizeArray([result.body, result.type], o.maxItems),
    extraContext:
      sanitizeText(`Timestamp: ${result.timestamp}`, o.maxStringLength) ?? null,
  };
  return hasContent(ctx) ? ctx : null;
}
