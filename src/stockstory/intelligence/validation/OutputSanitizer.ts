/**
 * OutputSanitizer
 *
 * Sanitizes research output before sending to user-facing surfaces.
 * Removes undefined/null/NaN text, replaces with empty strings.
 * Strips internal-only fields.
 * Ensures compliance-safe language.
 */

import type { EvidenceBoundClaim } from '../evidence/EvidenceTypes';

export interface SanitizedOutput {
  text: string;
  wasModified: boolean;
  modifications: string[];
}

export class OutputSanitizer {
  sanitizeText(text: string | undefined | null): SanitizedOutput {
    const modifications: string[] = [];

    if (text === undefined || text === null) {
      return { text: '', wasModified: true, modifications: ['null/undefined input replaced with empty'] };
    }

    let result = text;

    // Replace null/undefined text
    if (result.includes('undefined')) {
      result = result.replace(/undefined/g, '');
      modifications.push('Replaced "undefined" occurrences');
    }
    if (result.includes('null')) {
      result = result.replace(/\bnull\b/g, '');
      modifications.push('Replaced "null" occurrences');
    }
    if (result.includes('NaN')) {
      result = result.replace(/NaN/g, '');
      modifications.push('Replaced "NaN" occurrences');
    }

    // Remove [object Object]
    if (result.includes('[object Object]')) {
      result = result.replace(/\[object Object\]/g, '');
      modifications.push('Removed [object Object]');
    }

    // Strip empty markers like ":", empty brackets
    result = result.replace(/:\s*$/, '');
    result = result.replace(/\[\s*\]/g, '');
    result = result.replace(/\{\s*\}/g, '');

    // Clean up multiple spaces, newlines
    result = result.replace(/\n{3,}/g, '\n\n').trim();

    const wasModified = modifications.length > 0;
    return { text: result, wasModified, modifications };
  }

  sanitizeClaim(claim: EvidenceBoundClaim): EvidenceBoundClaim & { sanitizedClaim: string; modifications: string[] } {
    const sanitized = this.sanitizeText(claim.claim);
    const allowedTypes: string[] = ['info', 'warning', 'critical'];
    return {
      ...claim,
      claim: sanitized.text,
      sanitizedClaim: sanitized.text,
      modifications: sanitized.modifications,
      confidence: sanitized.wasModified ? Math.max(0, claim.confidence - 0.1) : claim.confidence,
    };
  }

  /** Remove internal-only fields from a research output before sending to frontend */
  stripInternalFields(output: Record<string, unknown>): Record<string, unknown> {
    const internalPrefixes = ['internal', '_internal', 'debug', 'rawInput'];
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(output)) {
      if (internalPrefixes.some((p) => key.startsWith(p))) continue;
      if (key === 'errors' && Array.isArray(value) && value.length === 0) continue;
      result[key] = value;
    }

    return result;
  }

  /** Add public-facing compliance label */
  addComplianceLabel(text: string): string {
    if (text.includes('Research basis') || text.includes('research-only')) return text;
    return text + '\n\n_This analysis is research-only and not investment advice._';
  }
}
