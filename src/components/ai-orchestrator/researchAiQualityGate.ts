// ─────────────────────────────────────────────────────────────────────────────
// Phase 19C-3 — Research AI Answer Quality Gate
//
// Shared quality evaluator that both the acceptance test harness and the
// runtime browser-local path import, avoiding circular dependencies.
//
// Pure functions, no model calls, no side effects.
// ─────────────────────────────────────────────────────────────────────────────

import { sanitizeResearchAiOutput } from './researchAiGuardrails';

/* ── Quality patterns ─────────────────────────────────────────── */

const FORBIDDEN_PATTERNS = [
  /\bbuy\b/i,
  /\bsell\b/i,
  /\bhold\b/i,
  /\bstrong buy\b/i,
  /\bguaranteed\b/i,
  /\bsure shot\b/i,
  /\bmultibagger\b/i,
  /\btarget\b/i,
  /\bprovider\b/i,
  /\bapi\b/i,
  /\bbackend\b/i,
  /\bdiagnostics?\b/i,
  /\bcoverage\b/i,
  /\bfreshness\b/i,
  /\blineage\b/i,
  /\bmigration\b/i,
  /\bbackfill\b/i,
  /\brag\b/i,
  /\bvector\b/i,
  /\bembedding\b/i,
  /\bchunk\b/i,
  /\badapter\b/i,
  /\bwebllm\b/i,
  /\bwebgpu\b/i,
  /\bwasm\b/i,
  /\bollama\b/i,
  /\bllama\b/i,
  /\bqwen\b/i,
  /\bphi\b/i,
  /\bnarrativepromptpayload\b/i,
  /\bcritical breakout\b/i,
  /\bpanic selling\b/i,
  /\bzero server load\b/i,
  /\bunlimited prompts\b/i,
  /\bserverless ai\b/i,
];

const INTERNAL_ERROR_PATTERNS = [
  /error:/i,
  /exception/i,
  /traceback/i,
  /stack trace/i,
  /failed to/i,
];

/* ── Result type ──────────────────────────────────────────────── */

export interface ResearchAiAnswerQualityResult {
  accepted: boolean;
  reasons: string[];
  sanitizedAnswer: string;
  confidence: 'low' | 'medium' | 'high';
  fallbackRequired: boolean;
}

/**
 * Evaluate a single answer against quality criteria.
 * Pure deterministic function — no model calls.
 */
export function evaluateAnswerQuality(
  answer: string,
  context: string,
): ResearchAiAnswerQualityResult {
  const reasons: string[] = [];
  let confidence: 'low' | 'medium' | 'high' = 'high';

  // Check for forbidden content
  if (FORBIDDEN_PATTERNS.some((p) => p.test(answer))) {
    reasons.push('contains forbidden terms');
    confidence = 'low';
  }

  // Check for internal errors
  if (INTERNAL_ERROR_PATTERNS.some((p) => p.test(answer))) {
    reasons.push('contains internal error language');
    confidence = 'low';
  }

  // Check for raw null/undefined/NaN/Infinity
  if (/\b(null|undefined|NaN|Infinity)\b/.test(answer)) {
    reasons.push('contains raw null/undefined/NaN/Infinity');
    confidence = 'low';
  }

  // Check for JSON-like structure
  if (/^\{[\s\S]*\}$/.test(answer.trim()) || /^\[[\s\S]*\]$/.test(answer.trim())) {
    if (/[:[\]{}]/.test(answer)) {
      reasons.push('answer is JSON-like structure');
      confidence = 'low';
    }
  }

  // Check if answer is grounded in context
  if (context) {
    const contextWords = new Set(
      context
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 3),
    );
    const answerWords = new Set(
      answer
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 3),
    );
    const overlap = [...answerWords].filter((w) => contextWords.has(w)).length;
    const ratio = answerWords.size > 0 ? overlap / answerWords.size : 0;

    if (ratio < 0.15) {
      reasons.push('answer has low context grounding');
      confidence = 'low';
    } else if (ratio < 0.3) {
      reasons.push('answer has moderate context grounding');
      if (confidence === 'high') confidence = 'medium';
    }
  }

  // Check for invented numeric claims
  const numbersInAnswer = answer.match(/\d+(\.\d+)?%/g);
  const numbersInContext = context.match(/\d+(\.\d+)?%/g);
  if (numbersInAnswer && (!numbersInContext || numbersInAnswer.length > numbersInContext.length)) {
    const invented = numbersInAnswer.filter(
      (n) => !numbersInContext?.includes(n),
    );
    if (invented.length > 0) {
      reasons.push('may contain invented percentage values');
      if (confidence === 'high') confidence = 'medium';
    }
  }

  // Check for recommendation language in answer context
  if (/\bshould\b/i.test(answer)) {
    reasons.push('contains recommendation-like language');
    if (confidence === 'high') confidence = 'medium';
  }

  // Check for broker/order instructions
  if (/\border\b|\bbroker\b|\bplace\b.*\btrade\b|\bexecute\b/i.test(answer)) {
    reasons.push('contains broker or order language');
    confidence = 'low';
  }

  const accepted = reasons.length === 0 || confidence !== 'low';
  const sanitized = sanitizeResearchAiOutput(answer) ?? '';

  return {
    accepted,
    reasons,
    sanitizedAnswer: sanitized,
    confidence,
    fallbackRequired: !accepted,
  };
}
