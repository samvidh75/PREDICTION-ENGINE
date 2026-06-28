/**
 * ResearchAnswerValidator
 */

import { ForbiddenLanguageValidator } from '../../intelligence/validation/ForbiddenLanguageValidator';
import type { ResearchAnswer } from './ResearchQuestionTypes';

export class ResearchAnswerValidator {
  private forbidden = new ForbiddenLanguageValidator();

  validate(answer: ResearchAnswer): { passed: boolean; errors: string[] } {
    const errors: string[] = [];
    const text = JSON.stringify(answer);

    const forbidden = this.forbidden.validate(text);
    if (!forbidden.passed) errors.push(...forbidden.violations.map((v) => v.term));

    if (answer.answer.length < 10 && !answer.redirected) {
      errors.push('Answer too short without redirect.');
    }

    return { passed: errors.length === 0, errors };
  }
}
