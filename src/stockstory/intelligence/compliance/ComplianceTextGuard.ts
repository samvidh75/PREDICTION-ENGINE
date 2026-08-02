/**
 * ComplianceTextGuard
 *
 * Guard that runs compliance checks on output before it reaches the frontend.
 * Blocks or filters non-compliant output.
 */

import { CompliancePolicy } from './CompliancePolicy';

export class ComplianceTextGuard {
  private policy: CompliancePolicy;

  constructor(policy?: CompliancePolicy) {
    this.policy = policy ?? new CompliancePolicy();
  }

  /**
   * Check output text against all compliance rules.
   * Returns violations if any.
   */
  check(text: string): { passed: boolean; violations: ReturnType<CompliancePolicy['checkText']> } {
    const violations = this.policy.checkText(text);
    return {
      passed: violations.filter((v) => v.severity === 'error').length === 0,
      violations,
    };
  }

  /**
   * Sanitize text by removing/replacing non-compliant language.
   * Returns the sanitized text and whether modifications were made.
   */
  sanitize(text: string): { text: string; modified: boolean } {
    let result = text;
    let modified = false;

    // Replace forbidden buy/sell patterns
    result = result.replace(/\bbuy\s+now\b/gi, 'consider');
    result = result.replace(/\bstrong\s+buy\b/gi, 'positive outlook');
    result = result.replace(/\bsell\s+immediately\b/gi, 'review position');
    result = result.replace(/\bmust\s+buy\b/gi, 'consider');
    result = result.replace(/\bmust\s+sell\b/gi, 'review');
    result = result.replace(/\bmultibagger\b/gi, 'high-growth potential');
    result = result.replace(/\bsure\s+shot\b/gi, 'potential opportunity');
    result = result.replace(/\bguaranteed\s+return\b/gi, 'potential return');
    result = result.replace(/\brisk-free\b/gi, 'lower risk');

    if (result !== text) modified = true;

    return { text: result, modified };
  }

  /**
   * Add research-only disclaimer if not present.
   */
  addDisclaimer(text: string): string {
    if (text.includes('research-only') || text.includes('Research basis')) {
      return text;
    }
    return text + '\n\n_This analysis is for informational purposes only and does not constitute investment advice._';
  }
}
