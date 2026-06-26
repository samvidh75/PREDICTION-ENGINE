import type { StockStoryNarrativeOutput } from '../research/types';

const FORBIDDEN_PATTERNS = [
  /\bbuy\s+now\b/i,
  /\bstrong\s+buy\b/i,
  /\bsell\s+now\b/i,
  /\bstrong\s+sell\b/i,
  /\bhold\b/i,
  /\btarget\s+price\b/i,
  /\bprice\s+target\b/i,
  /\bguaranteed\b/i,
  /\bmultibagger\b/i,
  /\bsure\s+shot\b/i,
  /\bprofit\s+guaranteed\b/i,
  /\bprovider\b/i,
  /\bapi\b/i,
  /\bcoverage\b/i,
  /\bfreshness\b/i,
  /\bsource\b/i,
  /\blineage\b/i,
  /\bmigration\b/i,
  /\bbackfill\b/i,
  /\bdiagnostics\b/i,
  /\bdatabase\b/i,
  /\bNaN\b/,
  /\bn\/a\b/i,
  /\bnull\b/,
  /\bundefined\b/,
];

const REQUIRED_FIELDS: (keyof StockStoryNarrativeOutput)[] = [
  'thesis',
  'bullCase',
  'bearCase',
  'whatChanged',
  'whyItMatters',
  'keyRisks',
  'watchNext',
  'peerContextSummary',
  'confidenceNote',
  'methodologyNote',
  'complianceSafeLabel',
];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class ResearchOutputValidator {
  validate(output: StockStoryNarrativeOutput): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const field of REQUIRED_FIELDS) {
      const value = output[field];
      if (value === undefined || value === null) {
        errors.push(`Missing required field: ${field}`);
        continue;
      }
      if (typeof value !== 'string') {
        errors.push(`Field ${field} must be a string, got ${typeof value}`);
        continue;
      }
      if (value.trim().length === 0) {
        errors.push(`Field ${field} is empty`);
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors, warnings };
    }

    const fullText = Object.values(output).join(' ');

    for (const pattern of FORBIDDEN_PATTERNS) {
      const match = fullText.match(pattern);
      if (match) {
        errors.push(`Forbidden pattern found: "${match[0]}"`);
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors, warnings };
    }

    return { valid: true, errors: [], warnings };
  }

  validateSafe(input: string): boolean {
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(input)) return false;
    }
    return true;
  }
}

export const researchOutputValidator = new ResearchOutputValidator();
