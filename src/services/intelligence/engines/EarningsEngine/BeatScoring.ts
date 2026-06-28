/**
 * Beat Scoring Module (0-20 points)
 * Evaluates EPS beat/miss streaks and surprise magnitude
 */
import { EarningsHistoryPeriod } from '../../types';
import logger from '../../../../config/logger';

interface BeatResult {
  score: number;
  beatStreak: number;
  missStreak: number;
  avgSurprise: number;
  details: string[];
}

export class BeatScoring {
  analyze(history: EarningsHistoryPeriod[]): BeatResult {
    logger.info(`BeatScoring: ${history.length} quarters`);
    const details: string[] = [];
    let totalScore = 0;

    if (!history || history.length === 0) {
      logger.info(`Beat Score: ${totalScore}/20 (no data)`);
      return { score: 0, beatStreak: 0, missStreak: 0, avgSurprise: 0, details };
    }

    // ===== BEAT/MISS STREAKS =====
    let currentBeatStreak = 0;
    let currentMissStreak = 0;
    let longestBeatStreak = 0;
    let longestMissStreak = 0;

    for (const period of history) {
      if (period.surprise > 0) {
        currentBeatStreak++;
        currentMissStreak = 0;
        longestBeatStreak = Math.max(longestBeatStreak, currentBeatStreak);
      } else if (period.surprise < 0) {
        currentMissStreak++;
        currentBeatStreak = 0;
        longestMissStreak = Math.max(longestMissStreak, currentMissStreak);
      } else {
        // Exact meet — reset both
        currentBeatStreak = 0;
        currentMissStreak = 0;
      }
    }

    // ===== BEAT RATE SCORING (0-12 points) =====
    const beatCount = history.filter(h => h.surprise > 0).length;
    const beatRate = beatCount / history.length;

    if (beatRate >= 0.75) {
      totalScore += 12;
      details.push(`✓ Excellent beat rate: ${(beatRate * 100).toFixed(0)}% (${beatCount}/${history.length}, +12)`);
    } else if (beatRate >= 0.6) {
      totalScore += 9;
      details.push(`✓ Good beat rate: ${(beatRate * 100).toFixed(0)}% (${beatCount}/${history.length}, +9)`);
    } else if (beatRate >= 0.4) {
      totalScore += 5;
      details.push(`∼ Moderate beat rate: ${(beatRate * 100).toFixed(0)}% (${beatCount}/${history.length}, +5)`);
    } else {
      totalScore += 1;
      details.push(`✗ Low beat rate: ${(beatRate * 100).toFixed(0)}% (${beatCount}/${history.length}, +1)`);
    }

    // ===== SURPRISE MAGNITUDE (0-8 points) =====
    const avgSurprise =
      history.reduce((s, h) => s + h.surprise, 0) / history.length;

    if (avgSurprise >= 5) {
      totalScore += 8;
      details.push(`✓ Strong avg surprise: +${avgSurprise.toFixed(1)}% (+8)`);
    } else if (avgSurprise >= 2) {
      totalScore += 5;
      details.push(`✓ Good avg surprise: +${avgSurprise.toFixed(1)}% (+5)`);
    } else if (avgSurprise >= 0) {
      totalScore += 3;
      details.push(`∼ Neutral avg surprise: +${avgSurprise.toFixed(1)}% (+3)`);
    } else if (avgSurprise >= -3) {
      totalScore += 1;
      details.push(`∼ Slight negative surprise: ${avgSurprise.toFixed(1)}% (+1)`);
    } else {
      details.push(`✗ Negative avg surprise: ${avgSurprise.toFixed(1)}% (+0)`);
    }

    const finalScore = Math.min(20, Math.max(0, totalScore));
    logger.info(
      `Beat Score: ${finalScore}/20 (Beat streak: ${longestBeatStreak}, Avg surprise: ${avgSurprise.toFixed(1)}%)`
    );

    return {
      score: finalScore,
      beatStreak: longestBeatStreak,
      missStreak: longestMissStreak,
      avgSurprise,
      details,
    };
  }
}
