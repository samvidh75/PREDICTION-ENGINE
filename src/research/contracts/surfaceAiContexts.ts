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

// ─── Forbidden terms ─────────────────────────────────────────────────────────
// Terms that must not appear in public-facing AI context output.
// Recommendation/direct-action, provider/runtime, and scoring plumbing words.

const FORBIDDEN_PATTERNS = [
  /\bbuy\b/gi,
  /\bsell\b/gi,
  /\bhold\b/gi,
  /\bstrong buy\b/gi,
  /\btarget\b/gi,
  /\bguaranteed\b/gi,
  /\bsure shot\b/gi,
  /\bmultibagger\b/gi,
  /\breal time\b/gi,
  /\brealtime\b/gi,
  /\blive price\b/gi,
  /\blive portfolio\b/gi,
  /\bP&L\b/gi,
  /\bmock holdings\b/gi,
  /\bfake\b/gi,
  /\bprovider\b/gi,
  /\bbackend\b/gi,
  /\bmodel\b/gi,
  /\bruntime\b/gi,
  /\bRAG\b/gi,
  /\bvector\b/gi,
  /\bembedding\b/gi,
  /\bchunk\b/gi,
  /\badapter\b/gi,
  /\bWebLLM\b/gi,
  /\bWebGPU\b/gi,
  /\bWASM\b/gi,
  /\bOllama\b/gi,
  /\bllama\b/gi,
  /\bQwen\b/gi,
  /\bPhi\b/gi,
  /\bzero server load\b/gi,
  /\bunlimited prompts\b/gi,
  /\bserverless AI\b/gi,
];

function stripForbidden(text: string): string {
  let cleaned = text;
  for (const pattern of FORBIDDEN_PATTERNS) {
    cleaned = cleaned.replace(pattern, "");
  }
  return cleaned.replace(/\s+/g, " ").trim();
}

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

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function sanitizeText(value: unknown, max: number): string | null {
  if (!isString(value)) return null;
  const text = stripForbidden(value).replace(/\s+/g, " ").trim().slice(0, max);
  return text || null;
}

function sanitizeArray(
  value: unknown,
  max: number,
): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const deduped = new Set<string>();
  const items = value
    .filter(isString)
    .map((item) => sanitizeText(item, max))
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

function safeUnknownObject<T>(input: unknown, guard: (v: unknown) => v is T): T | null {
  return guard(input) ? input : null;
}

// ─── Adapter: Scanner ────────────────────────────────────────────────────────

/**
 * Convert a ScannerResultView into a ResearchAiContext.
 * Returns `null` when input is invalid or output would carry no meaningful information.
 */
export function toScannerResearchAiContext(
  input: unknown,
  opts?: SurfaceAiContextOptions,
): ResearchAiContext | null {
  const o = { ...DEFAULTS, ...opts };

  const result = safeUnknownObject<ScannerResultView>(input, (v): v is ScannerResultView =>
    !!v && typeof v === "object" && "symbol" in v && "companyName" in v,
  );
  if (!result) return null;

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
 * Uses a safe research-context title. Returns `null` when input is invalid
 * or output would carry no meaningful information.
 */
export function toCompareResearchAiContext(
  input: unknown,
  opts?: SurfaceAiContextOptions,
): ResearchAiContext | null {
  const o = { ...DEFAULTS, ...opts };

  const result = safeUnknownObject<CompareResultView>(input, (v): v is CompareResultView =>
    !!v && typeof v === "object" && "companies" in v,
  );
  if (!result || !Array.isArray(result.companies)) return null;

  const symbols =
    result.companies
      .map((c) => (typeof c === "object" && c ? c.symbol : undefined))
      .filter(Boolean)
      .join("/") || null;
  const names =
    result.companies
      .map((c) => (typeof c === "object" && c ? c.companyName : undefined))
      .filter(Boolean)
      .join(" vs ") || null;

  const ctx: ResearchAiContext = {
    surface: "compare",
    symbol: symbols,
    companyName: names,
    title: "Compare research context",
    comparisonContext: sanitizeArray(
      [
        ...result.companies.flatMap((c) => {
          if (typeof c !== "object" || !c) return [];
          return [c.companyName, ...(Array.isArray(c.strengths) ? c.strengths : []), ...(Array.isArray(c.risks) ? c.risks : [])];
        }),
        ...(Array.isArray(result.factorComparison)
          ? result.factorComparison.map((f) => (typeof f === "object" && f ? f.explanation : undefined))
          : []),
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
 * Returns `null` when input is invalid or output would carry no meaningful information.
 */
export function toWatchlistResearchAiContext(
  input: unknown,
  opts?: SurfaceAiContextOptions,
): ResearchAiContext | null {
  const o = { ...DEFAULTS, ...opts };

  const result = safeUnknownObject<WatchlistThesisView>(input, (v): v is WatchlistThesisView =>
    !!v && typeof v === "object" && "symbol" in v && "companyName" in v && "currentStatus" in v,
  );
  if (!result) return null;

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
 * Returns `null` when input is invalid or output would carry no meaningful information.
 */
export function toAlertsResearchAiContext(
  input: unknown,
  opts?: SurfaceAiContextOptions,
): ResearchAiContext | null {
  const o = { ...DEFAULTS, ...opts };

  const result = safeUnknownObject<AlertChangeView>(input, (v): v is AlertChangeView =>
    !!v && typeof v === "object" && "symbol" in v && "title" in v && "body" in v && "type" in v,
  );
  if (!result) return null;

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
