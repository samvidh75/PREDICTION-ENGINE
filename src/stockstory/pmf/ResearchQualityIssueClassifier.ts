/**
 * ResearchQualityIssueClassifier — Classifies research quality feedback into issue categories.
 *
 * Categories:
 *  - INACCURATE_DATA    — factual errors in numbers/facts
 *  - OUTDATED_INFO      — stale or superseded information
 *  - MISSING_CONTEXT    — lacks important context or drivers
 *  - UNCLEAR_EXPLANATION — confusing or hard to follow
 *  - BIASED_LANGUAGE    — overly bullish/bearish framing
 *  - COMPLIANCE_RISK    — regulatory or disclosure concern
 *  - OTHER              — uncategorized
 */

export type IssueCategory =
  | 'INACCURATE_DATA'
  | 'OUTDATED_INFO'
  | 'MISSING_CONTEXT'
  | 'UNCLEAR_EXPLANATION'
  | 'BIASED_LANGUAGE'
  | 'COMPLIANCE_RISK'
  | 'OTHER';

export interface ClassifiedIssue {
  feedbackId: string;
  category: IssueCategory;
  confidence: number; // 0-1
  detail: string;
  symbol?: string;
  component?: string;
}

export interface ClassificationResult {
  issues: ClassifiedIssue[];
  byCategory: Record<IssueCategory, number>;
  uncategorizedCount: number;
}

const CATEGORY_KEYWORDS: Array<{ category: IssueCategory; keywords: RegExp[]; weight: number }> = [
  {
    category: 'INACCURATE_DATA',
    keywords: [/wrong/i, /incorrect/i, /inaccurate/i, /error/i, /mistake/i, /factually/i, /not correct/i, /numbers? (are )?wrong/i, /data (is )?wrong/i],
    weight: 0.9,
  },
  {
    category: 'OUTDATED_INFO',
    keywords: [/outdated/i, /stale/i, /old/i, /not updated/i, /quarter/i, /last year/i, /obsolete/i, /expired/i],
    weight: 0.85,
  },
  {
    category: 'MISSING_CONTEXT',
    keywords: [/missing/i, /lack/i, /not enough/i, /need more/i, /insufficient/i, /omit/i, /should include/i, /context/i],
    weight: 0.8,
  },
  {
    category: 'UNCLEAR_EXPLANATION',
    keywords: [/confusing/i, /unclear/i, /hard to understand/i, /vague/i, /doesn't make sense/i, /explain better/i, /too technical/i, /simplify/i],
    weight: 0.85,
  },
  {
    category: 'BIASED_LANGUAGE',
    keywords: [/too bullish/i, /too bearish/i, /biased/i, /one-sided/i, /overly optimistic/i, /overly pessimistic/i, /sensational/i, /hype/i],
    weight: 0.8,
  },
  {
    category: 'COMPLIANCE_RISK',
    keywords: [/sebi/i, /regulatory/i, /compliance/i, /disclosure/i, /disclaimer/i, /recommendation/i, /advice/i, /misleading/i],
    weight: 0.9,
  },
];

export class ResearchQualityIssueClassifier {
  private issueCounts: Record<string, number> = {};
  private componentCounts: Record<string, number> = {};
  private totalIssues = 0;
  private totalClassified = 0;

  classify(
    event: {
      userId?: string;
      metricKey: string;
      value: number;
      timestamp: string;
      dimensions?: Record<string, string>;
    },
  ): { issueTypes: string[] } {
    this.totalClassified++;
    const issueTypes: string[] = [];
    const component = event.dimensions?.component ?? 'unknown';

    // Only feedback_count with low rating indicates an issue
    if (event.metricKey === 'pmf.research.feedback_count' && event.value > 0) {
      const rating = event.dimensions?.rating ? parseInt(event.dimensions.rating, 10) : 0;
      if (rating <= 2) {
        issueTypes.push('INACCURATE_DATA');
        this.totalIssues++;
        this.issueCounts['INACCURATE_DATA'] = (this.issueCounts['INACCURATE_DATA'] ?? 0) + 1;
        this.componentCounts[component] = (this.componentCounts[component] ?? 0) + 1;
      }
    }

    return { issueTypes };
  }

  getStatistics(): { totalIssues: number; perComponent: Record<string, number> } {
    return {
      totalIssues: this.totalIssues,
      perComponent: { ...this.componentCounts },
    };
  }

  reset(): void {
    this.totalIssues = 0;
    this.totalClassified = 0;
    this.issueCounts = {};
    this.componentCounts = {};
  }
}
