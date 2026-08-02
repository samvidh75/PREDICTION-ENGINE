/**
 * Explainability QA
 * Phase 12 — Validates that research output explanations are
 * clear, complete, and contain no hidden forbidden language.
 */
import {
  FORBIDDEN_INVESTMENT_PHRASES,
  FORBIDDEN_BACKEND_PHRASES,
  ALLOWED_USER_LANGUAGE,
} from '../validation/IntelligenceValidationTypes';
import type { ValidationIssue } from '../validation/IntelligenceValidationTypes';

export interface ExplainabilityResult {
  symbol: string;
  /** Whether the explanation is human-readable */
  readable: boolean;
  /** Whether explanation matches evidence */
  evidenceAligned: boolean;
  /** Whether any forbidden phrases were found */
  hasForbiddenPhrases: boolean;
  /** List of forbidden phrases detected */
  forbiddenFound: string[];
  /** Whether the answer is complete (not partial) */
  complete: boolean;
  /** Whether it uses preferred research language */
  usesPreferredLanguage: boolean;
  /** Issues found */
  issues: ValidationIssue[];
  /** Overall pass/fail */
  passed: boolean;
}

export class ExplainabilityQA {
  private forbiddenInvestment = new Set(FORBIDDEN_INVESTMENT_PHRASES.map(p => p.toLowerCase()));
  private forbiddenBackend = new Set(FORBIDDEN_BACKEND_PHRASES.map(p => p.toLowerCase()));
  private allowedLanguage = new Set(ALLOWED_USER_LANGUAGE.map(p => p.toLowerCase()));

  /**
   * Validate an explanation string.
   */
  validateExplanation(symbol: string, explanation: string): ExplainabilityResult {
    const issues: ValidationIssue[] = [];
    const lower = explanation.toLowerCase();

    // Check for forbidden investment phrases
    const forbiddenFound: string[] = [];
    for (const phrase of this.forbiddenInvestment) {
      if (lower.includes(phrase)) forbiddenFound.push(phrase);
    }
    for (const phrase of this.forbiddenBackend) {
      if (lower.includes(phrase)) forbiddenFound.push(phrase);
    }

    if (forbiddenFound.length > 0) {
      issues.push({
        id: `explain-forbidden-${symbol}`,
        severity: 'error',
        module: 'explainability-qa',
        symbol,
        reason: `Forbidden phrases found: ${forbiddenFound.join(', ')}`,
        recommendedFix: 'Replace with compliance-safe research language (e.g., "Review risk", "Monitor thesis")',
        detectedAt: new Date().toISOString(),
      });
    }

    // Check for minimum explanation length
    const readable = explanation.length > 50;
    if (!readable) {
      issues.push({
        id: `explain-short-${symbol}`,
        severity: 'warning',
        module: 'explainability-qa',
        symbol,
        reason: `Explanation too short (${explanation.length} chars)`,
        recommendedFix: 'Provide at least 2-3 sentences of research context',
        detectedAt: new Date().toISOString(),
      });
    }

    // Check for preferred language usage
    const preferredCount = [...this.allowedLanguage].filter(w => lower.includes(w)).length;
    const usesPreferredLanguage = preferredCount >= 2;

    if (!usesPreferredLanguage) {
      issues.push({
        id: `explain-lang-${symbol}`,
        severity: 'info',
        module: 'explainability-qa',
        symbol,
        reason: `Only ${preferredCount} preferred research terms found`,
        recommendedFix: 'Use research-language terms like "thesis", "risk", "conviction", "review"',
        detectedAt: new Date().toISOString(),
      });
    }

    // Check for evidence alignment (proxied by citation markers)
    const hasCitations = lower.includes('source') || lower.includes('based on') ||
                         lower.includes('according to') || lower.includes('data shows');
    const evidenceAligned = hasCitations;

    if (!evidenceAligned) {
      issues.push({
        id: `explain-cite-${symbol}`,
        severity: 'info',
        module: 'explainability-qa',
        symbol,
        reason: 'No evidence citations or sourcing language found',
        recommendedFix: 'Add sourcing context (e.g., "Based on Q3FY24 data...")',
        detectedAt: new Date().toISOString(),
      });
    }

    // Check completeness (must end with a period or have >100 chars)
    const complete = explanation.endsWith('.') || explanation.endsWith('?') || explanation.length > 100;

    return {
      symbol,
      readable,
      evidenceAligned,
      hasForbiddenPhrases: forbiddenFound.length > 0,
      forbiddenFound,
      complete,
      usesPreferredLanguage,
      issues,
      passed: issues.filter(i => i.severity === 'error').length === 0,
    };
  }
}
