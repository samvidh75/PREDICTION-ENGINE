/**
 * PredictionCredibilityScorer — TRACK-32 Phase 12
 *
 * Computes a weighted credibility score from six components:
 *   - Hit Rate (20%)
 *   - Alpha (25%)
 *   - Confidence Accuracy (15%)
 *   - Statistical Significance (15%)
 *   - Benchmark Outperformance (15%)
 *   - Data Integrity (10%)
 *
 * Non-negotiable rule: If fewer than 30 validated predictions exist,
 * returns INSUFFICIENT_FORWARD_EVIDENCE classification regardless of scores.
 */

import pool from '../db/index';
import { predictionRegistry } from './PredictionRegistry';
import { confidenceCalibrationEngine } from './ConfidenceCalibrationEngine';
import { statisticalValidationEngine } from './StatisticalValidationEngine';
import { antiCheatingAuditor } from './AntiCheatingAuditor';
import type { PredictionCredibilityScore } from './types';

const MIN_VALIDATED_THRESHOLD = 30;

const CLASSIFICATION_LEVELS = [
  { threshold: 90, label: 'Institutional Prediction Platform' },
  { threshold: 70, label: 'Validated Prediction Engine' },
  { threshold: 50, label: 'Predictive Research Platform' },
  { threshold: 30, label: 'Research Platform' },
  { threshold: 0, label: 'Analytical Framework' },
] as const;

export class PredictionCredibilityScorer {
  async score(): Promise<PredictionCredibilityScore> {
    const validatedCount = await predictionRegistry.countValidatedPredictions();
    const thresholdMet = validatedCount >= MIN_VALIDATED_THRESHOLD;

    if (!thresholdMet) {
      return {
        overall_score: 0,
        level: 'INSUFFICIENT_FORWARD_EVIDENCE',
        threshold_met: false,
        n_validated_predictions: validatedCount,
        components: {
          hit_rate: { score: 0, weight: 20 },
          alpha: { score: 0, weight: 25 },
          confidence_accuracy: { score: 0, weight: 15 },
          statistical_significance: { score: 0, weight: 15 },
          benchmark_outperformance: { score: 0, weight: 15 },
          data_integrity: { score: 0, weight: 10 },
        },
      };
    }

    // ── 1. Hit Rate (20%) ──────────────────────────────────
    const hitRateScore = await this.computeHitRateScore();

    // ── 2. Alpha (25%) ────────────────────────────────────
    const alphaScore = await this.computeAlphaScore();

    // ── 3. Confidence Accuracy (15%) ──────────────────────
    const confidenceAccuracyScore = await this.computeConfidenceAccuracyScore();

    // ── 4. Statistical Significance (15%) ─────────────────
    const statisticalSignificanceScore = await this.computeStatisticalSignificanceScore();

    // ── 5. Benchmark Outperformance (15%) ──────────────────
    const benchmarkOutperformanceScore = await this.computeBenchmarkOutperformanceScore();

    // ── 6. Data Integrity (10%) ────────────────────────────
    const dataIntegrityScore = await this.computeDataIntegrityScore();

    const components = {
      hit_rate: { score: hitRateScore, weight: 20 },
      alpha: { score: alphaScore, weight: 25 },
      confidence_accuracy: { score: confidenceAccuracyScore, weight: 15 },
      statistical_significance: { score: statisticalSignificanceScore, weight: 15 },
      benchmark_outperformance: { score: benchmarkOutperformanceScore, weight: 15 },
      data_integrity: { score: dataIntegrityScore, weight: 10 },
    };

    const overallScore = Math.round(
      hitRateScore * 0.20 +
      alphaScore * 0.25 +
      confidenceAccuracyScore * 0.15 +
      statisticalSignificanceScore * 0.15 +
      benchmarkOutperformanceScore * 0.15 +
      dataIntegrityScore * 0.10
    );

    const level = this.determineLevel(overallScore);

    return {
      overall_score: overallScore,
      level,
      threshold_met: true,
      n_validated_predictions: validatedCount,
      components,
    };
  }

  // ── Component scorers (0-100) ───────────────────────────

  private async computeHitRateScore(): Promise<number> {
    const result = await pool.query(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE alpha > 0) AS hits
       FROM prediction_registry
       WHERE validation_status = 'validated' AND alpha IS NOT NULL`
    );
    const { total, hits } = result.rows[0];
    if (total === 0) return 0;
    const hitRate = Number(hits) / Number(total);
    // Scale: 50% hit rate maps to 50 points, 100% hit rate maps to 100 points
    return Math.min(100, Math.round(hitRate * 100));
  }

  private async computeAlphaScore(): Promise<number> {
    const result = await pool.query(
      `SELECT AVG(alpha) AS mean_alpha
       FROM prediction_registry
       WHERE validation_status = 'validated' AND alpha IS NOT NULL`
    );
    const meanAlpha = Number(result.rows[0]?.mean_alpha ?? 0);
    // Scale: 0% alpha maps to 30 points, 5% alpha maps to 100 points
    const scaled = 30 + (meanAlpha / 5) * 70;
    return Math.max(0, Math.min(100, Math.round(scaled)));
  }

  private async computeConfidenceAccuracyScore(): Promise<number> {
    try {
      const buckets = await confidenceCalibrationEngine.calibrate();
      if (buckets.length === 0) return 0;

      // Map confidence levels to ordinal values
      const levelOrdinal: Record<string, number> = {
        'Very High': 4, 'High': 3, 'Medium': 2, 'Low': 1,
      };

      // Check if higher confidence levels have higher returns
      let correctOrder = 0;
      let totalComparisons = 0;

      for (let i = 0; i < buckets.length; i++) {
        for (let j = i + 1; j < buckets.length; j++) {
          totalComparisons++;
          const iOrd = levelOrdinal[buckets[i].level] ?? 0;
          const jOrd = levelOrdinal[buckets[j].level] ?? 0;
          if (iOrd > jOrd && buckets[i].mean_return > buckets[j].mean_return) correctOrder++;
          else if (jOrd > iOrd && buckets[j].mean_return > buckets[i].mean_return) correctOrder++;
        }
      }

      const accuracy = totalComparisons > 0 ? correctOrder / totalComparisons : 0;
      return Math.min(100, Math.round(accuracy * 100));
    } catch {
      return 0;
    }
  }

  private async computeStatisticalSignificanceScore(): Promise<number> {
    try {
      const result = await statisticalValidationEngine.validateAlpha();
      if (result.is_significant) return 100;
      // Lower p-value maps to a higher score, capped
      if (result.p_value === 1 && result.sample_size > 0) return 0;
      // Score inversely related to p-value: p=0.05 maps to 50, p=0.01 maps to 90
      const pScore = Math.max(0, (1 - result.p_value) * 100);
      return Math.min(100, Math.round(pScore));
    } catch {
      return 0;
    }
  }

  private async computeBenchmarkOutperformanceScore(): Promise<number> {
    const result = await pool.query(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE alpha > 0) AS outperformers
       FROM prediction_registry
       WHERE validation_status = 'validated' AND alpha IS NOT NULL`
    );
    const { total, outperformers } = result.rows[0];
    if (total === 0) return 0;
    const outperformRate = Number(outperformers) / Number(total);
    return Math.min(100, Math.round(outperformRate * 100));
  }

  private async computeDataIntegrityScore(): Promise<number> {
    try {
      const auditResult = await antiCheatingAuditor.audit();
      if (auditResult.passed) return 100;
      // Each failed check deducts points
      const failingChecks = auditResult.findings.filter(
        f => f.includes('detected:') || f.includes('detected')
      ).length;
      return Math.max(0, 100 - failingChecks * 20);
    } catch {
      return 0;
    }
  }

  private determineLevel(score: number): string {
    for (const { threshold, label } of CLASSIFICATION_LEVELS) {
      if (score >= threshold) return label;
    }
    return 'Analytical Framework';
  }
}

export const predictionCredibilityScorer = new PredictionCredibilityScorer();
export default PredictionCredibilityScorer;
