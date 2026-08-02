/**
 * ConfidenceCalibrationEngine — TRACK-32 Phase 4
 *
 * Analyzes validated predictions grouped by confidence_level to produce
 * calibration buckets. This reveals whether the system's self-assigned
 * confidence levels correlate with actual outcomes.
 *
 * Output: ConfidenceCalibrationBucket[] sorted by count desc
 */

import type { ConfidenceCalibrationBucket, PredictionRecord, ConfidenceLevel } from './types';
import { predictionRegistry } from './PredictionRegistry';

export class ConfidenceCalibrationEngine {
  /**
   * Groups all validated predictions by confidence_level and computes
   * calibration statistics for each bucket.
   *
   * Returns buckets sorted by count descending.
   */
  async calibrate(): Promise<ConfidenceCalibrationBucket[]> {
    const predictions = await predictionRegistry.getValidatedPredictions();

    if (predictions.length === 0) {
      return [];
    }

    // Group by confidence_level
    const groups: Record<ConfidenceLevel, PredictionRecord[]> = {
      'Very High': [],
      'High': [],
      'Medium': [],
      'Low': [],
    };

    for (const p of predictions) {
      if (groups[p.confidence_level]) {
        groups[p.confidence_level].push(p);
      }
    }

    const buckets: ConfidenceCalibrationBucket[] = [];

    for (const level of Object.keys(groups) as ConfidenceLevel[]) {
      const recs = groups[level];
      if (recs.length === 0) continue;

      const count = recs.length;
      const validatedCount = recs.filter(r => r.validation_status === 'validated').length;

      // Returns array (filter nulls from records not yet having alpha)
      const returns: number[] = [];
      const alphas: number[] = [];

      for (const r of recs) {
        if (r.future_return !== null) {
          returns.push(r.future_return);
        }
        if (r.alpha !== null) {
          alphas.push(r.alpha);
        }
      }

      const meanReturn = returns.length > 0
        ? returns.reduce((s, v) => s + v, 0) / returns.length
        : 0;

      const sortedReturns = [...returns].sort((a, b) => a - b);
      const mid = Math.floor(sortedReturns.length / 2);
      const medianReturn = sortedReturns.length > 0
        ? sortedReturns.length % 2 === 0
          ? (sortedReturns[mid - 1] + sortedReturns[mid]) / 2
          : sortedReturns[mid]
        : 0;

      const meanAlpha = alphas.length > 0
        ? alphas.reduce((s, v) => s + v, 0) / alphas.length
        : 0;

      // Volatility: std dev of returns
      const volatility = returns.length > 1
        ? Math.sqrt(
            returns.reduce((sum, v) => sum + Math.pow(v - meanReturn, 2), 0) /
            (returns.length - 1)
          )
        : 0;

      // Max drawdown: worst return in the bucket
      const maxDrawdown = returns.length > 0 ? Math.min(...returns) : 0;

      // Hit rate: fraction where alpha > 0
      const hitRate = alphas.length > 0
        ? alphas.filter(a => a > 0).length / alphas.length
        : 0;

      buckets.push({
        level,
        count,
        validated_count: validatedCount,
        mean_return: round4(meanReturn),
        median_return: round4(medianReturn),
        mean_alpha: round4(meanAlpha),
        volatility: round4(volatility),
        max_drawdown: round4(maxDrawdown),
        hit_rate: round4(hitRate),
      });
    }

    // Sort by count descending
    buckets.sort((a, b) => b.count - a.count);

    return buckets;
  }
}

/** Round to 4 decimal places for consistency with DECIMAL(10,4) */
function round4(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}

export const confidenceCalibrationEngine = new ConfidenceCalibrationEngine();
export default ConfidenceCalibrationEngine;