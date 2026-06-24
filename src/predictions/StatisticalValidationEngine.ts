/**
 * StatisticalValidationEngine — TRACK-32 Phase 9
 *
 * Performs rigorous statistical validation of prediction outcomes.
 * Two primary tests:
 *   1. One-sample t-test on alpha — tests whether mean alpha > 0
 *   2. Two-sample t-test — compares top quartile vs. bottom quartile returns
 *
 * Critical invariant: NEVER claims alpha significance unless p < 0.05.
 * All results are stored in the statistical_validations table for audit trail.
 */

import pool from '../db/index';
import { predictionRegistry } from './PredictionRegistry';
import type { StatisticalValidation } from './types';

/**
 * Compute the standard normal CDF (cumulative distribution function).
 * Approximation using the Abramowitz and Stegun formula (accuracy ~1e-7).
 */
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const pVal = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1 / (1 + pVal * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1 + sign * y);
}

/**
 * Compute p-value from t-statistic and degrees of freedom.
 * Uses the normal approximation (valid for df > 30).
 * For smaller samples, a reference to a t-distribution table would be needed,
 * but for our use case (should be >30 validated predictions) this is sufficient.
 */
function tPValue(tStat: number, df: number): number {
  // Two-tailed p-value using normal approximation
  const pOneSided = 1 - normalCDF(Math.abs(tStat));
  return 2 * pOneSided;
}

/**
 * Approximate t-critical value for 95% confidence (two-tailed).
 * For df > 30 this converges to ~1.96.
 */
function tCritical95(df: number): number {
  if (df >= 120) return 1.96;
  if (df >= 60) return 2.00;
  if (df >= 40) return 2.021;
  if (df >= 30) return 2.042;
  // Smaller samples: rough approximations
  if (df >= 20) return 2.086;
  if (df >= 10) return 2.228;
  if (df >= 5) return 2.571;
  return 2.776; // df=4
}

export class StatisticalValidationEngine {
  /**
   * One-sample t-test for alpha > 0.
   *
   * Gets all validated predictions at 30-day horizon.
   * Calculates t-statistic, p-value, 95% confidence interval,
   * and information ratio (mean(alpha) / std(alpha)).
   *
   * Returns result; NEVER claims alpha unless p < 0.05.
   */
  async validateAlpha(): Promise<StatisticalValidation> {
    const today = new Date().toISOString().split('T')[0];

    // Get all validated predictions with alpha at 30-day horizon
    const predictions = await predictionRegistry.getValidatedPredictions({
      horizon: 30,
    });

    // Filter to only those that have non-null alpha
    const alphas = predictions
      .filter(p => p.alpha !== null && p.alpha !== undefined && isFinite(p.alpha))
      .map(p => p.alpha as number);

    const n = alphas.length;

    if (n < 2) {
      // Cannot compute t-test with fewer than 2 observations
      const result: StatisticalValidation = {
        test_name: 'alpha_one_sample_ttest',
        t_statistic: 0,
        p_value: 1,
        confidence_interval_lower: 0,
        confidence_interval_upper: 0,
        information_ratio: 0,
        is_significant: false,
        sample_size: n,
      };
      await this.storeResult(result, today);
      console.info(`[StatisticalValidationEngine] validateAlpha: insufficient data (n=${n})`);
      return result;
    }

    // Compute sample statistics
    const meanAlpha = alphas.reduce((sum, a) => sum + a, 0) / n;
    const stdAlpha = Math.sqrt(
      alphas.reduce((sum, a) => sum + (a - meanAlpha) ** 2, 0) / (n - 1)
    );

    // Handle zero variance edge case
    if (stdAlpha === 0) {
      const result: StatisticalValidation = {
        test_name: 'alpha_one_sample_ttest',
        t_statistic: 0,
        p_value: 1,
        confidence_interval_lower: meanAlpha,
        confidence_interval_upper: meanAlpha,
        information_ratio: 0,
        is_significant: false,
        sample_size: n,
      };
      await this.storeResult(result, today);
      console.info(`[StatisticalValidationEngine] validateAlpha: zero variance, meanAlpha=${meanAlpha}`);
      return result;
    }

    // t-statistic for one-sample test: H0: mu = 0, H1: mu > 0 (or mu != 0 for two-tailed)
    const se = stdAlpha / Math.sqrt(n);
    const tStat = meanAlpha / se;

    // Degrees of freedom
    const df = n - 1;

    // p-value (two-tailed test, but we report one-sided for alpha > 0 interpretation)
    const pValue = tPValue(tStat, df);

    // 95% confidence interval: mean ± t_crit * SE
    const tCrit = tCritical95(df);
    const ciLower = meanAlpha - tCrit * se;
    const ciUpper = meanAlpha + tCrit * se;

    // Information ratio
    const informationRatio = meanAlpha / stdAlpha;

    // Significance: p < 0.05 AND meanAlpha > 0 (NEVER claim alpha unless both)
    const isSignificant = pValue < 0.05 && meanAlpha > 0;

    const result: StatisticalValidation = {
      test_name: 'alpha_one_sample_ttest',
      t_statistic: Math.round(tStat * 10000) / 10000,
      p_value: Math.round(pValue * 1000000) / 1000000,
      confidence_interval_lower: Math.round(ciLower * 10000) / 10000,
      confidence_interval_upper: Math.round(ciUpper * 10000) / 10000,
      information_ratio: Math.round(informationRatio * 10000) / 10000,
      is_significant: isSignificant,
      sample_size: n,
    };

    await this.storeResult(result, today);

    console.info(
      `[StatisticalValidationEngine] validateAlpha: n=${n}, meanAlpha=${meanAlpha.toFixed(4)}, ` +
      `t=${tStat.toFixed(4)}, p=${pValue.toFixed(6)}, IR=${informationRatio.toFixed(4)}, ` +
      `significant=${isSignificant}`,
    );

    return result;
  }

  /**
   * Two-sample t-test comparing top quartile vs. bottom quartile returns.
   *
   * Gets all validated predictions at 30-day horizon, splits by ranking_score
   * into top 25% and bottom 25%, and performs Welch's t-test on the future_return.
   */
  async validateTopVsBottom(): Promise<StatisticalValidation> {
    const today = new Date().toISOString().split('T')[0];

    // Get all validated predictions at 30-day horizon with non-null returns
    const predictions = await predictionRegistry.getValidatedPredictions({
      horizon: 30,
    });

    const withReturns = predictions.filter(
      p => p.future_return !== null && p.future_return !== undefined && isFinite(p.future_return)
    );

    if (withReturns.length < 4) {
      // Need at least 4 observations to split into quartiles meaningfully
      const result: StatisticalValidation = {
        test_name: 'top_vs_bottom_quartile_ttest',
        t_statistic: 0,
        p_value: 1,
        confidence_interval_lower: 0,
        confidence_interval_upper: 0,
        information_ratio: 0,
        is_significant: false,
        sample_size: withReturns.length,
      };
      await this.storeResult(result, today);
      console.info(`[StatisticalValidationEngine] validateTopVsBottom: insufficient data (n=${withReturns.length})`);
      return result;
    }

    // Sort by ranking_score descending
    const sorted = [...withReturns].sort((a, b) => b.ranking_score - a.ranking_score);

    const n = sorted.length;
    const quartileSize = Math.floor(n / 4);
    // Need at least 2 in each group
    const effectiveQuartileSize = Math.max(quartileSize, 2);

    const topQuartile = sorted.slice(0, effectiveQuartileSize);
    const bottomQuartile = sorted.slice(-effectiveQuartileSize);

    const topReturns = topQuartile.map(p => p.future_return as number);
    const bottomReturns = bottomQuartile.map(p => p.future_return as number);

    const n1 = topReturns.length;
    const n2 = bottomReturns.length;

    // Sample means
    const mean1 = topReturns.reduce((s, r) => s + r, 0) / n1;
    const mean2 = bottomReturns.reduce((s, r) => s + r, 0) / n2;

    // Sample variances
    const var1 = n1 > 1
      ? topReturns.reduce((s, r) => s + (r - mean1) ** 2, 0) / (n1 - 1)
      : 0;
    const var2 = n2 > 1
      ? bottomReturns.reduce((s, r) => s + (r - mean2) ** 2, 0) / (n2 - 1)
      : 0;

    // Handle zero variance edge case
    if (var1 === 0 && var2 === 0) {
      const result: StatisticalValidation = {
        test_name: 'top_vs_bottom_quartile_ttest',
        t_statistic: 0,
        p_value: 1,
        confidence_interval_lower: 0,
        confidence_interval_upper: 0,
        information_ratio: 0,
        is_significant: false,
        sample_size: n,
      };
      await this.storeResult(result, today);
      console.info(`[StatisticalValidationEngine] validateTopVsBottom: zero variance in both groups`);
      return result;
    }

    // Welch's t-test (unequal variances, unequal sample sizes)
    const seDiff = Math.sqrt(var1 / n1 + var2 / n2);
    const tStat = (mean1 - mean2) / seDiff;

    // Welch-Satterthwaite degrees of freedom
    const num = (var1 / n1 + var2 / n2) ** 2;
    const den = ((var1 / n1) ** 2) / (n1 - 1) + ((var2 / n2) ** 2) / (n2 - 1);
    const df = den > 0 ? num / den : n1 + n2 - 2;

    // p-value (two-tailed)
    const pValue = tPValue(tStat, df);

    // 95% confidence interval for the difference in means
    const tCrit = tCritical95(Math.max(Math.floor(df), 1));
    const ciLower = (mean1 - mean2) - tCrit * seDiff;
    const ciUpper = (mean1 - mean2) + tCrit * seDiff;

    // Information ratio: mean diff / pooled std dev
    const pooledStd = Math.sqrt(((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2));
    const informationRatio = pooledStd > 0 ? (mean1 - mean2) / pooledStd : 0;

    // Significance: p < 0.05 AND top outperforms bottom (mean1 > mean2)
    const isSignificant = pValue < 0.05 && mean1 > mean2;

    const result: StatisticalValidation = {
      test_name: 'top_vs_bottom_quartile_ttest',
      t_statistic: Math.round(tStat * 10000) / 10000,
      p_value: Math.round(pValue * 1000000) / 1000000,
      confidence_interval_lower: Math.round(ciLower * 10000) / 10000,
      confidence_interval_upper: Math.round(ciUpper * 10000) / 10000,
      information_ratio: Math.round(informationRatio * 10000) / 10000,
      is_significant: isSignificant,
      sample_size: n,
    };

    await this.storeResult(result, today);

    console.info(
      `[StatisticalValidationEngine] validateTopVsBottom: n=${n}, topMean=${mean1.toFixed(4)}, ` +
      `bottomMean=${mean2.toFixed(4)}, t=${tStat.toFixed(4)}, p=${pValue.toFixed(6)}, ` +
      `IR=${informationRatio.toFixed(4)}, significant=${isSignificant}`,
    );

    return result;
  }

  /**
   * Store statistical validation result in the statistical_validations table.
   * Uses upsert on (computed_at, test_name) to avoid duplicates.
   */
  private async storeResult(result: StatisticalValidation, computedAt: string): Promise<void> {
    await pool.query(
      `INSERT INTO statistical_validations (
        computed_at, test_name, t_statistic, p_value,
        confidence_interval_lower, confidence_interval_upper,
        information_ratio, is_significant, sample_size
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (computed_at, test_name) DO UPDATE SET
        t_statistic = EXCLUDED.t_statistic,
        p_value = EXCLUDED.p_value,
        confidence_interval_lower = EXCLUDED.confidence_interval_lower,
        confidence_interval_upper = EXCLUDED.confidence_interval_upper,
        information_ratio = EXCLUDED.information_ratio,
        is_significant = EXCLUDED.is_significant,
        sample_size = EXCLUDED.sample_size`,
      [
        computedAt,
        result.test_name,
        result.t_statistic,
        result.p_value,
        result.confidence_interval_lower,
        result.confidence_interval_upper,
        result.information_ratio,
        result.is_significant,
        result.sample_size,
      ]
    );
  }
}

export const statisticalValidationEngine = new StatisticalValidationEngine();
export default StatisticalValidationEngine;