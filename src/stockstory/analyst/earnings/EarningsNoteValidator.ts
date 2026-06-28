/**
 * EarningsNoteValidator
 */

import { ForbiddenLanguageValidator } from '../../intelligence/validation/ForbiddenLanguageValidator';
import type { EarningsNote } from './EarningsNoteTypes';

export interface EarningsValidationResult {
  passed: boolean;
  errors: string[];
}

export class EarningsNoteValidator {
  private forbidden = new ForbiddenLanguageValidator();

  validate(note: EarningsNote, metrics?: { consensusAvailable?: boolean }): EarningsValidationResult {
    const errors: string[] = [];
    const text = JSON.stringify(note);

    const forbidden = this.forbidden.validate(text);
    if (!forbidden.passed) {
      errors.push(...forbidden.violations.map((v) => `Forbidden language: ${v.term}`));
    }

    if (!metrics?.consensusAvailable) {
      if (/beat|miss/i.test(note.resultSnapshot) || /beat|miss/i.test(note.headline)) {
        errors.push('Beat/miss language requires consensus data.');
      }
    }

    const numericPattern = /₹[\d,]+|\d+\.\d+%/g;
    const claims = note.resultSnapshot.match(numericPattern) ?? [];
    if (claims.length > 0 && note.limitations.some((l) => l.includes('metrics'))) {
      errors.push('Unsupported numeric claims with missing metrics.');
    }

    return { passed: errors.length === 0, errors };
  }
}
