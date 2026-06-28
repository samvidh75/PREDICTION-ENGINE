import logger from '../../../../config/logger';
import { TechnicalMetrics, TechnicalScore } from '../../types';
import { momentumScoring } from './MomentumScoring';
import { trendScoring } from './TrendScoring';
import { volatilityScoring } from './VolatilityScoring';

/**
 * Technical Intelligence Engine
 *
 * Aggregates Momentum, Trend, and Volatility analysis into a single 0-100 score.
 * - Momentum (0-20 pts): RSI, MACD, RoC
 * - Trend (0-20 pts): MA positions, price direction
 * - Volatility (0-10 pts): Inverted volatility, beta-adjusted
 *
 * Normalization: (total / 50) * 100 → 0-100
 */

function calculateDataCompleteness(metrics: TechnicalMetrics): number {
  const fields: (keyof TechnicalMetrics)[] = [
    'currentPrice', 'ma50', 'ma200', 'rsi', 'macd', 'macdSignal',
    'priceChange1M', 'priceChange3M', 'priceChange6M', 'priceChange1Y',
    'volatility30', 'beta', 'volume', 'avgVolume',
  ];
  let filled = 0;
  for (const field of fields) {
    if (metrics[field] !== undefined) filled++;
  }
  return filled / fields.length;
}

function determineDirection(momentumScore: number, trendScore: number, volatilityScore: number): 'bullish' | 'neutral' | 'bearish' {
  const momentumPct = momentumScore / 20; // 0-1
  const trendPct = trendScore / 20;
  const avg = (momentumPct + trendPct) / 2;

  if (avg > 0.55) return 'bullish';
  if (avg < 0.35) return 'bearish';
  return 'neutral';
}

function determineTrend(metrics: TechnicalMetrics): 'uptrend' | 'downtrend' | 'sideways' {
  const { currentPrice, ma50, ma200 } = metrics;
  if (ma50 !== undefined && ma200 !== undefined) {
    if (currentPrice > ma50 && ma50 > ma200) return 'uptrend';
    if (currentPrice < ma50 && ma50 < ma200) return 'downtrend';
  }
  if (ma50 !== undefined) {
    return currentPrice > ma50 ? 'uptrend' : 'downtrend';
  }
  return 'sideways';
}

function determineMomentumStatus(momentumScore: number): 'strong' | 'moderate' | 'weak' {
  if (momentumScore >= 14) return 'strong';
  if (momentumScore >= 8) return 'moderate';
  return 'weak';
}

function calculateModuleAlignment(
  momentum: { totalScore: number },
  trend: { totalScore: number },
  volatility: { totalScore: number },
): number {
  const mDir = momentum.totalScore / 20 > 0.5 ? 1 : 0;
  const tDir = trend.totalScore / 20 > 0.5 ? 1 : 0;
  const vDir = volatility.totalScore / 10 > 0.5 ? 1 : 0;

  const agreeCount = mDir + tDir + vDir;
  if (agreeCount === 3 || agreeCount === 0) return 1.0;
  if (agreeCount === 2) return 0.7;
  return 0.4;
}

function generateReasoning(
  metrics: TechnicalMetrics,
  overall: number,
  direction: string,
  trend: string,
  momentumStatus: string,
  momentum: { details: string },
  trendModule: { details: string },
  volatility: { details: string },
): string {
  const lines: string[] = [];

  lines.push(`Technical Score: ${overall}/100 — ${direction.charAt(0).toUpperCase() + direction.slice(1)} ${trend} with ${momentumStatus} momentum.`);

  const { currentPrice, ma50, ma200 } = metrics;
  if (ma50 !== undefined) {
    const pctFrom50 = ((currentPrice - ma50) / ma50 * 100).toFixed(1);
    lines.push(`Price (₹${currentPrice}) is ${pctFrom50}% ${currentPrice > ma50 ? 'above' : 'below'} 50-day MA (${ma50}).`);
  }
  if (ma200 !== undefined) {
    const pctFrom200 = ((currentPrice - ma200) / ma200 * 100).toFixed(1);
    lines.push(`Price is ${pctFrom200}% ${currentPrice > ma200 ? 'above' : 'below'} 200-day MA (${ma200}).`);
  }

  lines.push(`Momentum: ${momentum.details}`);
  lines.push(`Trend: ${trendModule.details}`);
  lines.push(`Volatility: ${volatility.details}`);

  return lines.join(' ');
}

export const technicalEngine = {
  analyze(metrics: TechnicalMetrics): TechnicalScore {
    const momentum = momentumScoring(metrics);
    const trend = trendScoring(metrics);
    const volatility = volatilityScoring(metrics);

    const totalScore = momentum.totalScore + trend.totalScore + volatility.totalScore;
    const overall = Math.round((totalScore / 50) * 100);
    const dataCompleteness = calculateDataCompleteness(metrics);
    const moduleAlignment = calculateModuleAlignment(momentum, trend, volatility);
    const confidence = Math.min(0.99, dataCompleteness * 0.6 + moduleAlignment * 0.4);
    const direction = determineDirection(momentum.totalScore, trend.totalScore, volatility.totalScore);
    const trendDir = determineTrend(metrics);
    const momentumStatus = determineMomentumStatus(momentum.totalScore);
    const reasoning = generateReasoning(metrics, overall, direction, trendDir, momentumStatus, momentum, trend, volatility);

    const result: TechnicalScore = {
      overall,
      momentumScore: momentum.totalScore,
      trendScore: trend.totalScore,
      volatilityScore: volatility.totalScore,
      details: {
        momentum: {
          rsiScore: momentum.rsiScore,
          macdScore: momentum.macdScore,
          rocScore: momentum.rocScore,
          points: momentum.totalScore,
        },
        trend: {
          maScore: trend.maScore,
          pricePositionScore: trend.pricePositionScore,
          points: trend.totalScore,
        },
        volatility: {
          volatilityScore: volatility.volatilityScore,
          points: volatility.totalScore,
        },
      },
      direction,
      trend: trendDir,
      momentumStatus,
      dataCompleteness,
      confidence,
      reasoning,
      timestamp: new Date(),
    };

    logger.info({ overall, direction, trend: trendDir, momentumStatus, confidence }, 'TechnicalEngine analysis complete');
    return result;
  },
};
