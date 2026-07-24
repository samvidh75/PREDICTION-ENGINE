/**
 * SECFilter — SEC Compliance Layer for Investment Analysis
 *
 * Ensures all generated thesis text and analysis output complies with
 * SEC (Securities and Exchange Board of India) regulations for
 * research and analysis platforms. Strips forbidden investment-advice
 * language and replaces with educational/safe alternatives.
 *
 * Works alongside ResearchOnlyGuard for double-layer compliance.
 *
 * PROMPT 29 — LLM Orchestrator
 */

export class SECFilter {
  /**
   * Forbidden words/phrases for SEC RA (Registered Adviser) compliance.
   * These terms constitute investment advice and must not appear in output.
   */
  static FORBIDDEN_WORDS = [
    'buy',
    'sell',
    'hold',
    'strong buy',
    'strong sell',
    'outperform',
    'underperform',
    'overweight',
    'underweight',
    'add',
    'reduce',
    'accumulate',
    'will go up',
    'will decline',
    'guaranteed',
    'certain',
    'price target',
    'target price',
    'fair value of',
    'should invest',
    'must buy',
    'definitely',
    'risk-free',
    'best stock',
    'top pick',
    'multibagger',
    'tip',
    'recommend',
  ];

  /**
   * Safe replacements that preserve meaning without constituting advice
   */
  static SAFE_REPLACEMENTS: Record<string, string> = {
    'buy': 'consider',
    'sell': 'review position',
    'hold': 'maintain position',
    'strong buy': 'high conviction',
    'strong sell': 'avoid for now',
    'outperform': 'may outperform',
    'underperform': 'may underperform',
    'overweight': 'higher allocation considered',
    'underweight': 'lower allocation considered',
    'add': 'increase exposure',
    'reduce': 'decrease exposure',
    'accumulate': 'build position gradually',
    'will go up': 'may appreciate',
    'will decline': 'may depreciate',
    'guaranteed': 'potential',
    'certain': 'likely',
    'price target': 'potential value estimate',
    'target price': 'potential value estimate',
    'fair value of': 'estimated value of',
    'should invest': 'may consider',
    'must buy': 'may evaluate',
    'definitely': 'potentially',
    'risk-free': 'lower-risk',
    'best stock': 'strong performer',
    'top pick': 'notable name',
    'multibagger': 'high-growth potential',
    'tip': 'observation',
    'recommend': 'highlight',
  };

  /**
   * Filter a text string for PSE compliance.
   * Replaces forbidden phrases with safe alternatives.
   */
  static filterThesis(text: string): string {
    let filtered = text;

    // Sort by length descending to replace longer phrases first
    const forbidden = Object.keys(this.SAFE_REPLACEMENTS).sort(
      (a, b) => b.length - a.length,
    );

    for (const word of forbidden) {
      const safe = this.SAFE_REPLACEMENTS[word];
      const regex = new RegExp(`\\b${this.escapeRegex(word)}\\b`, 'gi');
      filtered = filtered.replace(regex, safe);
    }

    // Log any remaining forbidden words
    const remaining = this.FORBIDDEN_WORDS.filter((word) => {
      const regex = new RegExp(`\\b${this.escapeRegex(word)}\\b`, 'gi');
      return regex.test(filtered);
    });

    if (remaining.length > 0) {
      console.warn(`PSE compliance: unhandled forbidden terms: ${remaining.join(', ')}`);
    }

    return filtered;
  }

  /**
   * Filter an array of thesis strings (e.g., bullCase, bearCase)
   */
  static filterThesisArray(thesis: string[]): string[] {
    return thesis.map((s) => this.filterThesis(s));
  }

  /**
   * Validate text and return violations
   */
  static validate(text: string): { compliant: boolean; violations: string[] } {
    const violations: string[] = [];
    for (const word of this.FORBIDDEN_WORDS) {
      const regex = new RegExp(`\\b${this.escapeRegex(word)}\\b`, 'gi');
      if (regex.test(text)) {
        violations.push(word);
      }
    }
    return { compliant: violations.length === 0, violations };
  }

  /**
   * Generate SEC-compliant disclaimer for all analysis output
   */
  static generateDisclaimer(): string {
    return [
      'Disclaimer: This analysis is for informational and educational purposes only.',
      'It does not constitute investment advice, a recommendation, or an offer to buy or sell any security.',
      'This is a model-generated analysis based on historical data and quantitative factors.',
      'Past performance does not guarantee future results.',
      'Please consult a PSX SEC-registered investment adviser before making any investment decisions.',
      'Retail investors should conduct their own research and assess their personal risk tolerance.',
    ].join(' ');
  }

  /**
   * Escape special regex characters in search terms
   */
  private static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

export const secFilter = new SECFilter();
