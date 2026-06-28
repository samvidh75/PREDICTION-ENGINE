/**
 * DataCompletenessScorer — evaluates completeness of data across categories
 * and determines whether the overall picture is sufficient for research.
 */

import type {
  DataCompleteness,
  DataGap,
} from "./DataQualityTypes.ts";

// The score at or above which the picture is considered researchable.
const RESEARCHABLE_THRESHOLD = 0.4;

export class DataCompletenessScorer {
  /**
   * Compute completeness from per-category completeness ratios (0–1).
   *
   * @param byCategory — map of category name → completeness ratio
   */
  compute(byCategory: Record<string, number | undefined>): DataCompleteness {
    const gaps: DataGap[] = [];
    let totalScore = 0;
    let count = 0;

    for (const [category, ratio] of Object.entries(byCategory)) {
      if (ratio === undefined) continue;
      totalScore += ratio;
      count++;

      if (ratio < 0.3) {
        gaps.push({
          field: category,
          severity: "critical",
          description: `${category} has very low completeness (${Math.round(ratio * 100)}%)`,
        });
      } else if (ratio < 0.6) {
        gaps.push({
          field: category,
          severity: "warning",
          description: `${category} has partial completeness (${Math.round(ratio * 100)}%)`,
        });
      } else if (ratio < 0.9) {
        gaps.push({
          field: category,
          severity: "info",
          description: `${category} mostly complete (${Math.round(ratio * 100)}%)`,
        });
      }
    }

    const score = count > 0 ? Math.round((totalScore / count) * 100) / 100 : 0;
    const isResearchable = score >= RESEARCHABLE_THRESHOLD;

    return { score, byCategory, gaps, isResearchable };
  }
}
