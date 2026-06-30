// src/components/ai-orchestrator/anomalyAiContext.ts
// Phase 19A-5 — "Why did this move?" AI context adapter.
//
// Converts a deterministic MarketAnomalyEvidencePack into a ResearchAiContext
// for the browser-local LLM. Only compressed evidence is passed — no raw DTOs,
// no provider/backend/model/runtime fields, no recommendation language.

import type { ResearchAiContext } from "./researchAiTypes";
import type { MarketAnomalyEvidencePack } from "../../systems/market-brain/anomalyEvidencePack";

// ─── Forbidden patterns (subset of surfaceAiContexts) ─────────────────────────

const FORBIDDEN = [
  /\bbuy\b/gi, /\bsell\b/gi, /\bhold\b/gi, /\bstrong buy\b/gi,
  /\btarget\b/gi, /\bguaranteed\b/gi, /\bsure shot\b/gi, /\bmultibagger\b/gi,
  /\bprovider\b/gi, /\bbackend\b/gi, /\bmodel\b/gi, /\bruntime\b/gi,
  /\bWebLLM\b/gi, /\bWebGPU\b/gi, /\bWASM\b/gi, /\bOllama\b/gi,
  /\bllama\b/gi, /\bQwen\b/gi, /\bPhi\b/gi,
];

function stripForbidden(text: string): string {
  let cleaned = text;
  for (const pattern of FORBIDDEN) {
    cleaned = cleaned.replace(pattern, "");
  }
  return cleaned.replace(/\s+/g, " ").trim();
}

function sanitizeText(value: unknown, max: number): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const text = stripForbidden(value).replace(/\s+/g, " ").trim().slice(0, max);
  return text || null;
}

function sanitizeArray(value: unknown, maxCount: number, maxItemChars = 180): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const deduped = new Set<string>();
  const items = value
    .filter((v): v is string => typeof v === "string")
    .map((v) => sanitizeText(v, maxItemChars))
    .filter((v): v is string => Boolean(v))
    .filter((v) => {
      const key = v.toLowerCase();
      if (deduped.has(key)) return false;
      deduped.add(key);
      return true;
    })
    .slice(0, maxCount);
  return items.length > 0 ? items : undefined;
}

function hasContent(ctx: ResearchAiContext): boolean {
  return [
    ctx.title, ctx.companyName, ctx.headline, ctx.sector,
    ctx.researchNarrative, ctx.evidenceToReview, ctx.risksToReview,
    ctx.whatToWatch, ctx.extraContext,
  ].some((v) => {
    if (v == null) return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  });
}

// ─── Adapter ─────────────────────────────────────────────────────────────────

/**
 * Derive a research headline from the deterministic evidence pack.
 * No recommendation language — purely descriptive.
 */
function deriveHeadline(pack: MarketAnomalyEvidencePack): string {
  const prefix = `${pack.symbol} ${pack.anomalyType}`;
  if (pack.evidence.length > 0) {
    const first = pack.evidence[0].replace(/^Price /, "").replace(/\.$/, "");
    return `${prefix}: ${first}`;
  }
  return `${prefix} — evidence pending`;
}

/**
 * Convert a MarketAnomalyEvidencePack into a ResearchAiContext for the
 * "Why did this move?" surface.
 *
 * Returns `null` when the pack is null, empty, or insufficient to carry
 * meaningful information.
 */
export function toAnomalyResearchAiContext(
  pack: MarketAnomalyEvidencePack | null | undefined,
): ResearchAiContext | null {
  if (!pack) return null;
  if (pack.evidence.length === 0 && pack.missingEvidence.length === 0) return null;

  const headlineText = deriveHeadline(pack);

  const ctx: ResearchAiContext = {
    surface: "why_move",
    symbol: sanitizeText(pack.symbol, 24) ?? null,
    companyName: null,
    title: sanitizeText(`Why did ${pack.symbol} move?`, 80) ?? null,
    headline: sanitizeText(headlineText, 180) ?? null,
    researchNarrative: sanitizeArray(
      [pack.anomalyType, headlineText].filter(Boolean),
      3,
    ),
    evidenceToReview: sanitizeArray(pack.evidence, 8),
    risksToReview: sanitizeArray(
      pack.missingEvidence.map((m) => `${m} — needs more context`),
      5,
    ),
    whatToWatch: undefined,
    extraContext: sanitizeText(pack.narrativePromptPayload, 500) ?? null,
  };

  // Include missing evidence note in evidenceToReview for discoverability.
  if (pack.missingEvidence.length > 0) {
    const missing = sanitizeArray(
      pack.missingEvidence.map((m) => `${m} — needs more context`),
      3,
    );
    if (missing) {
      ctx.evidenceToReview = [
        ...(ctx.evidenceToReview ?? []),
        ...missing,
      ];
    }
  }

  return hasContent(ctx) ? ctx : null;
}
