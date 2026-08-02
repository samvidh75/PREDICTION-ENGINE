/**
 * Knowledge Coverage Scoring (0-25 points)
 *
 * Evaluates how much institutional knowledge and research is available
 * for the stock. More high-quality knowledge = higher score.
 */
import type { KnowledgeItem } from '../../types';
import logger from '../../../../config/logger';

export interface KnowledgeCoverageResult {
  score: number;
  itemCount: number;
  avgRelevance: number;
  highConfidenceCount: number;
  level: 'comprehensive' | 'adequate' | 'sparse' | 'minimal';
}

const MAX_POINTS = 25;

export function scoreKnowledgeCoverage(items: KnowledgeItem[]): KnowledgeCoverageResult {
  const validItems = items.filter(i => i.relevance > 0);
  const itemCount = validItems.length;

  if (itemCount === 0) {
    logger.info('Knowledge Coverage: No items available');
    return { score: 3, itemCount: 0, avgRelevance: 0, highConfidenceCount: 0, level: 'minimal' };
  }

  // Volume score
  let volumeScore: number;
  if (itemCount >= 10) volumeScore = 8;
  else if (itemCount >= 6) volumeScore = 6;
  else if (itemCount >= 3) volumeScore = 4;
  else volumeScore = 2;

  // Average relevance
  const avgRelevance = validItems.reduce((s, i) => s + i.relevance, 0) / itemCount;
  let relevanceScore: number;
  if (avgRelevance >= 0.8) relevanceScore = 9;
  else if (avgRelevance >= 0.6) relevanceScore = 7;
  else if (avgRelevance >= 0.4) relevanceScore = 4;
  else relevanceScore = 2;

  // Confidence quality — how many high-confidence sources
  const highConfidenceCount = validItems.filter(i => i.confidence >= 0.7).length;
  let confidenceScore: number;
  if (highConfidenceCount >= 5) confidenceScore = 5;
  else if (highConfidenceCount >= 2) confidenceScore = 3;
  else if (highConfidenceCount >= 1) confidenceScore = 2;
  else confidenceScore = 0;

  // Type diversity bonus
  const types = new Set(validItems.map(i => i.type));
  let diversityBonus: number;
  if (types.size >= 3) diversityBonus = 3;
  else if (types.size >= 2) diversityBonus = 2;
  else diversityBonus = 0;

  const rawScore = volumeScore + relevanceScore + confidenceScore + diversityBonus;
  const score = Math.min(MAX_POINTS, Math.round(rawScore));

  let level: KnowledgeCoverageResult['level'];
  if (score >= 18) level = 'comprehensive';
  else if (score >= 12) level = 'adequate';
  else if (score >= 6) level = 'sparse';
  else level = 'minimal';

  logger.info(`Knowledge Coverage Score: ${score}/${MAX_POINTS} (${level}), ${itemCount} items`);

  return { score, itemCount, avgRelevance, highConfidenceCount, level };
}
