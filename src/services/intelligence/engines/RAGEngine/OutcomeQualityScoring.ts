/**
 * Outcome Quality Scoring (0-25 points)
 *
 * Evaluates the historical success rate and reliability of matched patterns.
 * Higher success rate + more occurrences = higher score.
 */
import type { PatternRecord } from '../../types';
import logger from '../../../../config/logger';

export interface OutcomeQualityResult {
  score: number;
  avgSuccessRate: number;
  provenPatterns: number;
  avgReturn?: number;
  level: 'highly_reliable' | 'reliable' | 'uncertain' | 'unproven';
}

const MAX_POINTS = 25;

export function scoreOutcomeQuality(patterns: PatternRecord[]): OutcomeQualityResult {
  const validPatterns = patterns.filter(p => p.similarity > 0 && p.occurrences >= 3);
  const provenPatterns = validPatterns.length;

  if (provenPatterns === 0) {
    logger.info('Outcome Quality: No proven patterns');
    return { score: 3, avgSuccessRate: 0, provenPatterns: 0, level: 'unproven' };
  }

  // Average success rate
  const avgSuccessRate = validPatterns.reduce((s, p) => s + p.successRate, 0) / provenPatterns;
  let successScore: number;
  if (avgSuccessRate >= 0.85) successScore = 12;
  else if (avgSuccessRate >= 0.7) successScore = 9;
  else if (avgSuccessRate >= 0.5) successScore = 6;
  else if (avgSuccessRate >= 0.3) successScore = 3;
  else successScore = 1;

  // Proven count bonus (more well-tested patterns = more confidence)
  let provenScore: number;
  if (provenPatterns >= 5) provenScore = 7;
  else if (provenPatterns >= 3) provenScore = 5;
  else if (provenPatterns >= 1) provenScore = 3;
  else provenScore = 1;

  // Return magnitude bonus
  const returns = validPatterns.map(p => p.outcomeReturn ?? 0).filter(r => r !== 0);
  const avgReturn = returns.length > 0
    ? returns.reduce((s, r) => s + r, 0) / returns.length
    : undefined;
  let returnBonus = 0;
  if (avgReturn !== undefined) {
    if (Math.abs(avgReturn) >= 10) returnBonus = 4;
    else if (Math.abs(avgReturn) >= 5) returnBonus = 3;
    else if (Math.abs(avgReturn) >= 2) returnBonus = 1;
  }

  // Consistency bonus: how many patterns show positive outcomes
  const positivePatterns = validPatterns.filter(p => (p.outcomeReturn ?? 0) > 0).length;
  let consistencyBonus = 0;
  if (provenPatterns > 0 && positivePatterns / provenPatterns >= 0.8) consistencyBonus = 2;
  else if (provenPatterns > 0 && positivePatterns / provenPatterns >= 0.5) consistencyBonus = 1;

  const rawScore = successScore + provenScore + returnBonus + consistencyBonus;
  const score = Math.min(MAX_POINTS, Math.round(rawScore));

  let level: OutcomeQualityResult['level'];
  if (score >= 18) level = 'highly_reliable';
  else if (score >= 12) level = 'reliable';
  else if (score >= 7) level = 'uncertain';
  else level = 'unproven';

  logger.info(`Outcome Quality Score: ${score}/${MAX_POINTS} (${level}), ${provenPatterns} proven patterns, avg success ${(avgSuccessRate * 100).toFixed(0)}%`);

  return { score, avgSuccessRate, provenPatterns, avgReturn, level };
}
