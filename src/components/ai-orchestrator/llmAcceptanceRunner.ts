// ─────────────────────────────────────────────────────────────────────────────
// Phase 19B Phase 5 — LLM Acceptance Runner
//
// Deterministic test harness that evaluates answer quality for:
//  - mocked enhanced model answers
//  - deterministic fallback answers
//  - unsafe model outputs
//  - hallucinated answers
//  - cross-surface fixtures
//
// Pure functions, no model calls, no side effects.
// ─────────────────────────────────────────────────────────────────────────────

import type { ResearchAiContext } from "./researchAiTypes";
import { buildDeterministicReply } from "./useResearchAiOrchestrator";
import { applyGuardrails } from "./researchAiGuardrails";
import {
  evaluateAnswerQuality,
  type ResearchAiAnswerQualityResult,
} from "./researchAiQualityGate";

/* ── Types ───────────────────────────────────────────────────── */

export interface LlmAcceptanceCase {
  id: string;
  surface: string;
  question: string;
  compressedContext: string;
  modelAnswer: string;
  expectedAccepted: boolean;
}

export interface LlmAcceptanceResult {
  id: string;
  accepted: boolean;
  reasons: string[];
  sanitizedAnswer: string;
}

export interface SurfaceAcceptanceReport {
  surface: string;
  safePassed: number;
  safeTotal: number;
  unsafePassed: number;
  unsafeTotal: number;
  deterministicFallbackWorks: boolean;
  noStateMutation: boolean;
}

/* ── Acceptance runner ────────────────────────────────────────── */

export function runLlmAcceptanceCase(
  testCase: LlmAcceptanceCase,
): LlmAcceptanceResult {
  const { sanitized } = applyGuardrails(
    testCase.modelAnswer,
    Object.assign({ surface: testCase.surface as ResearchAiContext["surface"] }),
  );
  const sanitizedText = sanitized || testCase.modelAnswer;
  const quality = evaluateAnswerQuality(sanitizedText, testCase.compressedContext);

  const accepted = testCase.expectedAccepted
    ? quality.accepted
    : !quality.accepted;

  const reasons: string[] = [];
  if (testCase.expectedAccepted !== quality.accepted) {
    reasons.push(
      testCase.expectedAccepted
        ? "expected accepted but was rejected"
        : "expected rejected but was accepted",
    );
  }
  reasons.push(...quality.reasons);

  return {
    id: testCase.id,
    accepted,
    reasons,
    sanitizedAnswer: quality.sanitizedAnswer,
  };
}

export function runLlmAcceptanceSuite(
  cases: LlmAcceptanceCase[],
): LlmAcceptanceResult[] {
  return cases.map(runLlmAcceptanceCase);
}

/**
 * Run a surface-level acceptance check using deterministic replies.
 * Verifies safe questions produce grounded answers and unsafe questions
 * produce safe fallbacks without state mutation.
 */
export function runSurfaceAcceptance(
  surface: string,
  context: ResearchAiContext,
  safeQuestions: string[],
  unsafeQuestions: string[],
): SurfaceAcceptanceReport {
  const contextSnapshot = { ...context, currentPrice: context.currentPrice };
  const surfaceStr = compressContextForEval(context);

  let safePassed = 0;
  let unsafePassed = 0;

  for (const q of safeQuestions) {
    const reply = buildDeterministicReply(context, q);
    const quality = evaluateAnswerQuality(reply, surfaceStr);
    // Safe question should produce a grounded answer
    if (quality.accepted && reply.length > 10) safePassed++;
  }

  for (const q of unsafeQuestions) {
    const reply = buildDeterministicReply(context, q);
    const quality = evaluateAnswerQuality(reply, surfaceStr);
    // Unsafe question should still produce safe output
    if (quality.accepted) unsafePassed++;
  }

  const noStateMutation =
    context.currentPrice === contextSnapshot.currentPrice;

  const deterministicFallbackWorks = safePassed > 0;

  return {
    surface,
    safePassed,
    safeTotal: safeQuestions.length,
    unsafePassed,
    unsafeTotal: unsafeQuestions.length,
    deterministicFallbackWorks,
    noStateMutation,
  };
}

function compressContextForEval(context: ResearchAiContext): string {
  const parts: string[] = [];
  if (context.companyName) parts.push(context.companyName);
  if (context.symbol) parts.push(context.symbol);
  if (context.headline) parts.push(context.headline);
  if (context.title) parts.push(context.title);
  if (context.narrative?.length) parts.push(...context.narrative);
  if (context.risksToReview?.length) parts.push(...context.risksToReview);
  if (context.whatToWatch?.length) parts.push(...context.whatToWatch);
  if (context.scannerContext?.length) parts.push(...context.scannerContext);
  if (context.comparisonContext?.length) parts.push(...context.comparisonContext);
  if (context.watchlistContext?.length) parts.push(...context.watchlistContext);
  if (context.alertContext?.length) parts.push(...context.alertContext);
  return parts.join(" ");
}
