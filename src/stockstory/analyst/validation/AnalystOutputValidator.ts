/**
 * AnalystOutputValidator
 */

import { ForbiddenLanguageValidator } from '../../intelligence/validation/ForbiddenLanguageValidator';
import { OutputSanitizer } from '../../intelligence/validation/OutputSanitizer';

export interface AnalystValidationResult {
  passed: boolean;
  errors: string[];
  unsupportedClaimsRemoved: number;
}

export class AnalystOutputValidator {
  private forbidden = new ForbiddenLanguageValidator();
  private sanitizer = new OutputSanitizer();

  validate(output: Record<string, unknown>): AnalystValidationResult {
    const errors: string[] = [];
    const textFields = this.collectStringFields(output).join(' ');

    const forbidden = this.forbidden.validate(textFields);
    if (!forbidden.passed) {
      errors.push(...forbidden.violations.map((v) => `Forbidden: ${v.term}`));
    }

    if (/\bundefined\b|\bnull\b|NaN/.test(textFields)) {
      errors.push('Output contains undefined/null/NaN markers in text fields.');
    }

    if (/fake (filing|earnings|sector|analyst|memo)/i.test(textFields)) {
      errors.push('Fake content marker detected.');
    }

    const sanitized = this.sanitizer.sanitizeText(textFields);
    const unsupportedClaimsRemoved = sanitized.wasModified ? 1 : 0;

    return {
      passed: errors.length === 0,
      errors,
      unsupportedClaimsRemoved,
    };
  }

  private collectStringFields(value: unknown): string[] {
    if (typeof value === 'string') return [value];
    if (Array.isArray(value)) return value.flatMap((v) => this.collectStringFields(v));
    if (value && typeof value === 'object') {
      return Object.values(value as Record<string, unknown>).flatMap((v) => this.collectStringFields(v));
    }
    return [];
  }

  stripUnsafe(output: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(output)) {
      if (typeof value === 'string') {
        result[key] = this.forbidden.sanitize(this.sanitizer.sanitizeText(value).text);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
}
