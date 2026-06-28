/**
 * News / Sentiment Intelligence Engine
 *
 * Aggregates 4 sub-modules into a 0-100 News Sentiment Score.
 * HIGHER score = more positive news environment.
 *
 * Modules:
 *   News Volume (0-30): Quantity of information flow
 *   Sentiment (0-35): Bullish/bearish keyword analysis
 *   Source Credibility (0-20): Quality of news sources
 *   News Recency (0-15): Freshness of information
 */
import type { NewsMetrics, NewsScore } from '../../types';
import { scoreNewsVolume, type NewsVolumeResult } from './NewsVolumeScoring';
import { scoreSentiment, type SentimentResult } from './SentimentScoring';
import { scoreSourceCredibility, type SourceCredibilityResult } from './SourceCredibilityScoring';
import { scoreNewsRecency, type NewsRecencyResult } from './NewsRecencyScoring';
import logger from '../../../../config/logger';

const MAX_VOLUME = 30;
const MAX_SENTIMENT = 35;
const MAX_CREDIBILITY = 20;
const MAX_RECENCY = 15;

export class NewsEngine {
  async analyze(metrics: NewsMetrics): Promise<NewsScore> {
    logger.info('=== News Engine Analyzing ===');

    const volumeResult = scoreNewsVolume(metrics.articles);
    const sentimentResult = scoreSentiment(metrics.articles);
    const credibilityResult = scoreSourceCredibility(metrics.articles);
    const recencyResult = scoreNewsRecency(metrics.articles);

    const overall = volumeResult.score + sentimentResult.score +
                    credibilityResult.score + recencyResult.score;

    const dataCompleteness = metrics.articles && metrics.articles.length > 0 ? 1.0 : 0.0;
    const moduleAlignment = this.computeModuleAlignment(
      volumeResult.score, sentimentResult.score, credibilityResult.score, recencyResult.score
    );
    const confidence = Math.min(0.99, dataCompleteness * 0.5 + moduleAlignment * 0.3 + 0.2);
    const reasoning = this.buildReasoning(overall, volumeResult, sentimentResult,
                                           credibilityResult, recencyResult);

    logger.info(`News Result: ${overall}/100, Confidence: ${(confidence * 100).toFixed(0)}%`);

    return {
      overall: Math.round(overall),
      volumeScore: volumeResult.score,
      sentimentScore: sentimentResult.score,
      credibilityScore: credibilityResult.score,
      recencyScore: recencyResult.score,

      sentiment: sentimentResult.sentiment,
      articleCount: volumeResult.articleCount,
      topKeywords: sentimentResult.topKeywords,

      details: {
        volume: { score: volumeResult.score, count: volumeResult.articleCount, level: volumeResult.level },
        sentiment: { score: sentimentResult.score, polarity: sentimentResult.sentiment,
                     bullish: sentimentResult.bullishCount, bearish: sentimentResult.bearishCount,
                     keywords: sentimentResult.topKeywords },
        credibility: { score: credibilityResult.score, credibleCount: credibilityResult.credibleCount,
                       level: credibilityResult.level },
        recency: { score: recencyResult.score, avgAgeHours: recencyResult.avgAgeHours,
                   level: recencyResult.level },
      },

      dataCompleteness,
      confidence,
      reasoning,
      timestamp: new Date(),
    };
  }

  private computeModuleAlignment(vol: number, sent: number, cred: number, rec: number): number {
    const components = [vol / MAX_VOLUME, sent / MAX_SENTIMENT,
                        cred / MAX_CREDIBILITY, rec / MAX_RECENCY];
    const mean = components.reduce((a, c) => a + c, 0) / components.length;
    const variance = components.reduce((a, c) => a + (c - mean) ** 2, 0) / components.length;
    return Math.max(0, 1 - Math.sqrt(variance));
  }

  private buildReasoning(
    overall: number,
    volume: NewsVolumeResult,
    sentiment: SentimentResult,
    credibility: SourceCredibilityResult,
    recency: NewsRecencyResult,
  ): string {
    const parts: string[] = [];

    if (overall >= 70) parts.push('Strong news environment with positive sentiment and high information flow.');
    else if (overall >= 50) parts.push('Moderate news environment with mixed signals.');
    else if (overall >= 30) parts.push('Weak news environment. Low coverage or negative sentiment.');
    else parts.push('Very weak news signal. Limited, stale, or highly negative coverage.');

    if (sentiment.sentiment === 'bullish') parts.push('Sentiment is predominantly bullish.');
    else if (sentiment.sentiment === 'bearish') parts.push('Sentiment is predominantly bearish.');
    else parts.push('Sentiment is neutral/mixed.');

    if (volume.articleCount >= 10) parts.push(`${volume.articleCount} articles — high news flow.`);
    else if (volume.articleCount >= 3) parts.push(`${volume.articleCount} articles — moderate coverage.`);
    else parts.push('Low article count — limited information.');

    return parts.join(' ');
  }
}

export const newsEngine = new NewsEngine();
