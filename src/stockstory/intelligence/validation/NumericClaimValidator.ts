/**
 * NumericClaimValidator
 *
 * Validates that numeric values in claims are present in the supplied
 * structured data inputs. Rejects invented numbers.
 */

import type { ResearchEvidence } from '../evidence/EvidenceTypes';

export interface NumericClaimValidationResult {
  passed: boolean;
  warnings: string[];
  detectedNumbers: Array<{
    value: number;
    foundInEvidence: boolean;
    context: string;
    evidenceId?: string;
  }>;
}

export class NumericClaimValidator {
  /**
   * Extract all numeric values from a claim text.
   */
  extractNumbers(text: string): Array<{ value: number; context: string }> {
    const results: Array<{ value: number; context: string }> = [];

    // Match numbers (including decimals, negatives, percentages)
    const numRegex = /(\d+[.,]?\d*)\s*(%|crore|lakh|crores|lakhs|mn|bn|trn)?/gi;
    let match;

    while ((match = numRegex.exec(text)) !== null) {
      // Clean the number
      const rawValue = match[1].replace(',', '');
      const value = parseFloat(rawValue);

      // Filter out dates, years, and very small numbers
      if (isNaN(value)) continue;
      if (value > 1800 && value < 2100 && !match[2]) continue; // likely a year
      if (value === 0) continue;
      if (value > 1_000_000_000_000) continue; // unreasonable

      const contextStart = Math.max(0, match.index - 15);
      const contextEnd = Math.min(text.length, match.index + match[0].length + 15);
      const context = text.slice(contextStart, contextEnd);

      results.push({ value, context });
    }

    return results;
  }

  /**
   * Validate that numeric values in a claim exist in the provided evidence.
   */
  validateClaim(claim: string, evidence: ResearchEvidence[]): NumericClaimValidationResult {
    const detectedNumbers = this.extractNumbers(claim);
    const warnings: string[] = [];

    const evidenceValues = new Set(
      evidence
        .filter((e) => typeof e.value === 'number')
        .map((e) => (e.value as number).toFixed(4)),
    );

    const evidenceValuesRounded = new Set(
      evidence
        .filter((e) => typeof e.value === 'number')
        .map((e) => Math.round(e.value as number)),
    );

    const results: NumericClaimValidationResult['detectedNumbers'] = [];

    for (const dn of detectedNumbers) {
      // Check exact match (to 4 decimal places)
      const exactMatch = evidenceValues.has(dn.value.toFixed(4));
      // Check rounded match
      const roundedMatch = evidenceValuesRounded.has(Math.round(dn.value));

      // Check if it's a percentage (likely derived, not invented)
      const isPercentage = dn.context.includes('%');

      const found = exactMatch || roundedMatch;

      if (!found && !isPercentage) {
        warnings.push(`Number ${dn.value} (near "${dn.context}") not found in evidence`);
      }

      results.push({
        value: dn.value,
        foundInEvidence: found,
        context: dn.context,
      });
    }

    return {
      passed: warnings.length === 0,
      warnings,
      detectedNumbers: results,
    };
  }

  /**
   * Validate that a number in a claim is not suspiciously precise
   * when evidence only has rounded values.
   */
  checkPrecision(claim: string, evidence: ResearchEvidence[]): string[] {
    const warnings: string[] = [];
    const evidenceValues = evidence
      .filter((e) => typeof e.value === 'number')
      .map((e) => e.value as number);

    const numRegex = /\d+\.\d{3,}/g;
    let match;

    while ((match = numRegex.exec(claim)) !== null) {
      const value = parseFloat(match[0]);
      // Check if any evidence value rounds to this number
      const supported = evidenceValues.some(
        (ev) => Math.abs(ev - value) < 0.01,
      );
      if (!supported) {
        warnings.push(`Overly precise number ${value} not supported by evidence`);
      }
    }

    return warnings;
  }
}
