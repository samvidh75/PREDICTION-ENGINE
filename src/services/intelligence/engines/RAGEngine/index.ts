/**
 * RAG / Knowledge Base Intelligence Engine
 *
 * Aggregates 4 sub-modules into a 0-100 Knowledge Score.
 * HIGHER score = more institutional knowledge, stronger pattern matches,
 * and favorable macro context.
 *
 * Modules:
 *   Pattern Match (0-30): Historical pattern similarity + frequency
 *   Knowledge Coverage (0-25): Breadth + quality of institutional research
 *   Outcome Quality (0-25): Past pattern success rate + reliability
 *   Macro Context (0-20): Macro environment favorability
 *
 * PROMPT 28
 */
import type { RAGMetrics, RAGScore } from '../../types';
import { scorePatternMatch, type PatternMatchResult } from './PatternMatchScoring';
import { scoreKnowledgeCoverage, type KnowledgeCoverageResult } from './KnowledgeCoverageScoring';
import { scoreOutcomeQuality, type OutcomeQualityResult } from './OutcomeQualityScoring';
import { scoreMacroContext, type MacroContextResult } from './MacroContextScoring';
import logger from '../../../../config/logger';

const MAX_PATTERN = 30;
const MAX_KNOWLEDGE = 25;
const MAX_OUTCOME = 25;
const MAX_MACRO = 20;

export class RAGEngine {
  async analyze(metrics: RAGMetrics): Promise<RAGScore> {
    logger.info('=== RAG Knowledge Base Engine ===');

    const patternResult = scorePatternMatch(metrics.patterns);
    const knowledgeResult = scoreKnowledgeCoverage(metrics.knowledgeItems);
    const outcomeResult = scoreOutcomeQuality(metrics.patterns);
    const macroResult = scoreMacroContext(metrics.macroSignals, metrics.sectorPhase);

    const overall = patternResult.score + knowledgeResult.score +
                    outcomeResult.score + macroResult.score;

    const hasPatterns = metrics.patterns.length > 0;
    const hasKnowledge = metrics.knowledgeItems.length > 0;
    const hasMacro = metrics.macroSignals.length > 0;
    const dataCompleteness = (hasPatterns ? 0.35 : 0) +
                             (hasKnowledge ? 0.35 : 0) +
                             (hasMacro ? 0.3 : 0);
    const confidence = Math.min(0.99, dataCompleteness * 0.7 + 0.15);

    const reasoning = this.buildReasoning(overall, patternResult, knowledgeResult,
                                          outcomeResult, macroResult);

    logger.info(`RAG Result: ${overall}/100, Confidence: ${(confidence * 100).toFixed(0)}%`);

    return {
      overall: Math.round(overall),
      patternMatchScore: patternResult.score,
      knowledgeCoverageScore: knowledgeResult.score,
      outcomeQualityScore: outcomeResult.score,
      macroContextScore: macroResult.score,

      patternMatchCount: patternResult.matchCount,
      bestPattern: patternResult.bestPattern,
      bestPatternSuccessRate: patternResult.bestPatternSuccessRate,
      knowledgeConfidence: knowledgeResult.level === 'comprehensive' || knowledgeResult.level === 'adequate'
        ? 'high' : knowledgeResult.level === 'sparse' ? 'moderate' : 'low',
      macroEnvironment: macroResult.level,

      details: {
        patternMatch: {
          score: patternResult.score, matchCount: patternResult.matchCount,
          topSimilarity: patternResult.topSimilarity, level: patternResult.level,
        },
        knowledgeCoverage: {
          score: knowledgeResult.score, itemCount: knowledgeResult.itemCount,
          avgRelevance: knowledgeResult.avgRelevance, level: knowledgeResult.level,
        },
        outcomeQuality: {
          score: outcomeResult.score, avgSuccessRate: outcomeResult.avgSuccessRate,
          provenPatterns: outcomeResult.provenPatterns, level: outcomeResult.level,
        },
        macroContext: {
          score: macroResult.score, signalCount: macroResult.signalCount,
          netDirection: macroResult.netDirection, level: macroResult.level,
        },
      },

      dataCompleteness,
      confidence,
      reasoning,
      timestamp: new Date(),
    };
  }

  private buildReasoning(
    overall: number,
    pattern: PatternMatchResult,
    knowledge: KnowledgeCoverageResult,
    outcome: OutcomeQualityResult,
    macro: MacroContextResult,
  ): string {
    const parts: string[] = [];

    if (overall >= 70) parts.push('Rich knowledge base with strong pattern matches and favorable macro context.');
    else if (overall >= 50) parts.push('Adequate knowledge coverage with moderate pattern support.');
    else if (overall >= 30) parts.push('Limited knowledge base — few patterns and sparse institutional coverage.');
    else parts.push('Minimal knowledge available. Low pattern confidence and limited research coverage.');

    if (pattern.matchCount > 0) {
      parts.push(`${pattern.matchCount} historical patterns matched with ${(pattern.topSimilarity * 100).toFixed(0)}% top similarity.`);
    } else {
      parts.push('No historical patterns available for comparison.');
    }

    if (outcome.provenPatterns > 0) {
      parts.push(`Pattern success rate of ${(outcome.avgSuccessRate * 100).toFixed(0)}% across ${outcome.provenPatterns} proven patterns.`);
    }

    if (macro.signalCount > 0) {
      parts.push(`Macro environment is ${macro.level} with ${macro.signalCount} signals.`);
    }

    return parts.join(' ');
  }
}

export const ragEngine = new RAGEngine();
