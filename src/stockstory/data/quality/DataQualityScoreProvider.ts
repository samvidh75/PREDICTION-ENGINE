/**
 * DataQualityScoreProvider — computes overall data quality scores from
 * per-dimension inputs and produces safe public-facing limitation labels.
 *
 * This is the Phase 6 ("Data Moat") scorer, separate from the pre-existing
 * per-record `DataQualityScorer` in the same directory.
 */

import type {
  DataQualityScore,
  QualityDimension,
} from "./DataQualityTypes.ts";
import { toConfidenceTier, toPublicLimitation } from "./DataQualityTypes.ts";
import { mean } from "@/utils/statisticalUtils.ts";

export class DataQualityScoreProvider {
  /**
   * Compute an overall quality score from per-dimension sub-scores.
   * Dimensions not provided default to 0.
   */
  compute(
    dimensions: Partial<Record<QualityDimension, number>>,
    extraMissingFields?: string[],
  ): DataQualityScore {
    const allDimensions: QualityDimension[] = [
      "financial_completeness",
      "price_completeness",
      "technical_completeness",
      "news_availability",
      "filings_availability",
      "results_availability",
      "document_availability",
      "peer_sector_completeness",
      "freshness",
      "conflict_rate",
      "confidence",
    ];

    const scores = allDimensions.map((d) => dimensions[d] ?? 0);
    const overall = mean(scores) ?? 0;

    const missingFields = this.collectMissingFields(dimensions, extraMissingFields);
    const tier = toConfidenceTier(overall);

    return {
      overall,
      dimensions,
      missingFields,
      freshnessDetail: this.buildFreshnessDetail(dimensions.freshness),
      publicLimitation: toPublicLimitation(tier),
      computedAt: new Date().toISOString(),
    };
  }

  // -------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------

  private collectMissingFields(
    dimensions: Partial<Record<QualityDimension, number>>,
    extra?: string[],
  ): string[] {
    const missing: string[] = [];
    if ((dimensions.financial_completeness ?? 0) < 0.5)
      missing.push("financial_completeness");
    if ((dimensions.price_completeness ?? 0) < 0.5)
      missing.push("price_completeness");
    if ((dimensions.technical_completeness ?? 0) < 0.5)
      missing.push("technical_completeness");
    if ((dimensions.news_availability ?? 0) < 0.5)
      missing.push("news_availability");
    if ((dimensions.filings_availability ?? 0) < 0.5)
      missing.push("filings_availability");
    if ((dimensions.results_availability ?? 0) < 0.5)
      missing.push("results_availability");
    if ((dimensions.document_availability ?? 0) < 0.5)
      missing.push("document_availability");
    if ((dimensions.peer_sector_completeness ?? 0) < 0.5)
      missing.push("peer_sector_completeness");
    if (extra) missing.push(...extra);
    return missing;
  }

  private buildFreshnessDetail(freshnessScore: number | undefined): string {
    if (freshnessScore === undefined) return "not_evaluated";
    if (freshnessScore >= 0.9) return "current";
    if (freshnessScore >= 0.7) return "recent";
    if (freshnessScore >= 0.4) return "stale";
    return "out_of_date";
  }
}
