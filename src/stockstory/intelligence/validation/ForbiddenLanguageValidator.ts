/**
 * ForbiddenLanguageValidator
 *
 * Detects and blocks/rejects output containing:
 * - Investment advice language (Buy/Sell/Hold recommendations)
 * - Guaranteed return language
 * - Multi-bagger / sure-shot language
 * - Backend/provider/GPU plumbing language in public output
 *
 * Rules:
 * - Block or rewrite unsafe output.
 * - If output cannot be safely repaired, fall back to deterministic output.
 * - Do not leak validator internals to frontend.
 */

/** Investment advice phrases that must be rejected */
export const FORBIDDEN_INVESTMENT_PHRASES = [
  'guaranteed return',
  'sure shot',
  'multibagger',
  'Buy now',
  'Strong Buy',
  'Sell immediately',
  'target guaranteed',
  'profit assured',
  'risk-free',
  'guaranteed profit',
  'cannot lose',
  'must buy',
  'must sell',
] as const;

/** Plumbing/backend terms that must not appear in public-facing output */
export const FORBIDDEN_PLUMBING_TERMS = [
  'provider',
  'API',
  'backend',
  'ingestion',
  'refresh job',
  'cache miss',
  'cache hit',
  'database',
  'Redis',
  'Postgres',
  'Qdrant',
  'Ollama',
  'SGLang',
  'GPU',
  'CUDA',
  'model server',
  'source pending',
  'source verified',
  'coverage unavailable',
  'freshness unavailable',
  'diagnostics',
] as const;

export interface ForbiddenLanguageResult {
  passed: boolean;
  violations: Array<{
    term: string;
    context: string;
    severity: 'investment_advice' | 'plumbing_term';
  }>;
}

export class ForbiddenLanguageValidator {
  validate(text: string): ForbiddenLanguageResult {
    const violations: ForbiddenLanguageResult['violations'] = [];
    const lower = text.toLowerCase();

    // Check investment advice phrases
    for (const phrase of FORBIDDEN_INVESTMENT_PHRASES) {
      const idx = lower.indexOf(phrase.toLowerCase());
      if (idx !== -1) {
        const start = Math.max(0, idx - 20);
        const end = Math.min(text.length, idx + phrase.length + 20);
        violations.push({
          term: phrase,
          context: text.slice(start, end),
          severity: 'investment_advice',
        });
      }
    }

    // Check plumbing terms
    for (const term of FORBIDDEN_PLUMBING_TERMS) {
      const idx = lower.indexOf(term.toLowerCase());
      if (idx !== -1) {
        const start = Math.max(0, idx - 20);
        const end = Math.min(text.length, idx + term.length + 20);
        violations.push({
          term,
          context: text.slice(start, end),
          severity: 'plumbing_term',
        });
      }
    }

    return {
      passed: violations.length === 0,
      violations,
    };
  }

  sanitize(text: string): string {
    let result = text;
    for (const phrase of FORBIDDEN_INVESTMENT_PHRASES) {
      const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      result = result.replace(regex, (match) => {
        const firstWord = match.split(' ')[0];
        return `${firstWord} [assessment]`;
      });
    }
    for (const term of FORBIDDEN_PLUMBING_TERMS) {
      const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      result = result.replace(regex, '');
    }
    // Clean up double spaces and trim
    result = result.replace(/\s{2,}/g, ' ').trim();
    return result;
  }
}
