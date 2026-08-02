/**
 * News & Sentiment Intelligence Engine
 *
 * Evaluates recent news sentiment, headline volume, and controversy
 * to produce a sentiment-informed score.
 */

import type { IntelligenceInput, NewsEngineOutput } from '../types';
import { clampScore, confidenceWeight, toScoreBand } from '../scoring';

export class NewsEngine {
  analyze(input: IntelligenceInput): NewsEngineOutput {
    const s = input.sentiment;

    const sentimentScore = this.scoreSentiment(s);
    const volumeScore = this.scoreVolume(s);
    const controversyScore = this.scoreControversy(s);

    const total = sentimentScore * 0.5 + volumeScore * 0.25 + controversyScore * 0.25;
    const normalised = clampScore(total);

    const requiredFields = [s.overallScore, s.avgRecentSentiment, s.mentionVolume, s.positiveRatio];
    const dc = confidenceWeight(requiredFields, 4);
    const confidence = Math.min(0.99, dc);

    const avgSentiment = this.toSigned(s.avgRecentSentiment);
    const positive = this.toRatio(s.positiveRatio);
    const negative = this.toRatio(s.negativeRatio);

    const reasoning = this.buildReasoning(normalised, s, sentimentScore, controversyScore);

    return {
      score: normalised,
      sentimentScore: clampScore(sentimentScore),
      headlineCount: s.recentHeadlines ?? 0,
      avgSentiment,
      positiveRatio: positive,
      negativeRatio: negative,
      controversy: this.toRatio(s.controversyScore),
      trending: s.trending ?? false,
      confidence: Math.round(confidence * 100) / 100,
      reasoning,
    };
  }

  // ── Sentiment polarity (0–50) ──────────────────────────────────

  private scoreSentiment(s: IntelligenceInput['sentiment']): number {
    let score = 25; // neutral baseline
    if (s.overallScore !== null) score += s.overallScore * 25;
    if (s.avgRecentSentiment !== null) score += s.avgRecentSentiment * 20;

    if (s.positiveRatio !== null && s.positiveRatio > 0.5) score += 10;
    else if (s.positiveRatio !== null && s.positiveRatio > 0.3) score += 3;
    else if (s.positiveRatio !== null && s.positiveRatio < 0.2) score -= 5;

    return clampScore(score);
  }

  // ── Volume / interest (0–25) ────────────────────────────────────

  private scoreVolume(s: IntelligenceInput['sentiment']): number {
    let score = 5; // low volume baseline
    if (s.recentHeadlines !== null && s.recentHeadlines >= 20) score = 25;
    else if (s.recentHeadlines !== null && s.recentHeadlines >= 10) score = 20;
    else if (s.recentHeadlines !== null && s.recentHeadlines >= 5) score = 14;
    else if (s.recentHeadlines !== null && s.recentHeadlines >= 2) score = 8;

    if (s.trending) score = Math.min(25, score + 5);
    return clampScore(score);
  }

  // ── Controversy penalty (0–25, higher = less controversial) ───

  private scoreControversy(s: IntelligenceInput['sentiment']): number {
    if (s.controversyScore !== null) {
      return clampScore((1 - s.controversyScore) * 25);
    }
    return 20; // assume low controversy when unknown
  }

  // ── Helpers ─────────────────────────────────────────────────────

  private toSigned(v: number | null): number {
    if (v === null || v === undefined) return 0;
    return Math.max(-1, Math.min(1, v));
  }

  private toRatio(v: number | null): number {
    if (v === null || v === undefined) return 0;
    return Math.max(0, Math.min(1, v));
  }

  private buildReasoning(
    score: number,
    s: IntelligenceInput['sentiment'],
    sentimentScore: number,
    controversyScore: number
  ): string {
    const band = toScoreBand(score);
    const parts: string[] = [];

    if (s.recentHeadlines !== null) parts.push(`${s.recentHeadlines} recent headlines`);
    if (sentimentScore >= 60) parts.push('predominantly positive sentiment');
    else if (sentimentScore >= 40) parts.push('neutral sentiment');
    else parts.push('predominantly negative sentiment');

    if (controversyScore < 15) parts.push('notable controversy detected');

    return `News/Sentiment ${band}: ${parts.join('; ')}.`;
  }
}

export const newsEngine = new NewsEngine();
