/**
 * DataFreshnessScorer — evaluates how fresh each dataset category is
 * and flags critical staleness.
 */

import type { DataFreshnessInfo, StalenessInfo } from "./DataQualityTypes.ts";

// Reasonable staleness thresholds (milliseconds)
const THRESHOLDS: Record<string, number> = {
  market_prices: 24 * 60 * 60 * 1000,        // 1 day
  fundamentals: 7 * 24 * 60 * 60 * 1000,      // 7 days
  technicals: 24 * 60 * 60 * 1000,            // 1 day
  news: 12 * 60 * 60 * 1000,                  // 12 hours
  filings: 30 * 24 * 60 * 60 * 1000,          // 30 days
  quarterly_results: 14 * 24 * 60 * 60 * 1000, // 14 days
  shareholding: 90 * 24 * 60 * 60 * 1000,     // 90 days
  corporate_actions: 30 * 24 * 60 * 60 * 1000, // 30 days
};

export class DataFreshnessScorer {
  /**
   * Score freshness for each dataset category.
   *
   * @param agesByDataset — map of dataset name → age in ms
   */
  score(agesByDataset: Record<string, number | undefined>): DataFreshnessInfo {
    const stalenessByDataset: Record<string, StalenessInfo | undefined> = {};
    let totalScore = 0;
    let count = 0;
    let hasCriticalStaleness = false;

    for (const [dataset, ageMs] of Object.entries(agesByDataset)) {
      if (ageMs === undefined) continue;

      const maxAcceptableAgeMs = THRESHOLDS[dataset] ?? 7 * 24 * 60 * 60 * 1000;
      const ratio = ageMs / maxAcceptableAgeMs;
      // score 1.0 → current, approaches 0 as ratio increases beyond 2×
      const datasetScore = Math.max(0, 1 - Math.log2(1 + ratio) / 4);

      if (ratio > 3) hasCriticalStaleness = true;

      stalenessByDataset[dataset] = {
        ageMs,
        maxAcceptableAgeMs,
        label: this.labelForRatio(ratio),
      };

      totalScore += datasetScore;
      count++;
    }

    const score = count > 0 ? Math.round((totalScore / count) * 100) / 100 : 0;
    const staleDatasets = Object.entries(stalenessByDataset)
      .filter(([_, info]) => info && info.label !== "current")
      .map(([name]) => name);

    const detail =
      staleDatasets.length === 0
        ? "all_datasets_current"
        : `${staleDatasets.join(", ")} ${staleDatasets.length === 1 ? "is" : "are"} stale`;

    return { score, detail, stalenessByDataset, hasCriticalStaleness };
  }

  private labelForRatio(ratio: number): string {
    if (ratio <= 1) return "current";
    if (ratio <= 2) return "slightly_stale";
    if (ratio <= 4) return "stale";
    return "out_of_date";
  }
}
