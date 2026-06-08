/**
 * EngineAttributionAnalyzer — TRACK-32 Phase 6
 *
 * For each scoring engine (quality, growth, value, momentum, risk, sector),
 * computes the correlation between the engine's score and future outcomes.
 * This measures which engines contribute most to predictive power.
 *
 * Metrics computed:
 *   - Spearman rank correlation between engine score and future_return
 *   - Pearson correlation between engine score and future_return
 *   - Information coefficient: fraction where engine score direction
 *     matches return direction (both above or both below median)
 *   - Interpretation string summarizing the results
 *
 * Results are persisted to the engine_attribution_results table.
 */

import pool from '../db/index';
import type { EngineAttribution } from './types';
import { predictionRegistry } from './PredictionRegistry';

/** Engine names and their corresponding field on PredictionRecord */
const ENGINES: { name: string; field: string }[] = [
  { name: 'quality', field: 'quality_score' },
  { name: 'growth', field: 'growth_score' },
  { name: 'value', field: 'value_score' },
  { name: 'momentum', field: 'momentum_score' },
  { name: 'risk', field: 'risk_score' },
  { name: 'sector', field: 'sector_score' },
];

/** Subset of PredictionRecord keys that hold engine scores */
type EngineScoreFields =
  | 'quality_score'
  | 'growth_score'
  | 'value_score'
  | 'momentum_score'
  | 'risk_score'
  | 'sector_score';

export class EngineAttributionAnalyzer {
  /**
   * Runs attribution analysis for all six engines on validated 30-day
   * horizon predictions. Persists results to engine_attribution_results
   * and returns them.
   */
  async analyze(): Promise<EngineAttribution[]> {
    const predictions = await predictionRegistry.getValidatedPredictions({
      horizon: 30,
    });

    if (predictions.length === 0) {
      return [];
    }

    // Only use records that have both a valid engine score and future_return
    const results: EngineAttribution[] = [];
    const computedAt = new Date().toISOString().split('T')[0];

    for (const { name, field } of ENGINES) {
      // Build paired arrays of (engine_score, future_return)
      const pairs: [number, number][] = [];
      for (const p of predictions) {
        const score = p[field] as number;
        if (score !== null && score !== undefined && p.future_return !== null) {
          pairs.push([score, p.future_return]);
        }
      }

      if (pairs.length < 3) {
        // Not enough data for meaningful correlation
        results.push({
          engine: name,
          information_coefficient: 0,
          rank_correlation: 0,
          forward_return_correlation: 0,
          n_predictions: pairs.length,
          interpretation: `Insufficient data for engine '${name}' — only ${pairs.length} validated predictions with outcomes.`,
        });
        continue;
      }

      const n = pairs.length;

      // Spearman rank correlation
      const spearman = this.spearmanRankCorrelation(pairs);

      // Pearson correlation
      const pearson = this.pearsonCorrelation(pairs);

      // Information coefficient: fraction where score and return are
      // on the same side of their respective medians
      const ic = this.informationCoefficient(pairs);

      // Generate interpretation
      const interpretation = this.buildInterpretation(name, spearman, pearson, ic, n);

      const attribution: EngineAttribution = {
        engine: name,
        information_coefficient: round6(ic),
        rank_correlation: round6(spearman),
        forward_return_correlation: round6(pearson),
        n_predictions: n,
        interpretation,
      };

      results.push(attribution);
    }

    // Persist to engine_attribution_results table
    await this.persistResults(computedAt, results);

    return results;
  }

  // ── Statistical helpers ──────────────────────────────────

  /**
   * Spearman rank correlation between engine score and future_return.
   * Non-parametric; robust to outliers and non-linear relationships.
   */
  private spearmanRankCorrelation(pairs: [number, number][]): number {
    const n = pairs.length;
    if (n < 2) return 0;

    // Compute ranks for x (engine score)
    const xRanks = this.computeRanks(pairs.map(p => p[0]));
    // Compute ranks for y (future_return)
    const yRanks = this.computeRanks(pairs.map(p => p[1]));

    // Pearson correlation on the ranks
    const rankPairs: [number, number][] = xRanks.map((xr, i) => [xr, yRanks[i]]);
    return this.pearsonCorrelation(rankPairs);
  }

  /**
   * Pearson product-moment correlation coefficient.
   */
  private pearsonCorrelation(pairs: [number, number][]): number {
    const n = pairs.length;
    if (n < 2) return 0;

    const xs = pairs.map(p => p[0]);
    const ys = pairs.map(p => p[1]);

    const meanX = xs.reduce((s, v) => s + v, 0) / n;
    const meanY = ys.reduce((s, v) => s + v, 0) / n;

    let cov = 0;
    let varX = 0;
    let varY = 0;

    for (let i = 0; i < n; i++) {
      const dx = xs[i] - meanX;
      const dy = ys[i] - meanY;
      cov += dx * dy;
      varX += dx * dx;
      varY += dy * dy;
    }

    if (varX === 0 || varY === 0) return 0;
    return cov / Math.sqrt(varX * varY);
  }

  /**
   * Information coefficient: fraction of pairs where score and return
   * are both above median or both below median.
   */
  private informationCoefficient(pairs: [number, number][]): number {
    const n = pairs.length;
    if (n < 2) return 0;

    const xs = pairs.map(p => p[0]);
    const ys = pairs.map(p => p[1]);

    const medianX = median(xs);
    const medianY = median(ys);

    let matches = 0;
    for (let i = 0; i < n; i++) {
      const xAbove = xs[i] > medianX;
      const yAbove = ys[i] > medianY;
      if (xAbove === yAbove) {
        matches++;
      }
    }

    return matches / n;
  }

  /**
   * Compute ranks (1-based, average for ties).
   */
  private computeRanks(values: number[]): number[] {
    const n = values.length;
    const indexed: { value: number; index: number }[] = values.map((v, i) => ({ value: v, index: i }));
    indexed.sort((a, b) => a.value - b.value);

    const ranks = new Array<number>(n);
    let i = 0;
    while (i < n) {
      let j = i;
      // Find range of ties
      while (j + 1 < n && indexed[j + 1].value === indexed[i].value) {
        j++;
      }
      const avgRank = (i + j + 2) / 2; // 1-based
      for (let k = i; k <= j; k++) {
        ranks[indexed[k].index] = avgRank;
      }
      i = j + 1;
    }

    return ranks;
  }

  // ── Interpretation ───────────────────────────────────────

  private buildInterpretation(
    engine: string,
    spearman: number,
    pearson: number,
    ic: number,
    n: number,
  ): string {
    const absPearson = Math.abs(pearson);
    const absSpearman = Math.abs(spearman);

    let strength: string;
    if (absSpearman > 0.3) strength = 'strong';
    else if (absSpearman > 0.15) strength = 'moderate';
    else if (absSpearman > 0.05) strength = 'weak';
    else strength = 'negligible';

    const direction = pearson > 0 ? 'positive' : 'negative';
    const icPct = (ic * 100).toFixed(1);

    let verdict: string;
    if (absSpearman > 0.2 && ic > 0.55) {
      verdict = `${engine} engine shows ${strength} predictive signal (Spearman=${spearman.toFixed(4)}, IC=${icPct}%). Reliable contributor to ranking.`;
    } else if (absSpearman > 0.1 || ic > 0.52) {
      verdict = `${engine} engine shows ${strength} directional signal. May add incremental value when combined with other engines.`;
    } else if (n < 10) {
      verdict = `${engine} engine has insufficient sample size (n=${n}) for reliable attribution. Collect more validated predictions.`;
    } else {
      verdict = `${engine} engine shows ${strength} correlation with outcomes (Spearman=${spearman.toFixed(4)}). Revisit scoring methodology or weighting.`;
    }

    return verdict;
  }

  // ── Persistence ──────────────────────────────────────────

  private async persistResults(
    computedAt: string,
    attributions: EngineAttribution[],
  ): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const attr of attributions) {
        await client.query(
          `INSERT INTO engine_attribution_results (
            computed_at, engine, information_coefficient,
            rank_correlation, forward_return_correlation,
            n_predictions, interpretation
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (computed_at, engine) DO UPDATE SET
            information_coefficient = EXCLUDED.information_coefficient,
            rank_correlation = EXCLUDED.rank_correlation,
            forward_return_correlation = EXCLUDED.forward_return_correlation,
            n_predictions = EXCLUDED.n_predictions,
            interpretation = EXCLUDED.interpretation`,
          [
            computedAt,
            attr.engine,
            attr.information_coefficient,
            attr.rank_correlation,
            attr.forward_return_correlation,
            attr.n_predictions,
            attr.interpretation,
          ]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

/** Median of a numeric array */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

export const engineAttributionAnalyzer = new EngineAttributionAnalyzer();
export default EngineAttributionAnalyzer;