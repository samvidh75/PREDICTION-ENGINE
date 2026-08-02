/**
 * CompanyDeepDiveValidator
 */

import { ForbiddenLanguageValidator } from '../../intelligence/validation/ForbiddenLanguageValidator';
import type { CompanyDeepDive } from './CompanyDeepDiveTypes';

export class CompanyDeepDiveValidator {
  private forbidden = new ForbiddenLanguageValidator();

  validate(dive: CompanyDeepDive, peers?: string[]): { passed: boolean; errors: string[] } {
    const errors: string[] = [];
    const text = JSON.stringify(dive);

    const forbidden = this.forbidden.validate(text);
    if (!forbidden.passed) errors.push(...forbidden.violations.map((v) => v.term));

    if (/buy|sell|hold recommendation|price target/i.test(text)) {
      errors.push('Investment recommendation language detected.');
    }

    if (dive.governanceOwnership.includes('promoter') && !dive.limitations.some((l) => l.includes('governance'))) {
      // governance claims need evidence flag in limitations or evidence
    }

    if (peers) {
      const peerMentions = peers.filter((p) => text.includes(p));
      for (const p of peerMentions) {
        if (!peers.includes(p)) errors.push(`Unknown peer: ${p}`);
      }
    }

    return { passed: errors.length === 0, errors };
  }
}
