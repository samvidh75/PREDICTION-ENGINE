/**
 * Consistency Scoring Module (0-25 points)
 * Evaluates 5-year earnings growth consistency, volatility, and trend
 */
import { EarningsHistoryPeriod } from '../../types';
import logger from '../../../../config/logger';

interface ConsistencyResult {
  score: number;
  epsGrowth5Y: number;
  epsGrowthTrend: 'accelerating' | 'decelerating' | 'stable';
  volatility: number;
  details: string[];
}

export class ConsistencyScoring {
  analyze(history: EarningsHistoryPeriod[]): ConsistencyResult {
    logger.info(`ConsistencyScoring: ${history.length} periods`);
    const details: string[] = [];
    let totalScore = 0;

    // ===== 5Y CAGR CALCULATION (0-10 points) =====
    const sorted = [...history].sort((a, b) =>
      a.quarter.localeCompare(b.quarter)
    );
    const oldest = sorted[0];
    const recent = sorted[sorted.length - 1];

    let epsGrowth5Y = 0;
    if (oldest && recent && oldest.eps > 0) {
      epsGrowth5Y =
        (Math.pow(recent.eps / oldest.eps, 1 / 5) - 1) * 100;
    }

    if (epsGrowth5Y >= 20) {
      totalScore += 10;
      details.push(`✓ 5Y CAGR ${epsGrowth5Y.toFixed(1)}% (excellent, +10)`);
    } else if (epsGrowth5Y >= 10) {
      totalScore += 7;
      details.push(`✓ 5Y CAGR ${epsGrowth5Y.toFixed(1)}% (good, +7)`);
    } else if (epsGrowth5Y >= 5) {
      totalScore += 4;
      details.push(`∼ 5Y CAGR ${epsGrowth5Y.toFixed(1)}% (moderate, +4)`);
    } else if (epsGrowth5Y > 0) {
      totalScore += 2;
      details.push(`∼ 5Y CAGR ${epsGrowth5Y.toFixed(1)}% (low, +2)`);
    } else {
      details.push(`✗ 5Y CAGR ${epsGrowth5Y.toFixed(1)}% (negative, +0)`);
    }

    // ===== GROWTH VOLATILITY (0-8 points) =====
    if (history.length >= 4) {
      const growthRates = history.map(h => h.epsYoY);
      const mean = growthRates.reduce((s, g) => s + g, 0) / growthRates.length;
      const variance =
        growthRates.reduce((s, g) => s + Math.pow(g - mean, 2), 0) /
        growthRates.length;
      const volatility = Math.sqrt(variance);

      if (volatility < 5) {
        totalScore += 8;
        details.push(
          `✓ Low volatility ${volatility.toFixed(1)}% (very stable, +8)`
        );
      } else if (volatility < 10) {
        totalScore += 6;
        details.push(
          `✓ Moderate volatility ${volatility.toFixed(1)}% (stable, +6)`
        );
      } else if (volatility < 15) {
        totalScore += 3;
        details.push(
          `∼ High volatility ${volatility.toFixed(1)}% (unstable, +3)`
        );
      } else {
        details.push(
          `✗ Extreme volatility ${volatility.toFixed(1)}% (erratic, +0)`
        );
      }

      // ===== TREND DETECTION (0-7 points) =====
      const earlyGrowth =
        history.slice(0, Math.floor(history.length / 2)).reduce((s, h) => s + h.epsYoY, 0) /
        Math.floor(history.length / 2);
      const lateGrowth =
        history.slice(-Math.floor(history.length / 2)).reduce((s, h) => s + h.epsYoY, 0) /
        Math.floor(history.length / 2);

      let epsGrowthTrend: 'accelerating' | 'decelerating' | 'stable' = 'stable';
      if (lateGrowth > earlyGrowth + 3) {
        epsGrowthTrend = 'accelerating';
        totalScore += 7;
        details.push(
          `✓ Accelerating trend (early: ${earlyGrowth.toFixed(1)}% → late: ${lateGrowth.toFixed(1)}%, +7)`
        );
      } else if (lateGrowth < earlyGrowth - 3) {
        epsGrowthTrend = 'decelerating';
        totalScore += 2;
        details.push(
          `∼ Decelerating trend (early: ${earlyGrowth.toFixed(1)}% → late: ${lateGrowth.toFixed(1)}%, +2)`
        );
      } else {
        epsGrowthTrend = 'stable';
        totalScore += 4;
        details.push(
          `∼ Stable trend (early: ${earlyGrowth.toFixed(1)}% → late: ${lateGrowth.toFixed(1)}%, +4)`
        );
      }

      // Adjust the base score ±2 for trend
      const finalScore = Math.min(25, Math.max(0, totalScore));
      logger.info(
        `Consistency Score: ${finalScore}/25 (Trend: ${epsGrowthTrend}, Vol: ${volatility.toFixed(1)}%)`
      );

      return {
        score: finalScore,
        epsGrowth5Y,
        epsGrowthTrend,
        volatility,
        details,
      };
    }

    // Not enough data — partial score
    logger.info(`Consistency Score: ${totalScore}/25 (limited data)`);
    return {
      score: totalScore,
      epsGrowth5Y,
      epsGrowthTrend: 'stable',
      volatility: 0,
      details,
    };
  }
}
