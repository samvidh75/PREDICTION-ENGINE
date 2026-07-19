/**
 * researchAiChatGuardrails — Chat-specific guardrails for AI Research Chat.
 *
 * While the base researchAiGuardrails handles forbidden content & output
 * sanitization, this module covers chat-specific checks:
 *   1. User query validation before dispatching to any runtime.
 *   2. Prompt-injection / jailbreak heuristics.
 *   3. Topic restrictions (no trading, no recommendations).
 *   4. Session-level rate limiting.
 *
 * These are LOCAL checks only — no backend cost, no model call.
 * =========================================================================
 */

import type { ChatMessage } from './researchAiChatTypes';

// ─── Check Result ──────────────────────────────────────────────────

export interface ChatGuardrailResult {
  /** false if the query should be blocked */
  allowed: boolean;
  /** Human-readable reason for the block */
  reason: string;
}

// ─── Forbidden user query patterns ─────────────────────────────────

const FORBIDDEN_QUERY_PATTERNS: RegExp[] = [
  /\bbuy\b/i,
  /\bsell\b/i,
  /\bhold\b/i,
  /\btarget\s+price\b/i,
  /\bstop.?loss\b/i,
  /\binvestment\s+advice\b/i,
  /\btrading\s+recommendation\b/i,
  /\bshould\s+I\b/i,
  /\bwhat\s+should\s+I\b/i,
  /\btip\b/i,
  /\bsure.?shot\b/i,
  /\bguaranteed\b/i,
  /\bdouble\s+your\b/i,
  /\bget\s+rich\b/i,
  /\bmarket\s+timing\b/i,
  /\bmomentum\s+picks?\b/i,
  /\bpump\b/i,
  /\bdump\b/i,
  /\bmoon\b/i,
  /\bto\s+the\s+moon\b/i,
  /\byolo\b/i,
  /\bfomo\b/i,
  /\btake\s+profit\b/i,
  /\bexit\s+strategy\b/i,
  /\bposition\s+sizing?\b/i,
  /\ballocation\s+advice\b/i,
];

// ─── Prompt injection / jailbreak heuristics ───────────────────────

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|directives|rules)/i,
  /forget\s+(all\s+)?(previous|prior|above)/i,
  /you\s+are\s+(now|no\s+longer)/i,
  /act\s+as\s+(if\s+)?(a\s+)?(trader|broker|advisor|analyst)/i,
  /system\s+prompt/i,
  /override\s+(your|the)\s+(instructions|configuration)/i,
  /new\s+role\s*:/i,
  /pretend\s+(you\s+are|to\s+be)/i,
  /write\s+(a|the)\s+(python|javascript|bash|code|script)/i,
  /exec(?:ute)?\s+this\s+code/i,
  /run\s+(a\s+)?(command|query|shell)/i,
];

// ─── Sanitization (input) ──────────────────────────────────────────

/**
 * Validate and sanitize a user chat query.
 * Returns allowed: false with reason if the query should be blocked.
 */
export function validateChatQuery(query: string): ChatGuardrailResult {
  const trimmed = query.trim();

  if (!trimmed) {
    return { allowed: false, reason: 'Query is empty.' };
  }

  if (trimmed.length > 1000) {
    return { allowed: false, reason: 'Query is too long (max 1,000 characters).' };
  }

  // Check forbidden patterns
  for (const pattern of FORBIDDEN_QUERY_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        allowed: false,
        reason: 'This query contains stock recommendation or trading language. Research context only.',
      };
    }
  }

  // Check injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        allowed: false,
        reason: 'This query has been blocked by safety guidelines.',
      };
    }
  }

  return { allowed: true, reason: 'ok' };
}

// ─── Session-level limits ──────────────────────────────────────────

/**
 * Check conversation turn limit.
 * Returns allowed: false if the session has reached its max turns.
 */
export function checkTurnLimit(
  messages: ChatMessage[],
  maxTurns: number,
): ChatGuardrailResult {
  // A "turn" = one user+assistant pair. Count user messages.
  const userTurns = messages.filter((m) => m.role === 'user').length;

  if (userTurns >= maxTurns) {
    return {
      allowed: false,
      reason: `Conversation limit reached (${maxTurns} turns). Start a new conversation to continue.`,
    };
  }

  return { allowed: true, reason: 'ok' };
}

// ─── Output safety (post-processing) ────────────────────────────────

/**
 * Sanitize assistant output to catch anything the runtime might let through.
 */
export function sanitizeChatOutput(text: string): string {
  let safe = text;

  // Strip any text containing buy/sell/hold recommendation language
  const DANGEROUS_PATTERNS = [
    /\byou\s+should\s+(buy|sell|hold)\b/gi,
    /\b(i|we)\s+recommend\b/gi,
    /\bstrong\s+(buy|sell)\b/gi,
    /\boutperform\b/gi,
    /\bunderperform\b/gi,
    /\btarget\s+price\s*(?:is\s*)?[:₹$]?\s*\d+/gi,
    /\bprice\s+target\b/gi,
  ];

  for (const pattern of DANGEROUS_PATTERNS) {
    safe = safe.replace(pattern, '');
  }

  // Collapse repeated whitespace from removal
  safe = safe.replace(/\s{3,}/g, '  ').trim();

  return safe || 'I can discuss research context but not provide trading recommendations.';
}
