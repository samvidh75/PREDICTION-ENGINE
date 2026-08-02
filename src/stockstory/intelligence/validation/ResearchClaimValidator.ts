/**
 * ResearchClaimValidator
 *
 * Master claim validator that coordinates all validation layers:
 * - Numeric claim validation
 * - Forbidden language validation
 * - Output sanitization
 *
 * Provides a unified validate() method for research output.
 */

import type { ResearchEvidence, EvidenceBoundClaim } from '../evidence/EvidenceTypes';
import { ForbiddenLanguageValidator } from './ForbiddenLanguageValidator';
import { NumericClaimValidator } from './NumericClaimValidator';
import { OutputSanitizer } from './OutputSanitizer';

export interface ValidationReport {
  passed: boolean;
  claimCount: number;
  numericWarnings: string[];
  forbiddenLanguageViolations: Array<{ term: string; severity: string }>;
  sanitizationModifications: string[];
  precisionWarnings: string[];
  overallConfidence: number;
}

export class ResearchClaimValidator {
  private forbiddenLanguage: ForbiddenLanguageValidator;
  private numericClaim: NumericClaimValidator;
  private sanitizer: OutputSanitizer;

  constructor() {
    this.forbiddenLanguage = new ForbiddenLanguageValidator();
    this.numericClaim = new NumericClaimValidator();
    this.sanitizer = new OutputSanitizer();
  }

  validateOutput(
    text: string,
    claims: EvidenceBoundClaim[],
    evidence: ResearchEvidence[],
  ): ValidationReport {
    const numericWarnings: string[] = [];
    const precisionWarnings: string[] = [];
    const forbiddenLangResult = this.forbiddenLanguage.validate(text);
    const sanitized = this.sanitizer.sanitizeText(text);

    // Validate each claim's numbers
    for (const claim of claims) {
      const numResult = this.numericClaim.validateClaim(claim.claim, evidence);
      numericWarnings.push(...numResult.warnings);
      const precWarnings = this.numericClaim.checkPrecision(claim.claim, evidence);
      precisionWarnings.push(...precWarnings);
    }

    // Overall confidence: start at 1.0, deduct for each violation
    let confidence = 1.0;
    if (forbiddenLangResult.violations.length > 0) confidence -= 0.3;
    if (numericWarnings.length > 0) confidence -= 0.1 * Math.min(numericWarnings.length, 3);
    if (sanitized.wasModified) confidence -= 0.1;
    if (precisionWarnings.length > 0) confidence -= 0.1;

    return {
      passed:
        forbiddenLangResult.violations.length === 0 &&
        numericWarnings.length === 0 &&
        precisionWarnings.length === 0,
      claimCount: claims.length,
      numericWarnings,
      forbiddenLanguageViolations: forbiddenLangResult.violations.map((v) => ({
        term: v.term,
        severity: v.severity,
      })),
      sanitizationModifications: sanitized.modifications,
      precisionWarnings,
      overallConfidence: Math.max(0, Math.round(confidence * 100) / 100),
    };
  }

  /** Validate full research output object */
  validateFullOutput(
    output: Record<string, unknown>,
    claims: EvidenceBoundClaim[],
    evidence: ResearchEvidence[],
  ): ValidationReport {
    const combinedText = Object.entries(output)
      .filter(([k, v]) => typeof v === 'string' && k !== 'errors' && k !== 'warnings')
      .map(([, v]) => v as string)
      .join(' ');

    return this.validateOutput(combinedText, claims, evidence);
  }
}
