// src/components/edge-ai/edgeAiOutputGuardrails.ts
// Phase 5 — Sanitises all AI-generated chat responses for public-facing copy.
//
// Every reply from the worker must pass through sanitizeChatReply() before
// it is displayed to the user. This ensures no recommendation language,
// backend plumbing terminology, or hype claims leak through.
// =========================================================================

import { containsForbiddenRecommendationLanguage } from '../../systems/market-brain/marketBrainGuardrails';

const MAX_REPLY_LENGTH = 800;
const MAX_LINE_LENGTH = 200;

/** Lines starting with these patterns are stripped entirely. */
const BLOCKED_PREFIXES = [
  'disclaimer:',
  'warning:',
  'note: i am an ai',
  'note: this is not',
  'as an ai',
  'i am an ai',
  'i do not have',
  'i cannot provide',
  'i cannot give',
  'for investment advice',
  'consult a financial',
];

/** Patterns that, if present anywhere, cause the entire line to be dropped. */
const BLOCKED_INLINE_PATTERNS = [
  /\bstrong\s+buy\b/i,
  /\bsell\s+immediately\b/i,
  /\bguaranteed\b/i,
  /\bsure\s+shot\b/i,
  /\bmultibagger\b/i,
  /\btarget\s+price\b/i,
  /\btarget\b.*\s+rs\b/i,
  /\bbuy\s+recommendation\b/i,
  /\bhold\s+recommendation\b/i,
  /\bsell\s+recommendation\b/i,
  /\brecommendation\b.*\s+(buy|sell|hold)/i,
  /\bprovider\b/i,
  /\bapi\b/i,
  /\bbackend\b/i,
  /\bwebllm\b/i,
  /\bwebgpu\b/i,
  /\bollama\b/i,
  /\bmodel\s+(name|provider|download|load)/i,
  /\b(mlc|web-llm)\b/i,
  /\binternal\s+(api|service|server)/i,
  /\bdiagnostics?\b/i,
  /\bcoverage\b/i,
  /\blineage\b/i,
  /\bmigration\b/i,
  /\bbackfill\b/i,
  /\bsource\s+pending\b/i,
  /\bsource\s+verified\b/i,
  /\brag\b/i,
  /\bvector\b/i,
  /\bembedding\b/i,
  /\bchunk\b/i,
  /\bnarrativepromptpayload\b/i,
  /\badapter_unavailable\b/i,
  /\bempty_response\b/i,
  /\bmalformed_response\b/i,
];

/* ── Public API ─────────────────────────────────────────────────────── */

/**
 * Sanitise a raw chat reply so it is safe for public-facing display.
 *
 * Returns an array of clean lines. Each line is trimmed, capped, and
 * checked against the blocked-pattern lists above. If every line is
 * stripped, the function returns a single safe fallback message.
 */
export function sanitizeChatReply(raw: string): string[] {
  if (!raw || typeof raw !== 'string') {
    return defaultFallback();
  }

  const lines = raw
    .split(/\n+/g)
    .map((line) => line.trim())
    .filter(Boolean);

  const safeLines: string[] = [];

  for (let line of lines) {
    // Cap individual line length
    if (line.length > MAX_LINE_LENGTH) {
      line = line.slice(0, MAX_LINE_LENGTH) + '…';
    }

    // Skip lines starting with blocked prefixes
    const lower = line.toLowerCase();
    if (BLOCKED_PREFIXES.some((prefix) => lower.startsWith(prefix))) {
      continue;
    }

    // Skip lines containing blocked inline patterns
    if (BLOCKED_INLINE_PATTERNS.some((p) => p.test(line))) {
      continue;
    }

    // Skip lines with forbidden recommendation language
    if (containsForbiddenRecommendationLanguage(line)) {
      continue;
    }

    safeLines.push(line);
  }

  if (safeLines.length === 0) {
    return defaultFallback();
  }

  // Cap total reply length
  let result = joinLines(safeLines);
  if (result.join(' ').length > MAX_REPLY_LENGTH) {
    result = truncateLines(result, MAX_REPLY_LENGTH);
  }

  return result;
}

/**
 * Check whether a callback function contains any unsafe copy.
 * Used in tests to assert that chat handlers never produce forbidden text.
 */
export function containsUnsafeChatCopy(text: string): boolean {
  if (!text) return false;
  if (containsForbiddenRecommendationLanguage(text)) return true;
  return BLOCKED_INLINE_PATTERNS.some((p) => p.test(text));
}

/* ── Internal ───────────────────────────────────────────────────────── */

function defaultFallback(): string[] {
  return [
    'I can reference the available research context for this stock.',
    'Try asking about the narrative, risks, or what to watch.',
  ];
}

function joinLines(lines: string[]): string[] {
  // De-duplicate while preserving order
  const seen = new Set<string>();
  return lines.filter((line) => {
    const key = line.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function truncateLines(lines: string[], maxChars: number): string[] {
  const result: string[] = [];
  let total = 0;
  for (const line of lines) {
    total += line.length + 2; // +2 for newline approximation
    if (total > maxChars) break;
    result.push(line);
  }
  return result.length > 0 ? result : defaultFallback();
}
