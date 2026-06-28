import logger from '../../../../config/logger';
import { TechnicalMetrics } from '../../types';

/**
 * Volatility Scoring Module
 * Max 10 points:
 *   - Volatility Score (0-10 points): Lower volatility = higher score (inverted)
 *   - Adjusted by beta for relative risk vs market
 *   - Considers volume for liquidity quality assessment
 */

function scoreVolatility(metrics: TechnicalMetrics): { score: number; note: string } {
  const { volatility30, beta, volumeRatio } = metrics;
  let score = 5; // Default midpoint
  const notes: string[] = [];

  // Primary volatility scoring (inverted: lower vol = higher score)
  if (volatility30 !== undefined) {
    if (volatility30 < 15) {
      score = 9;
      notes.push(`Very low volatility (${volatility30}%), very stable`);
    } else if (volatility30 < 25) {
      score = 7;
      notes.push(`Low volatility (${volatility30}%), stable stock`);
    } else if (volatility30 < 35) {
      score = 5;
      notes.push(`Moderate volatility (${volatility30}%), acceptable risk`);
    } else if (volatility30 < 50) {
      score = 3;
      notes.push(`High volatility (${volatility30}%), elevated risk`);
    } else {
      score = 1;
      notes.push(`Very high volatility (${volatility30}%), highly speculative risk`);
    }
  }

  // Beta adjustment
  if (beta !== undefined) {
    if (beta < 0.8 && volatility30 !== undefined && volatility30 < 25) {
      score = Math.min(10, score + 1);
      notes.push(`Low beta (${beta}) with low volatility — defensive stock`);
    } else if (beta > 1.5) {
      score = Math.max(0, score - 1);
      notes.push(`High beta (${beta}) amplifies risk`);
    } else {
      notes.push(`Beta: ${beta}`);
    }
  }

  // Volume adjustment
  if (volumeRatio !== undefined) {
    if (volumeRatio > 2) {
      notes.push(`Volume spike (${volumeRatio.toFixed(1)}x) may indicate unusual activity`);
    } else if (volumeRatio < 0.5) {
      notes.push(`Low volume (${volumeRatio.toFixed(1)}x) may indicate illiquidity`);
    }
  }

  return { score, note: notes.join('; ') || 'Moderate volatility (default estimate)' };
}

export function volatilityScoring(metrics: TechnicalMetrics): {
  totalScore: number;
  volatilityScore: number;
  details: string;
} {
  const vol = scoreVolatility(metrics);

  logger.info({ volatilityScore: vol.score }, 'Volatility score computed');

  return {
    totalScore: vol.score,
    volatilityScore: vol.score,
    details: vol.note,
  };
}
