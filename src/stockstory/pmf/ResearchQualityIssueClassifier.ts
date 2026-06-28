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
  classify(
    feedbackEntries: Array<{
      id: string;
      comment?: string;
      symbol?: string;
      component?: string;
      feedback_type?: string;
    }>,
  ): ClassificationResult {
    const issues: ClassifiedIssue[] = [];
    const byCategory: Record<IssueCategory, number> = {
      INACCURATE_DATA: 0,
      OUTDATED_INFO: 0,
      MISSING_CONTEXT: 0,
      UNCLEAR_EXPLANATION: 0,
      BIASED_LANGUAGE: 0,
      COMPLIANCE_RISK: 0,
      OTHER: 0,
    };

    for (const entry of feedbackEntries) {
      const comment = entry.comment ?? '';
      if (!comment.trim()) {
        // If no comment but feedback_type indicates issue, classify as OTHER
        if (entry.feedback_type === 'incorrect' || entry.feedback_type === 'confusing') {
          issues.push({
            feedbackId: entry.id,
            category: 'OTHER',
            confidence: 0.5,
            detail: `Feedback type: ${entry.feedback_type}`,
            symbol: entry.symbol,
            component: entry.component,
          });
          byCategory.OTHER++;
        }
        continue;
      }

      let bestCategory: IssueCategory = 'OTHER';
      let bestConfidence = 0;

      for (const rule of CATEGORY_KEYWORDS) {
        for (const re of rule.keywords) {
          if (re.test(comment)) {
            if (rule.weight > bestConfidence) {
              bestConfidence = rule.weight;
              bestCategory = rule.category;
            }
            break;
          }
        }
      }

      // Boost for specific feedback type + comment combo
      if (entry.feedback_type === 'incorrect') {
        const incorrectConfidence = Math.max(bestConfidence, 0.7);
        if (incorrectConfidence > bestConfidence) {
          bestCategory = 'INACCURATE_DATA';
          bestConfidence = incorrectConfidence;
        }
      }

      issues.push({
        feedbackId: entry.id,
        category: bestCategory,
        confidence: bestConfidence,
        detail: comment.slice(0, 200),
        symbol: entry.symbol,
        component: entry.component,
      });

      byCategory[bestCategory]++;
    }

    return {
      issues,
      byCategory,
      uncategorizedCount: byCategory.OTHER,
    };
  }
}
