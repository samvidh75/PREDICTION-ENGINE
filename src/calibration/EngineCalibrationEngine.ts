/**
 * EngineCalibrationEngine — TRACK-34 Phase 3
 *
 * Calibrates engine score weights by analyzing correlation between
 * individual engine scores and actual forward returns from validated predictions.
 * Detects overweights, score inflation, score compression, and sector drift.
 * Produces a CalibrationReport with issues and recommended weight adjustments.
 */

import pool from '../db/index';
import { predictionRegistry } from '../predictions/PredictionRegistry';
import type { PredictionRecord } from '../predictions/types';

/** A single calibration issue detected during analysis. */
export interface CalibrationIssue {
  type: 'overweight' | 'score_inflation' | 'score_compression' | 'sector_drift';
  engine?: string;
  severity: 'low' | 'medium' | 'high';
  detail: string;
  metric_value: number;
  threshold: number;
}

/** Engine-level correlation and alpha statistics. */
export interface EngineCorrelationStats {
  engine: string;
  score_column: string;
  pearson_correlation: number;
  spearman_rho: number;
  mean_alpha: number;
  n_samples: number;
  top_quartile_mean_score: number;
}

/** Recommended weight adjustments for each engine. */
export interface CalibrationRecommendation {
  engine: string;
  current_weight: number;
  recommended_weight: number;
  reason: string;
}

/** Full calibration report returned by EngineCalibrationEngine. */
export interface CalibrationReport {
  generated_at: string;
  n_validated_predictions: number;
  engine_stats: EngineCorrelationStats[];
  issues: CalibrationIssue[];
  recommendations: CalibrationRecommendation[];
  summary: string;
}

/** Default engine weights before calibration. */
const DEFAULT_WEIGHTS: Record<string, number> = {
  quality_score: 0.20,
  growth_score: 0.20,
  value_score: 0.20,
  momentum_score: 0.20,
  risk_score: 0.10,
  sector_score: 0.10,
};

/** Score columns mapped to their display names. */
const ENGINE_SCORE_COLUMNS = [
  { engine: 'quality', column: 'quality_score' as const },
  { engine: 'growth', column: 'growth_score' as const },
  { engine: 'value', column: 'value_score' as const },
  { engine: 'momentum', column: 'momentum_score' as const },
  { engine: 'risk', column: 'risk_score' as const },
  { engine: 'sector', column: 'sector_score' as const },
];

export class EngineCalibrationEngine {
  /**
   * Run full calibration against prediction_registry for validated predictions
   * that have future_return populated. Computes per-engine correlations,
   * detects systemic issues, and recommends new weights.
   */
  async calibrate(): Promise<CalibrationReport> {
    const validated = await predictionRegistry.getValidatedPredictions();
    const withReturns = validated.filter(
      p => p.future_return !== null && p.alpha !== null,
    );

    const nValidated = withReturns.length;

    if (nValidated === 0) {
      return {
        generated_at: new Date().toISOString(),
        n_validated_predictions: 0,
        engine_stats: [],
        issues: [{ type: 'score_inflation', severity: 'high', detail: 'No validated predictions with returns found.', metric_value: 0, threshold: 1 }],
        recommendations: [],
        summary: 'Calibration aborted — no validated predictions available.',
      };
    }

    // Compute per-engine correlation stats
    const engineStats = this.computeEngineStats(withReturns);

    // Detect issues
    const issues: CalibrationIssue[] = [];

    // 1. Detect overweights
    issues.push(...this.detectOverweights(engineStats));

    // 2. Check score inflation
    issues.push(...this.detectScoreInflation(withReturns));

    // 3. Check score compression
    issues.push(...this.detectScoreCompression(withReturns));

    // 4. Check sector drift
    issues.push(...this.detectSectorDrift(withReturns));

    // Build recommendations based on correlations
    const recommendations = this.buildRecommendations(engineStats, withReturns);

    // Summarize
    const summary = this.buildSummary(issues, recommendations, nValidated);

    return {
      generated_at: new Date().toISOString(),
      n_validated_predictions: nValidated,
      engine_stats: engineStats,
      issues,
      recommendations,
      summary,
    };
  }

  // ── Private helpers ──────────────────────────────────────────

  /**
   * Compute Pearson correlation and Spearman rank correlation for each engine
   * score against future_return.
   */
  private computeEngineStats(records: PredictionRecord[]): EngineCorrelationStats[] {
    return ENGINE_SCORE_COLUMNS.map(({ engine, column }) => {
      const pairs = records
        .map(r => ({
          score: r[column] as number,
          futureReturn: r.future_return!,
          alpha: r.alpha!,
        }))
        .filter(p => p.score !== null && p.score !== undefined);

      const n = pairs.length;

      if (n < 3) {
        return {
          engine,
          score_column: column,
          pearson_correlation: 0,
          spearman_rho: 0,
          mean_alpha: 0,
          n_samples: n,
          top_quartile_mean_score: 0,
        };
      }

      // Pearson correlation
      const pearson = this.pearsonCorrelation(
        pairs.map(p => p.score),
        pairs.map(p => p.futureReturn),
      );

      // Spearman rank correlation
      const spearman = this.spearmanCorrelation(
        pairs.map(p => p.score),
        pairs.map(p => p.futureReturn),
      );

      // Mean alpha
      const meanAlpha = pairs.reduce((sum, p) => sum + p.alpha, 0) / n;

      // Top-quartile mean score (for overweight detection)
      const sortedScores = pairs.map(p => p.score).sort((a, b) => b - a);
      const topQuartileCutoff = Math.max(1, Math.floor(n / 4));
      const topQuartile = sortedScores.slice(0, topQuartileCutoff);
      const topQuartileMean = topQuartile.reduce((sum, s) => sum + s, 0) / topQuartile.length;

      return {
        engine,
        score_column: column,
        pearson_correlation: Math.round(pearson * 10000) / 10000,
        spearman_rho: Math.round(spearman * 10000) / 10000,
        mean_alpha: Math.round(meanAlpha * 100) / 100,
        n_samples: n,
        top_quartile_mean_score: Math.round(topQuartileMean * 100) / 100,
      };
    });
  }

  /**
   * Detect engines that are overweighted: correlation with future_return is
   * above 0.2 AND top-quartile mean score is above 75. This suggests the engine
   * is dominating the composite disproportionately relative to its predictive value.
   */
  private detectOverweights(stats: EngineCorrelationStats[]): CalibrationIssue[] {
    const issues: CalibrationIssue[] = [];
    const relevant = stats.filter(s => s.n_samples >= 5);

    for (const stat of relevant) {
      const absCorr = Math.abs(stat.pearson_correlation);
      if (absCorr > 0.2 && stat.top_quartile_mean_score > 75) {
        issues.push({
          type: 'overweight',
          engine: stat.engine,
          severity: stat.top_quartile_mean_score > 85 ? 'high' : 'medium',
          detail: `${stat.engine} engine has correlation ${stat.pearson_correlation} with top-quartile mean ${stat.top_quartile_mean_score}. May be overweighted in the composite.`,
          metric_value: stat.top_quartile_mean_score,
          threshold: 75,
        });
      }
    }

    return issues;
  }

  /**
   * Detect score inflation: if the mean of any engine score across all
   * validated symbols exceeds 65, it suggests scores are drifting upward.
   */
  private detectScoreInflation(records: PredictionRecord[]): CalibrationIssue[] {
    const issues: CalibrationIssue[] = [];

    for (const { engine, column } of ENGINE_SCORE_COLUMNS) {
      const scores = records
        .map(r => r[column] as number)
        .filter(s => s !== null && s !== undefined);

      if (scores.length === 0) continue;

      const mean = scores.reduce((a, b) => a + b, 0) / scores.length;

      if (mean > 65) {
        issues.push({
          type: 'score_inflation',
          engine,
          severity: mean > 80 ? 'high' : 'medium',
          detail: `${engine} score mean is ${mean.toFixed(1)} across ${scores.length} validated predictions. Scores may be inflated.`,
          metric_value: Math.round(mean * 100) / 100,
          threshold: 65,
        });
      }
    }

    return issues;
  }

  /**
   * Detect score compression: if the standard deviation of any engine's scores
   * is below 8, the engine is not differentiating well among symbols.
   */
  private detectScoreCompression(records: PredictionRecord[]): CalibrationIssue[] {
    const issues: CalibrationIssue[] = [];

    for (const { engine, column } of ENGINE_SCORE_COLUMNS) {
      const scores = records
        .map(r => r[column] as number)
        .filter(s => s !== null && s !== undefined);

      if (scores.length < 5) continue;

      const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
      const variance = scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / (scores.length - 1);
      const stddev = Math.sqrt(variance);

      if (stddev < 8) {
        issues.push({
          type: 'score_compression',
          engine,
          severity: stddev < 5 ? 'high' : 'medium',
          detail: `${engine} score stddev is ${stddev.toFixed(2)}, indicating poor differentiation among stocks.`,
          metric_value: Math.round(stddev * 100) / 100,
          threshold: 8,
        });
      }
    }

    return issues;
  }

  /**
   * Detect sector drift: join prediction_registry with symbols table,
   * compute average ranking_score per sector, and flag any sector whose
   * average ranking deviates more than 10 points from the global mean.
   */
  private async detectSectorDrift(records: PredictionRecord[]): Promise<CalibrationIssue[]> {
    const issues: CalibrationIssue[] = [];

    try {
      const result = await pool.query(
        `SELECT s.sector, AVG(p.ranking_score)::numeric as avg_ranking, COUNT(*) as cnt
         FROM prediction_registry p
         JOIN symbols s ON p.symbol = s.symbol
         WHERE p.validation_status = 'validated'
           AND p.future_return IS NOT NULL
           AND s.sector IS NOT NULL
         GROUP BY s.sector
         ORDER BY avg_ranking DESC`
      );

      if (result.rows.length === 0) return issues;

      const sectorStats = result.rows.map(row => ({
        sector: row.sector,
        avg_ranking: parseFloat(row.avg_ranking),
        count: parseInt(row.cnt, 10),
      }));

      const globalMean = sectorStats.reduce((sum, s) => sum + s.avg_ranking, 0) / sectorStats.length;

      for (const stat of sectorStats) {
        const deviation = stat.avg_ranking - globalMean;
        if (Math.abs(deviation) > 10) {
          issues.push({
            type: 'sector_drift',
            severity: Math.abs(deviation) > 20 ? 'high' : 'medium',
            detail: `${stat.sector} sector avg ranking is ${stat.avg_ranking.toFixed(2)} (${deviation > 0 ? '+' : ''}${deviation.toFixed(1)} above global mean ${globalMean.toFixed(2)}). Sector bias detected.`,
            metric_value: Math.round(Math.abs(deviation) * 100) / 100,
            threshold: 10,
          });
        }
      }
    } catch {
      // Skip sector drift if symbols table isn't available
    }

    return issues;
  }

  /**
   * Build recommended weights based on observed correlations.
   * Engines with higher absolute correlation to future_return get more weight.
   * If no meaningful correlations exist, defaults are kept.
   */
  private buildRecommendations(
    stats: EngineCorrelationStats[],
    records: PredictionRecord[],
  ): CalibrationRecommendation[] {
    // Gather all engine scores to compute a composite correlation direction
    const correlations = stats
      .filter(s => s.n_samples >= 5)
      .map(s => ({
        engine: s.engine,
        absCorr: Math.abs(s.pearson_correlation),
        current: DEFAULT_WEIGHTS[s.score_column] || 0.10,
      }));

    if (correlations.length === 0) {
      return ENGINE_SCORE_COLUMNS.map(({ engine, column }) => ({
        engine,
        current_weight: DEFAULT_WEIGHTS[column] || 0.10,
        recommended_weight: DEFAULT_WEIGHTS[column] || 0.10,
        reason: 'Insufficient data to recommend adjustments.',
      }));
    }

    const totalAbsCorr = correlations.reduce((sum, c) => sum + c.absCorr, 0);

    if (totalAbsCorr < 0.01) {
      // Correlations are essentially zero — keep defaults
      return ENGINE_SCORE_COLUMNS.map(({ engine, column }) => ({
        engine,
        current_weight: DEFAULT_WEIGHTS[column] || 0.10,
        recommended_weight: DEFAULT_WEIGHTS[column] || 0.10,
        reason: 'No meaningful correlation with returns detected. Maintaining default weights.',
      }));
    }

    // Distribute weights proportional to absolute correlation
    const rawWeights = correlations.map(c => ({
      engine: c.engine,
      raw: c.absCorr / totalAbsCorr,
    }));

    // Normalize to sum to 1.0
    const sumRaw = rawWeights.reduce((s, r) => s + r.raw, 0);

    return ENGINE_SCORE_COLUMNS.map(({ engine, column }) => {
      const matched = rawWeights.find(r => r.engine === engine);
      const recommended = matched ? matched.raw / sumRaw : DEFAULT_WEIGHTS[column] || 0.10;

      let reason: string;
      if (matched) {
        const corrStat = stats.find(s => s.engine === engine);
        reason = `Weight derived from correlation (${corrStat?.pearson_correlation}) with future returns. ${recommended > (DEFAULT_WEIGHTS[column] || 0.10) ? 'Increased' : 'Decreased'} relative to default.`;
      } else {
        reason = 'Insufficient correlation data — kept at default weight.';
      }

      return {
        engine,
        current_weight: DEFAULT_WEIGHTS[column] || 0.10,
        recommended_weight: Math.round(recommended * 10000) / 10000,
        reason,
      };
    });
  }

  /**
   * Build a human-readable summary of calibration findings.
   */
  private buildSummary(
    issues: CalibrationIssue[],
    recommendations: CalibrationRecommendation[],
    nValidated: number,
  ): string {
    const issueCount = issues.length;
    const highSeverity = issues.filter(i => i.severity === 'high').length;

    if (issueCount === 0) {
      return `Calibration complete across ${nValidated} validated predictions. No issues detected. Engine weights are well-calibrated.`;
    }

    let summary = `Calibration analyzed ${nValidated} validated predictions. `;
    summary += `Found ${issueCount} issue(s) — ${highSeverity} high severity. `;

    const overweighted = issues.filter(i => i.type === 'overweight').map(i => i.engine);
    if (overweighted.length > 0) {
      summary += `Overweight detected on: ${overweighted.join(', ')}. `;
    }

    const inflated = issues.filter(i => i.type === 'score_inflation').map(i => i.engine);
    if (inflated.length > 0) {
      summary += `Score inflation on: ${inflated.join(', ')}. `;
    }

    const compressed = issues.filter(i => i.type === 'score_compression').map(i => i.engine);
    if (compressed.length > 0) {
      summary += `Score compression on: ${compressed.join(', ')}. `;
    }

    const sectorDrifted = issues.filter(i => i.type === 'sector_drift').length;
    if (sectorDrifted > 0) {
      summary += `${sectorDrifted} sector(s) showing drift. `;
    }

    summary += `${recommendations.length} weight recommendations generated.`;

    return summary;
  }

  /**
   * Compute Pearson correlation coefficient between two equal-length arrays.
   */
  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n < 2) return 0;

    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;

    let cov = 0;
    let varX = 0;
    let varY = 0;

    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      cov += dx * dy;
      varX += dx * dx;
      varY += dy * dy;
    }

    const denom = Math.sqrt(varX * varY);
    if (denom === 0) return 0;

    return cov / denom;
  }

  /**
   * Compute Spearman rank correlation between two equal-length arrays.
   * Tied ranks use the average of their positions.
   */
  private spearmanCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n < 2) return 0;

    const rankX = this.rankArray(x);
    const rankY = this.rankArray(y);

    return this.pearsonCorrelation(rankX, rankY);
  }

  /**
   * Convert an array of numbers to their ranks (1-based).
   * Ties receive the average rank.
   */
  private rankArray(values: number[]): number[] {
    const n = values.length;
    const indexed = values.map((v, i) => ({ value: v, index: i }));
    indexed.sort((a, b) => a.value - b.value);

    const ranks = new Array(n);
    let i = 0;
    while (i < n) {
      let j = i;
      // Find the end of this tie group
      while (j + 1 < n && indexed[j + 1].value === indexed[i].value) {
        j++;
      }
      const avgRank = (i + j) / 2 + 1; // 1-based average rank
      for (let k = i; k <= j; k++) {
        ranks[indexed[k].index] = avgRank;
      }
      i = j + 1;
    }

    return ranks;
  }
}

export const engineCalibrationEngine = new EngineCalibrationEngine();
export default EngineCalibrationEngine;