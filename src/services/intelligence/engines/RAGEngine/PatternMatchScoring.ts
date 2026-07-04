/**
 * Pattern Match Scoring (0-30 points)
 *
 * Evaluates how well historical patterns match the current setup.
 * Higher similarity + more occurrences = higher score.
 */
import type { PatternRecord } from '../../types';
import logger from '../../../../config/logger';

export interface PatternMatchResult {
  score: number;
  matchCount: number;
  topSimilarity: number;
  bestPattern?: string;
  bestPatternSuccessRate?: number;
  level: 'strong' | 'moderate' | 'weak' | 'none';
}

const MAX_POINTS = 30;

export function scorePatternMatch(patterns: PatternRecord[]): PatternMatchResult {
  const validPatterns = patterns.filter(p => p.similarity > 0);
  const matchCount = validPatterns.length;

  if (matchCount === 0) {
    logger.info('Pattern Match: No patterns available — default score');
    return { score: 5, matchCount: 0, topSimilarity: 0, level: 'none' };
  }

  // Core score based on number of matching patterns
  let countScore: number;
  if (matchCount >= 5) countScore = 10;
  else if (matchCount >= 3) countScore = 7;
  else if (matchCount >= 1) countScore = 4;
  else countScore = 2;

  // Similarity component: best match quality
  const topSimilarity = Math.max(...validPatterns.map(p => p.similarity));
  let similarityScore: number;
  if (topSimilarity >= 0.9) similarityScore = 12;
  else if (topSimilarity >= 0.75) similarityScore = 9;
  else if (topSimilarity >= 0.6) similarityScore = 6;
  else if (topSimilarity >= 0.4) similarityScore = 3;
  else similarityScore = 1;

  // Breadth bonus: having multiple diverse patterns
  let breadthBonus: number;
  if (matchCount >= 4) breadthBonus = 5;
  else if (matchCount >= 2) breadthBonus = 3;
  else breadthBonus = 1;

  // Occurrences bonus — well-tested patterns
  const maxOccurrences = Math.max(...validPatterns.map(p => p.occurrences));
  let occurrenceBonus = 0;
  if (maxOccurrences >= 20) occurrenceBonus = 3;
  else if (maxOccurrences >= 10) occurrenceBonus = 2;
  else if (maxOccurrences >= 5) occurrenceBonus = 1;

  const rawScore = countScore + similarityScore + breadthBonus + occurrenceBonus;
  const score = Math.min(MAX_POINTS, Math.round(rawScore));

  // Find best pattern
  const best = validPatterns.reduce((a, b) =>
    (b.similarity * b.successRate) > (a.similarity * a.successRate) ? b : a
  );

  let level: PatternMatchResult['level'];
  if (score >= 22) level = 'strong';
  else if (score >= 13) level = 'moderate';
  else if (score >= 7) level = 'weak';
  else level = 'none';

  logger.info(`Pattern Match Score: ${score}/${MAX_POINTS} (${level}), ${matchCount} matches, top sim ${topSimilarity.toFixed(2)}`);

  return {
    score,
    matchCount,
    topSimilarity,
    bestPattern: best.description,
    bestPatternSuccessRate: best.successRate,
    level,
  };
}
