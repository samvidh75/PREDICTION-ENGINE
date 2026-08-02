/**
 * AnalystPublicSafetyValidator — public surface safety checks.
 */

import { AnalystOutputValidator } from './AnalystOutputValidator';
import { serializeAnalystOutput } from '../shared/AnalystPublicSerializer';

export class AnalystPublicSafetyValidator {
  private validator = new AnalystOutputValidator();

  validatePublic(output: Record<string, unknown>): { safe: boolean; publicOutput: Record<string, unknown> } {
    const validation = this.validator.validate(output);
    const publicOutput = serializeAnalystOutput(
      validation.passed ? output : this.validator.stripUnsafe(output)
    );
    return { safe: validation.passed, publicOutput };
  }
}

export const analystPublicSafetyValidator = new AnalystPublicSafetyValidator();
