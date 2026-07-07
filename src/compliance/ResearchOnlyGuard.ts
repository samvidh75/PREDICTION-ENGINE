/**
 * ResearchOnlyGuard — SEBI Compliance
 * Disclaimers: This platform provides research scores only, not investment advice.
 * No buy/sell recommendations. All outputs are model-generated observations.
 */
export const RESEARCH_ONLY_DISCLAIMER = 
  'This platform provides research scores, factor rankings, and historical observations. ' +
  'Nothing on this platform constitutes investment advice, buy/sell recommendations, ' +
  'or price targets. Users must consult a PSE-listed investment adviser before ' +
  'making any investment decisions. Model outputs are based on historical data and ' +
  'do not guarantee future performance.';

export class ResearchOnlyGuard {
  static DISALLOWED_TERMS = [
    'buy', 'sell', 'recommend', 'target price', 'strong buy', 'strong sell',
    'outperform', 'undervalued', 'overvalued', 'should buy', 'should sell',
    'multibagger', 'guaranteed', 'risk-free', 'best stock', 'tip'
  ];

  static sanitize(text: string): string {
    let sanitized = text;
    for (const term of ResearchOnlyGuard.DISALLOWED_TERMS) {
      const regex = new RegExp(term, 'gi');
      sanitized = sanitized.replace(regex, '***');
    }
    return sanitized;
  }

  static validate(text: string): { compliant: boolean; violations: string[] } {
    const violations: string[] = [];
    for (const term of ResearchOnlyGuard.DISALLOWED_TERMS) {
      const regex = new RegExp(term, 'gi');
      if (regex.test(text)) {
        violations.push(term);
      }
    }
    return { compliant: violations.length === 0, violations };
  }

  static getDisclaimer(): string {
    return RESEARCH_ONLY_DISCLAIMER;
  }
}
