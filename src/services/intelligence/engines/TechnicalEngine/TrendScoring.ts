import logger from '../../../../config/logger';
import { TechnicalMetrics } from '../../types';

/**
 * Trend Scoring Module
 * Max 20 points:
 *   - MA Score (0-12 points): Price vs MA positions (50 & 200 day), Golden/Death Cross
 *   - Price Position Score (0-8 points): Short term vs medium term trend alignment
 */

function scoreMovingAverages(metrics: TechnicalMetrics): { score: number; note: string } {
  const { currentPrice, ma50, ma200 } = metrics;
  let score = 0;
  const notes: string[] = [];

  // MA20 vs MA50 vs MA200 alignment (short > mid > long = strong uptrend)
  if (ma50 !== undefined && ma200 !== undefined) {
    if (currentPrice > ma50 && ma50 > ma200) {
      score += 6;
      notes.push('Golden cross: price above 50 MA & 50 MA above 200 MA (strong uptrend alignment)');
    } else if (currentPrice > ma50) {
      score += 4;
      notes.push('Price above 50 MA, no golden cross');
    } else if (currentPrice > ma200) {
      score += 3;
      notes.push('Price between 50 MA and 200 MA');
    } else {
      score += 1;
      notes.push('Price below both 50 MA and 200 MA (downtrend)');
    }
  }

  // Individual MA checks
  if (ma50 !== undefined) {
    if (currentPrice > ma50) score += 2;
  }
  if (ma200 !== undefined) {
    if (currentPrice > ma200) score += 2;
  }

  // Bonus for multiple positive signals
  if (score >= 8) score = Math.min(12, score + 2);

  return { score: Math.min(12, score), note: notes.join('; ') || 'Limited MA data' };
}

function scorePricePosition(metrics: TechnicalMetrics): { score: number; note: string } {
  let score = 0;
  const notes: string[] = [];

  // Short term (1M, 3M) vs medium term (6M, 1Y) alignment
  let shortTermPositive = 0, shortTermTotal = 0;
  let mediumTermPositive = 0, mediumTermTotal = 0;

  if (metrics.priceChange1W !== undefined) {
    shortTermTotal++;
    if (metrics.priceChange1W > 0) shortTermPositive++;
  }
  if (metrics.priceChange1M !== undefined) {
    shortTermTotal++;
    if (metrics.priceChange1M > 0) shortTermPositive++;
  }
  if (metrics.priceChange3M !== undefined) {
    shortTermTotal++;
    if (metrics.priceChange3M > 0) shortTermPositive++;
  }
  if (metrics.priceChange6M !== undefined) {
    mediumTermTotal++;
    if (metrics.priceChange6M > 0) mediumTermPositive++;
  }
  if (metrics.priceChange1Y !== undefined) {
    mediumTermTotal++;
    if (metrics.priceChange1Y > 0) mediumTermPositive++;
  }

  const shortRatio = shortTermTotal > 0 ? shortTermPositive / shortTermTotal : 0;
  const mediumRatio = mediumTermTotal > 0 ? mediumTermPositive / mediumTermTotal : 0;

  if (shortRatio >= 0.7 && mediumRatio >= 0.7) {
    score = 8;
    notes.push('Both short and medium term trends are strongly positive');
  } else if (shortRatio >= 0.7) {
    score = 6;
    notes.push('Short term momentum strong, medium term lagging');
  } else if (mediumRatio >= 0.7) {
    score = 5;
    notes.push('Medium term positive, short term showing weakness');
  } else if (shortRatio >= 0.3 || mediumRatio >= 0.3) {
    score = 3;
    notes.push('Mixed trend signals');
  } else {
    score = 1;
    notes.push('Negative price action across timeframes');
  }

  return { score, note: notes.join('; ') };
}

export function trendScoring(metrics: TechnicalMetrics): {
  totalScore: number;
  maScore: number;
  pricePositionScore: number;
  details: string;
} {
  const ma = scoreMovingAverages(metrics);
  const pp = scorePricePosition(metrics);

  logger.info({ maScore: ma.score, pricePositionScore: pp.score }, 'Trend scores computed');

  return {
    totalScore: ma.score + pp.score,
    maScore: ma.score,
    pricePositionScore: pp.score,
    details: `MA: ${ma.note} | Price Position: ${pp.note}`,
  };
}
