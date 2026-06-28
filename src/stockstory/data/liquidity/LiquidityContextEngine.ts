/**
 * Liquidity Context Engine
 *
 * Computes liquidity scores and raises cautions for stocks with
 * insufficient liquidity. Flags microcap / low‑liquidity situations
 * where research confidence may be reduced.
 */

import type { LiquidityMetrics, LiquidityScore, LiquidityCaution } from './LiquidityTypes';

export class LiquidityContextEngine {
  private scores: Map<string, LiquidityScore> = new Map();

  /**
   * Compute a liquidity score (0–100) from raw metrics.
   * Higher scores indicate better liquidity.
   *
   * Scoring thresholds (for a 20‑day window):
   * - Volume: < 10K shares/day → 0, > 1M → 100
   * - Value:  < 1 Cr/day → 0, > 100 Cr → 100
   * - Market cap: < 100 Cr → 0, > 10_000 Cr → 100
   */
  private computeScore(metrics: LiquidityMetrics): number {
    const volumeScore = Math.min(100, Math.max(0, (metrics.avgDailyVolume / 1_000_000) * 100));
    const valueScore = Math.min(100, Math.max(0, (metrics.avgDailyValueCrores / 100) * 100));
    const marketCapScore = Math.min(100, Math.max(0, (metrics.marketCapCrores / 10_000) * 100));

    return Math.round((volumeScore + valueScore + marketCapScore) / 3);
  }

  /** Compute and store liquidity assessment for a stock */
  compute(metrics: LiquidityMetrics): { score: LiquidityScore; caution?: LiquidityCaution } {
    const score: LiquidityScore = {
      symbol: metrics.symbol,
      score: this.computeScore(metrics),
      dimensions: {
        volumeScore: Math.min(100, Math.max(0, (metrics.avgDailyVolume / 1_000_000) * 100)),
        valueScore: Math.min(100, Math.max(0, (metrics.avgDailyValueCrores / 100) * 100)),
        marketCapScore: Math.min(100, Math.max(0, (metrics.marketCapCrores / 10_000) * 100)),
      },
      asOf: metrics.asOf,
    };

    // Round dimension scores
    score.dimensions.volumeScore = Math.round(score.dimensions.volumeScore);
    score.dimensions.valueScore = Math.round(score.dimensions.valueScore);
    score.dimensions.marketCapScore = Math.round(score.dimensions.marketCapScore);

    this.scores.set(metrics.symbol, score);

    const caution = this.getCaution(metrics);
    return { score, caution };
  }

  /** Retrieve the latest computed score for a symbol */
  getScore(symbol: string): LiquidityScore | undefined {
    return this.scores.get(symbol);
  }

  /**
   * Get a liquidity caution for the given metrics.
   * Returns undefined if liquidity is adequate.
   */
  getCaution(metrics: LiquidityMetrics): LiquidityCaution | undefined {
    const reasons: string[] = [];
    const mc = metrics.marketCapCrores;
    const vol = metrics.avgDailyVolume;
    const val = metrics.avgDailyValueCrores;

    if (mc < 500) {
      reasons.push('Market capitalisation below 500 Cr (microcap / smallcap)');
    }
    if (val < 1) {
      reasons.push('Average daily trade value below 1 Cr');
    }
    if (vol < 25_000) {
      reasons.push('Average daily volume below 25,000 shares');
    }

    if (reasons.length === 0) return undefined;

    const severity = mc < 100 ? 'high' as const : reasons.length >= 2 ? 'medium' as const : 'low' as const;

    return {
      symbol: metrics.symbol,
      severity,
      reasons,
      asOf: metrics.asOf,
    };
  }

  /** Clear all stored scores */
  reset(): void {
    this.scores.clear();
  }
}

export const liquidityContextEngine = new LiquidityContextEngine();