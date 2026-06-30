// src/components/ai-orchestrator/researchAiGuardrails.ts
// Phase 18 — Shared guardrail layer for all research AI outputs.
//
// No recommendation or forward-looking language. Never sounds like advice.
// Always disclaim the algorithmic nature.
// =========================================================================

import type { GuardrailResult, ResearchAiContext, ResearchAiResponse } from './researchAiTypes';

/* ── Forbidden patterns ─────────────────────────────────────── */

const FORBIDDEN_PATTERNS: { regex: RegExp; reason: string }[] = [
  { regex: /\b(buy|sell|short|cover|long)\s+(now|immediately|urgently|today|this week)\b/i, reason: 'no-timing-specific' },
  { regex: /\b(guaranteed|certain|no[- ]?risk|risk[- ]?free|sure thing|sure bet|sure win)\b/i, reason: 'no-absolute-claim' },
  { regex: /\b(price target|target price)\s*(:|\sof)?\s*[₹$€]\s*\d/i, reason: 'no-price-target' },
  { regex: /\b(should|must|ought to)\s+(buy|sell|invest|purchase|enter|exit)\b/i, reason: 'no-action-verb' },
  { regex: /\b(earn|make|double|triple)\s+(?:\w+\s+)?(money|returns|profit|gains)\b/i, reason: 'no-return-promise' },
  { regex: /\b(stock pick|stock tip|tip|hot pick|hot stock)\b/i, reason: 'no-tip-language' },
  { regex: /\b(this is (not )?investment advice)\b/i, reason: 'no-advice-disclaimer-needed' },
  { regex: /\b(consult|contact|ask)\s+(a|your)\s+(financial|investment|professional|advisor|planner)\b/i, reason: 'no-external-consult-recommendation' },
];

/* ── Sanitisation rules ─────────────────────────────────────── */

const SANITISATION_RULES: { regex: RegExp; replacement: string }[] = [
  // Remove absolute language
  { regex: /\b(definitely|absolutely|undoubtedly|certainly|always|never)\b/gi, replacement: '' },
  // Remove casual investment advice language
  { regex: /\b(time to|it['']s time to|now is the time to|don['']t miss)\b/gi, replacement: 'shows that' },
  // Downgrade forward-looking
  { regex: /\b(will|won['']t)\s+(rise|fall|increase|decrease|outperform|underperform)\b/gi, replacement: 'may $2' },
  // Remove dollar/rupee amount forecasts
  { regex: /[₹$€]\s*\d+(?:[,.]\d+)?(?:\s*(?:-|to)\s*[₹$€]\s*\d+(?:[,.]\d+)?)?/g, replacement: '' },
  // Remove any percentage predictions
  { regex: /\b\d+(\.\d+)?%\s+(upside|downside|return|gain|loss|growth|decline)\b/gi, replacement: '' },
  // Remove "we recommend", "our view" etc
  { regex: /\b(we|our)\s+(recommend|think|believe|view|opinion|suggest)\b/gi, replacement: 'the assessment suggests' },
];

/** Maximum length of a guardrailed generated string. */
const MAX_RESPONSE_LENGTH = 1200;

/* ── Public API ─────────────────────────────────────────────── */

/**
 * Apply all guardrails to a generated text.
 * Returns a GuardrailResult with sanitized text and the disposition.
 */
export function applyGuardrails(text: string, _context: ResearchAiContext): GuardrailResult {
  let sanitized = text.trim();
  if (!sanitized) {
    return { allowed: true, sanitized: '', reason: null };
  }

  let detectedForbidden = false;

  // 1. Check for forbidden patterns
  for (const { regex, reason } of FORBIDDEN_PATTERNS) {
    if (regex.test(sanitized)) {
      detectedForbidden = true;
      // Try to salvage by removing ALL instances of the forbidden phrase
      const before = sanitized;
      sanitized = sanitized.replace(new RegExp(regex.source, 'gi'), '').trim();
      if (sanitized === before || !sanitized) {
        return { allowed: true, sanitized: '', reason: `removed-${reason}` };
      }
    }
  }

  // 2. Apply sanitisation rules
  for (const { regex, replacement } of SANITISATION_RULES) {
    sanitized = sanitized.replace(regex, replacement);
  }

  // 3. Trim length
  if (sanitized.length > MAX_RESPONSE_LENGTH) {
    sanitized = sanitized.slice(0, MAX_RESPONSE_LENGTH - 1) + '…';
  }

  // 4. Clean up whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  if (detectedForbidden) {
    return { allowed: true, sanitized, reason: 'partial-forbidden-removal' };
  }

  return { allowed: true, sanitized, reason: null };
}

/**
 * Apply post-hoc guardrails to a full ResearchAiResponse before showing it to the user.
 */
export function applyResponseGuardrails(response: ResearchAiResponse, context: ResearchAiContext): ResearchAiResponse {
  if (!response.text) {
    return response;
  }

  const result = applyGuardrails(response.text, context);

  if (!result.allowed || !result.sanitized || result.reason !== null) {
    return {
      ...response,
      text: null,
      needsReview: true,
    };
  }

  return {
    ...response,
    text: result.sanitized,
  };
}

/**
 * Guardrail-safe summariser: returns bullet points when text is empty.
 */
export function fallbackIfEmpty(text: string | null, context: ResearchAiContext): string {
  if (text && text.length > 10) return text;

  const points: string[] = [];
  if (context.narrative.length > 0) {
    points.push(context.narrative[0]);
  }
  if (context.risksToReview.length > 0) {
    points.push('Risk factor flagged: ' + context.risksToReview[0]);
  }
  if (context.whatToWatch.length > 0) {
    points.push('Watch item: ' + context.whatToWatch[0]);
  }

  if (points.length > 0) {
    return points.map((p) => '• ' + p).join('\n');
  }

  return `Algorithmic assessment available for ${context.companyName}. Review the research metrics below.`;
}

/** Truncate a conversation transcript to a safe window. */
export function trimConversation(
  messages: { role: string; text: string }[],
  maxMessages: number = 10,
): { role: string; text: string }[] {
  if (messages.length <= maxMessages) return messages;
  // Keep system, then most recent (maxMessages - 1)
  const system = messages.filter((m) => m.role === 'system').slice(-1);
  const nonSystem = messages.filter((m) => m.role !== 'system');
  const recent = nonSystem.slice(-(maxMessages - system.length));
  return [...system, ...recent];
}
