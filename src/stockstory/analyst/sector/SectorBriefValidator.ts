/**
 * SectorBriefValidator
 */

import { ForbiddenLanguageValidator } from '../../intelligence/validation/ForbiddenLanguageValidator';
import type { SectorBrief } from './SectorBriefTypes';

export class SectorBriefValidator {
  private forbidden = new ForbiddenLanguageValidator();

  validate(brief: SectorBrief, knownSymbols: Set<string>): { passed: boolean; errors: string[] } {
    const errors: string[] = [];
    const text = JSON.stringify(brief);

    const forbidden = this.forbidden.validate(text);
    if (!forbidden.passed) {
      errors.push(...forbidden.violations.map((v) => v.term));
    }

    for (const leader of brief.qualityLeaders) {
      if (!knownSymbols.has(leader.symbol)) {
        errors.push(`Unknown symbol in quality leaders: ${leader.symbol}`);
      }
    }

    if (/best sector to invest/i.test(text)) {
      errors.push('Forbidden sector ranking language.');
    }

    return { passed: errors.length === 0, errors };
  }
}
