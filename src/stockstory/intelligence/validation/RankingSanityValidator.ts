/**
 * Ranking Sanity Validator
 * Phase 5 — Ensures ranking outputs (top performers, watchlist, scanner)
 * make logical sense and don't promote clearly problematic symbols.
 */
import { BaseValidator } from './IntelligenceValidationRunner';
import type { ValidationIssue, RankingSanityIssue } from './IntelligenceValidationTypes';

interface RankedItem {
  symbol: string;
  rank: number;
  category: string;
  qualityScore?: number;
  riskScore?: number;
  debtToEquity?: number;
  momentumScore?: number;
  confidenceScore?: number;
  convictionLevel?: number;
  dividendYield?: number;
  fiiHolding?: number;
  promoterHolding?: number;
}

const SANITY_CHECKS: Array<(item: RankedItem) => RankingSanityIssue | null> = [
  // High risk in top 10 is suspect
  (item) => {
    if (item.rank <= 10 && item.riskScore != null && item.riskScore > 0.7) {
      return {
        type: 'severe_risk_top',
        symbol: item.symbol,
        rank: item.rank,
        category: item.category,
        explanation: `Rank #${item.rank} with risk score ${item.riskScore} — high risk in top 10 is suspicious`,
      };
    }
    return null;
  },

  // Low confidence in top positions
  (item) => {
    if (item.rank <= 15 && item.confidenceScore != null && item.confidenceScore < 0.3) {
      return {
        type: 'low_confidence_top',
        symbol: item.symbol,
        rank: item.rank,
        category: item.category,
        explanation: `Rank #${item.rank} with confidence ${item.confidenceScore} — shouldn't rank this high with low confidence`,
      };
    }
    return null;
  },

  // Value trap: high quality + low momentum + high rank
  (item) => {
    if (item.qualityScore != null && item.qualityScore > 0.7 &&
        item.momentumScore != null && item.momentumScore < 0.3 &&
        item.rank <= 20) {
      return {
        type: 'value_trap_quality',
        symbol: item.symbol,
        rank: item.rank,
        category: item.category,
        explanation: `Quality ${item.qualityScore} but momentum ${item.momentumScore} — possible value trap at rank #${item.rank}`,
      };
    }
    return null;
  },

  // High debt in top rankings
  (item) => {
    if (item.debtToEquity != null && item.debtToEquity > 2.0 && item.rank <= 20) {
      return {
        type: 'high_debt_leader',
        symbol: item.symbol,
        rank: item.rank,
        category: item.category,
        explanation: `D/E ratio ${item.debtToEquity} at rank #${item.rank} — high debt in top rankings needs justification`,
      };
    }
    return null;
  },

  // High conviction without evidence density (proxied by confidence)
  (item) => {
    if (item.convictionLevel != null && item.convictionLevel > 0.7 &&
        item.confidenceScore != null && item.confidenceScore < 0.4 &&
        item.rank <= 20) {
      return {
        type: 'missing_data_conviction',
        symbol: item.symbol,
        rank: item.rank,
        category: item.category,
        explanation: `Conviction ${item.convictionLevel} with low confidence ${item.confidenceScore} at rank #${item.rank}`,
      };
    }
    return null;
  },

  // Dividend trap: very high yield + top stability ranking
  (item) => {
    if (item.dividendYield != null && item.dividendYield > 5 &&
        item.rank <= 15 && item.category === 'stability') {
      return {
        type: 'dividend_trap_stability',
        symbol: item.symbol,
        rank: item.rank,
        category: item.category,
        explanation: `Dividend yield ${item.dividendYield}% in stability top — verify sustainability`,
      };
    }
    return null;
  },
];

export class RankingSanityValidator extends BaseValidator {
  readonly id = 'ranking-sanity';
  readonly name = 'Ranking Sanity Validator';

  protected async runChecks(
    symbol: string,
    data: unknown,
  ): Promise<{ issues: ValidationIssue[]; totalChecks: number }> {
    const item = data as RankedItem | undefined;
    if (!item) return { issues: [], totalChecks: 0 };

    const issues: ValidationIssue[] = [];
    let totalChecks = 0;

    for (const check of SANITY_CHECKS) {
      totalChecks++;
      const result = check(item);
      if (result) {
        issues.push({
          id: `rs-${result.type}-${symbol}`,
          severity: 'warning',
          module: this.id,
          symbol,
          reason: result.explanation,
          recommendedFix: 'Review ranking methodology or add context explaining the ranking',
          detectedAt: new Date().toISOString(),
        });
      }
    }

    return { issues, totalChecks };
  }

  /**
   * Run all sanity checks against a full ranking list.
   */
  validateRankings(items: RankedItem[]): RankingSanityIssue[] {
    const allIssues: RankingSanityIssue[] = [];
    for (const item of items) {
      for (const check of SANITY_CHECKS) {
        const issue = check(item);
        if (issue) allIssues.push(issue);
      }
    }
    return allIssues;
  }
}

export { SANITY_CHECKS };
export type { RankedItem };
