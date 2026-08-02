/**
 * Sanitizes analyst outputs for public/product surfaces.
 */

import { ForbiddenLanguageValidator } from '../../intelligence/validation/ForbiddenLanguageValidator';
import { OutputSanitizer } from '../../intelligence/validation/OutputSanitizer';

const INTERNAL_KEYS = new Set([
  'internalSource',
  'inputHash',
  'dataSnapshotIds',
  'engineVersions',
  'promptVersion',
  'reviewMetadata',
  'auditTrailId',
  'workflowId',
  'taskId',
  'rawInput',
  'debug',
]);

const forbiddenValidator = new ForbiddenLanguageValidator();
const outputSanitizer = new OutputSanitizer();

export function sanitizeAnalystText(text: string): string {
  const sanitized = outputSanitizer.sanitizeText(text);
  const forbidden = forbiddenValidator.validate(sanitized.text);
  return forbidden.passed ? sanitized.text : forbiddenValidator.sanitize(sanitized.text);
}

export function serializeAnalystOutput<T extends Record<string, unknown>>(output: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(output)) {
    if (INTERNAL_KEYS.has(key)) continue;
    if (typeof value === 'string') {
      result[key] = sanitizeAnalystText(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === 'string' ? sanitizeAnalystText(item) : item
      );
    } else {
      result[key] = value;
    }
  }
  return outputSanitizer.stripInternalFields(result);
}

export function containsSecrets(payload: unknown): boolean {
  const text = JSON.stringify(payload).toLowerCase();
  const secretPatterns = ['api_key', 'apikey', 'secret', 'password', 'bearer ', 'sk-'];
  return secretPatterns.some((p) => text.includes(p));
}
