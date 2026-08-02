// src/systems/market-brain/safeNarrativeExplainer.ts
// Phase 10 — Safe narrative explainer abstraction.
//
// This is intentionally deterministic. It defines the boundary that a future
// LLM implementation must respect: explain only compressed evidence payloads,
// never invent facts, and never produce recommendation or backend-plumbing copy.

import { assertMarketBrainCopyIsCompliant } from './marketBrainGuardrails';
import type { NarrativeModelInput, NarrativeModelProvider, NarrativeModelResult } from './narrativeModelProvider';
import { applyGuardrails } from './narrativeOutputGuardrails';

export type SafeNarrativeExplainerMode = 'deterministic_fallback' | 'llm_ready_contract' | 'provider_enriched';

export interface SafeNarrativeExplainerInput {
  symbol: string;
  payload: string;
  mode?: SafeNarrativeExplainerMode;
  maxBullets?: number;
}

export interface SafeNarrativeExplainerResult {
  symbol: string;
  mode: SafeNarrativeExplainerMode;
  headline: string;
  explanation: string[];
  evidenceToReview: string[];
  risksToReview: string[];
  whatToWatch: string[];
  needsReview: boolean;
}

const DEFAULT_MAX_BULLETS = 4;
const MAX_PAYLOAD_LENGTH = 1500;
const MAX_LINE_LENGTH = 180;

const UNSAFE_TEXT_PATTERNS = [
  /\bstrong\s+buy\b/i,
  /\bbuy\s+now\b/i,
  /\bsell\s+now\b/i,
  /\bhold\s+recommendation\b/i,
  /\bguaranteed\b/i,
  /\bsure\s+shot\b/i,
  /\bmultibagger\b/i,
  /\btarget\s+price\b/i,
  /\bprovider\b/i,
  /\bapi\b/i,
  /\bbackend\b/i,
  /\bdiagnostics?\b/i,
  /\bcoverage\b/i,
  /\bfreshness\b/i,
  /\blineage\b/i,
  /\bmigration\b/i,
  /\bbackfill\b/i,
  /\bsource\s+pending\b/i,
  /\bsource\s+verified\b/i,
  /\bquote\s+unavailable\b/i,
  /\bhistory\s+unavailable\b/i,
  /\brag\b/i,
  /\bvector\b/i,
  /\bembedding\b/i,
  /\bchunk\b/i,
  /\badapter_unavailable\b/i,
  /\bempty_response\b/i,
  /\bmalformed_response\b/i,
];

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

const isSafeNarrativeLine = (value: string): boolean => {
  if (!value) return false;
  if (!Number.isFinite(value.length)) return false;
  return !UNSAFE_TEXT_PATTERNS.some((pattern) => pattern.test(value));
};

const cleanLine = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = normalizeWhitespace(value).slice(0, MAX_LINE_LENGTH).trim();
  if (!isSafeNarrativeLine(normalized)) return null;
  return normalized;
};

const splitPayloadIntoSafeLines = (payload: string, maxBullets: number): string[] => {
  const bounded = payload.slice(0, MAX_PAYLOAD_LENGTH);
  const candidates = bounded
    .split(/[\n.;•-]+/g)
    .map(cleanLine)
    .filter((line): line is string => Boolean(line));

  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const line of candidates) {
    const key = line.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(line);
    }
    if (deduped.length >= maxBullets) break;
  }

  return deduped;
};

const normalizeSymbol = (symbol: unknown): string => {
  if (typeof symbol !== 'string') return 'UNKNOWN';
  const clean = symbol.trim().toUpperCase().replace(/[^A-Z0-9._-]/g, '').replace(/^[./]+/, '');
  return clean.length > 0 ? clean.slice(0, 24) : 'UNKNOWN';
};

const safeMaxBullets = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_MAX_BULLETS;
  return Math.max(1, Math.min(6, Math.trunc(value)));
};

const reviewFallback = 'Review this alongside business, valuation, risk, and market context.';

export function buildSafeNarrativeExplanation(
  input: SafeNarrativeExplainerInput,
): SafeNarrativeExplainerResult {
  const symbol = normalizeSymbol(input.symbol);
  const mode = input.mode ?? 'deterministic_fallback';
  const maxBullets = safeMaxBullets(input.maxBullets);
  const safeLines = splitPayloadIntoSafeLines(input.payload, maxBullets);
  const needsReview = safeLines.length === 0 || input.payload.length > MAX_PAYLOAD_LENGTH;

  const explanation = safeLines.length > 0
    ? safeLines.map((line) => `Available evidence indicates: ${line}.`)
    : ['There is not enough clean evidence to produce a detailed explanation.'];

  const result: SafeNarrativeExplainerResult = {
    symbol,
    mode,
    headline: needsReview
      ? `${symbol} needs review before the move can be explained clearly.`
      : `${symbol} has a research explanation based on available evidence.`,
    explanation: [...explanation],
    evidenceToReview: safeLines.length > 0
      ? safeLines.map((line) => line)
      : ['Additional research evidence is needed for this view.'],
    risksToReview: needsReview
      ? ['Supporting information is limited for this view.']
      : [reviewFallback],
    whatToWatch: [
      'Whether the move is confirmed by follow-through market behaviour.',
      'Whether the research thesis changes after new company or market context.',
    ],
    needsReview,
  };

  assertMarketBrainCopyIsCompliant([
    result.headline,
    ...result.explanation,
    ...result.evidenceToReview,
    ...result.risksToReview,
    ...result.whatToWatch,
  ].join(' '));

  return {
    ...result,
    explanation: [...result.explanation],
    evidenceToReview: [...result.evidenceToReview],
    risksToReview: [...result.risksToReview],
    whatToWatch: [...result.whatToWatch],
  };
}

// ── Phase 15: Optional provider enrichment ─────────────────────────────

/**
 * Evidence bundle for the enrichment provider.
 */
export interface ProviderEnrichmentInput {
  symbol: string;
  narrative: string;
  evidenceLines: string[];
}

/**
 * Result of provider enrichment.
 * If ok is false, callers SHOULD fall back to the deterministic result.
 */
export interface ProviderEnrichmentResult {
  ok: boolean;
  content?: string;
  reason?: string;
}

const MAX_ENRICHMENT_CHARS = 2_000;

/**
 * Build a safe narrative explanation, optionally enriched by a model provider.
 *
 * Deterministic result is always computed first. If a provider is provided,
 * enabled, and returns clean output, the enrichment is appended to the
 * explanation array. Otherwise the deterministic result is returned as-is.
 */
export async function buildSafeNarrativeExplanationWithProvider(
  input: SafeNarrativeExplainerInput,
  provider?: NarrativeModelProvider,
): Promise<SafeNarrativeExplainerResult> {
  const deterministic = buildSafeNarrativeExplanation(input);

  if (!provider || !provider.isEnabled()) {
    return deterministic;
  }

  const enrichmentInput: NarrativeModelInput = {
    symbol: deterministic.symbol,
    narrative: deterministic.explanation.join(' '),
    context: deterministic.evidenceToReview,
  };

  let modelResult: NarrativeModelResult;
  try {
    modelResult = await provider.explain(enrichmentInput);
  } catch {
    // Provider threw unexpectedly — safe deterministic fallback
    return deterministic;
  }

  if (!modelResult.ok || !modelResult.content) {
    return deterministic;
  }

  const sanitised = applyGuardrails(modelResult.content, MAX_ENRICHMENT_CHARS);

  if (sanitised.length === 0) {
    return deterministic;
  }

  return {
    ...deterministic,
    mode: 'provider_enriched',
    explanation: [...deterministic.explanation, `[AI]: ${sanitised}`],
  };
}
