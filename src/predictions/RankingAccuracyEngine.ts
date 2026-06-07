/**
 * RankingAccuracyEngine — TRACK-32 Phase 5
 *
 * Tests whether the StockStory ranking_score reliably separates
 * winners from losers. Performs cohort comparisons on validated
 * predictions at a 30-day horizon.
 *
 * Tests performed:
 *   1. Top 10 vs Bottom 10
 *   2. Top Quartile vs Bottom Quartile
 *   3. Top Decile vs All
 *
 * Output: RankingAccuracyResult[] with spreads, hit rates, alphas, and verdicts.
 */

import type { RankingAccuracyResult, PredictionRecord } from './types';
import { predictionRegistry } from './PredictionRegistry';

export class RankingAccuracyEngine {
  /**
   * Analyzes ranking accuracy by comparing top-ranked predictions
   * against bottom-ranked predictions on validated 30-day horizon data.
   */
  async analyze(): Promise<RankingAccuracyResult[]> {
    // Get all validated predictions at 30-day horizon
    const predictions = await predictionRegistry.getValidatedPredictions({
      horizon: 30,
    });

    if (predictions.length === 0) {
      return [];
    }

    // Sort by ranking_score descending
    const sorted = [...predictions].sort(
      (a, b) => b.ranking_score - a.ranking_score,
    );

    const results: RankingAccuracyResult[] = [];

    // ── Test 1: Top 10 vs Bottom 10 ────────────────────────
    if (sorted.length >= 20) {
      const top10 = sorted.slice(0, 10);
      const bottom10 = sorted.slice(-10).reverse(); // worst 10

      results.push(this.buildResult(
        'Top 10 vs Bottom 10',
        'Top 10',
        'Bottom 10',
        top10,
        bottom10,
      ));
    }

    // ── Test 2: Top Quartile vs Bottom Quartile ────────────
    if (sorted.length >= 8) {
      const quartileSize = Math.max(2, Math.floor(sorted.length / 4));
      const topQuartile = sorted.slice(0, quartileSize);
      const bottomQuartile = sorted.slice(-quartileSize).reverse();

      results.push(this.buildResult(
        'Top Quartile vs Bottom Quartile',
        `Top Quartile (n=${topQuartile.length})`,
        `Bottom Quartile (n=${bottomQuartile.length})`,
        topQuartile,
        bottomQuartile,
      ));
    }

    // ── Test 3: Top Decile vs All ──────────────────────────
    if (sorted.length >= 10) {
      const decileSize = Math.max(1, Math.floor(sorted.length / 10));
      const topDecile = sorted.slice(0, decileSize);
      const all = sorted;

      results.push(this.buildResult(
        'Top Decile vs All',
        `Top Decile (n=${topDecile.length})`,
        `All (n=${all.length})`,
        topDecile,
        all,
      ));
    }

    return results;
  }

  /**
   * Build a single RankingAccuracyResult from two cohorts.
   */
  private buildResult(
    test: string,
    topCohortLabel: string,
    bottomCohortLabel: string,
    topCohort: PredictionRecord[],
    bottomCohort: PredictionRecord[],
  ): RankingAccuracyResult {
    const topReturns = this.extractNonNull(topCohort, 'future_return');
    const topAlphas = this.extractNonNull(topCohort, 'alpha');
    const bottomReturns = this.extractNonNull(bottomCohort, 'future_return');
    const bottomAlphas = this.extractNonNull(bottomCohort, 'alpha');

    const topMeanReturn = mean(topReturns);
    const bottomMeanReturn = mean(bottomReturns);
    const spread = round4(topMeanReturn - bottomMeanReturn);
    const topHitRate = hitRate(topAlphas);
    const bottomHitRate = hitRate(bottomAlphas);
    const topAlpha = mean(topAlphas);
    const bottomAlpha = mean(bottomAlphas);

    // Verdict logic
    let verdict: string;
    if (topMeanReturn > bottomMeanReturn && topHitRate > bottomHitRate) {
      verdict = 'Ranking is predictive — top cohort outperforms across return and hit rate';
    } else if (topMeanReturn > bottomMeanReturn) {
      verdict = 'Top cohort has higher returns but inconsistent hit rate';
    } else if (topHitRate > bottomHitRate) {
      verdict = 'Top cohort has better hit rate but lower mean return — mixed signal';
    } else {
      verdict = 'Ranking fails to separate winners from losers — investigate scoring';
    }

    return {
      test,
      top_cohort: topCohortLabel,
      bottom_cohort: bottomCohortLabel,
      top_mean_return: round4(topMeanReturn),
      bottom_mean_return: round4(bottomMeanReturn),
      spread: round4(spread),
      top_hit_rate: round4(topHitRate),
      bottom_hit_rate: round4(bottomHitRate),
      top_alpha: round4(topAlpha),
      bottom_alpha: round4(bottomAlpha),
      verdict,
    };
  }

  /**
   * Extract non-null values for a given numeric field from an array of records.
   */
  private extractNonNull(
    records: PredictionRecord[],
    field: 'future_return' | 'alpha',
  ): number[] {
    return records
      .map(r => r[field])
      .filter((v): v is number => v !== null);
  }
}

/** Arithmetic mean of a number array, returns 0 for empty. */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/** Fraction of alphas > 0 */
function hitRate(alphas: number[]): number {
  if (alphas.length === 0) return 0;
  return alphas.filter(a => a > 0).length / alphas.length;
}

function round4(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}

export const rankingAccuracyEngine = new RankingAccuracyEngine();
export default RankingAccuracyEngine;