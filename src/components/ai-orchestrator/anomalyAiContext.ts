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
 * Convert a MarketAnomalyEvidencePack into a ResearchAiContext for the
 * "Why did this move?" surface.
 *
 * Uses the enhanced contract's own headline, risksToReview, whatToWatch
 * and compressedContext fields — no derivation needed.
 *
 * Returns `null` when the pack is null, empty, or insufficient to carry
 * meaningful information.
 */
export function toAnomalyResearchAiContext(
  pack: MarketAnomalyEvidencePack | null | undefined,
): ResearchAiContext | null {
  if (!pack) return null;
  if (pack.evidence.length === 0 && pack.missingEvidence.length === 0) return null;

  const ctx: ResearchAiContext = {
    surface: "why_move",
    symbol: sanitizeText(pack.symbol, 24) ?? null,
    companyName: sanitizeText(pack.companyName, 100) ?? null,
    title: sanitizeText(`Why did ${pack.symbol} move?`, 80) ?? null,
    headline: sanitizeText(pack.headline, 180) ?? null,
    researchNarrative: sanitizeArray(
      [pack.anomalyType, pack.headline].filter(Boolean),
      3,
    ),
    evidenceToReview: sanitizeArray(pack.evidence, 8),
    risksToReview: sanitizeArray(pack.risksToReview, 5),
    whatToWatch: sanitizeArray(pack.whatToWatch, 5),
    extraContext: sanitizeText(pack.compressedContext, 500) ?? null,
  };

  // Include missing evidence as risks for discoverability.
  if (pack.missingEvidence.length > 0) {
    const missing = sanitizeArray(
      pack.missingEvidence.map((m) => `${m} — needs more context`),
      3,
    );
    if (missing) {
      ctx.risksToReview = [
        ...(ctx.risksToReview ?? []),
        ...missing,
      ];
    }
  }

  return hasContent(ctx) ? ctx : null;
}
