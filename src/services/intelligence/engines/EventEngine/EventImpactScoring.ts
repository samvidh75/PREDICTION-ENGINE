/**
 * Event Impact Scoring (0-25 points)
 * Evaluates bullish vs bearish catalyst direction and impact magnitude
 */
import { EventMetrics } from '../../types';
import logger from '../../../../config/logger';

interface ImpactResult {
  score: number;
  direction: 'bullish' | 'bearish' | 'neutral';
  bullishCount: number;
  bearishCount: number;
  details: string[];
}

export class EventImpactScoring {
  analyze(metrics: Partial<EventMetrics>): ImpactResult {
    const details: string[] = [];
    let bullishCount = 0;
    let bearishCount = 0;

    // ===== COUNT FROM EVENTS ARRAY =====
    if (metrics.events && metrics.events.length > 0) {
      metrics.events.forEach((event) => {
        if (event.direction === 'bullish') {
          bullishCount++;
        } else if (event.direction === 'bearish') {
          bearishCount++;
        }
      });
    }

    // Use summary counts if higher
    if (metrics.bullishEventCount) bullishCount = Math.max(bullishCount, metrics.bullishEventCount);
    if (metrics.bearishEventCount) bearishCount = Math.max(bearishCount, metrics.bearishEventCount);

    // ===== CALCULATE SCORE =====
    let totalScore = 12; // Neutral base

    if (bullishCount > bearishCount) {
      const diff = bullishCount - bearishCount;
      totalScore += Math.min(diff * 2, 13);
      details.push(`✓ Net bullish: ${bullishCount} bullish vs ${bearishCount} bearish catalysts`);
    } else if (bearishCount > bullishCount) {
      const diff = bearishCount - bullishCount;
      totalScore -= Math.min(diff * 2, 12);
      totalScore = Math.max(totalScore, 1);
      details.push(`✗ Net bearish: ${bearishCount} bearish vs ${bullishCount} bullish catalysts`);
    } else {
      details.push(`⚠ Balanced catalysts: ${bullishCount} bullish, ${bearishCount} bearish`);
    }

    if (bullishCount >= 3) details.push(`  Multiple upside catalysts expected`);
    if (bearishCount >= 2) details.push(`  Material downside risks identified`);

    // ===== DETERMINE DIRECTION =====
    let direction: 'bullish' | 'bearish' | 'neutral';
    if (bullishCount > bearishCount) direction = 'bullish';
    else if (bearishCount > bullishCount) direction = 'bearish';
    else direction = 'neutral';

    const finalScore = Math.min(Math.max(totalScore, 1), 25);
    logger.info(`Event Impact: ${finalScore}/25 (${direction}, +${bullishCount}/-${bearishCount})`);

    return { score: finalScore, direction, bullishCount, bearishCount, details };
  }
}
