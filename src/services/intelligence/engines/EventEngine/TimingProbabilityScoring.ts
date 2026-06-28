/**
 * Timing & Probability Scoring (0-20 points)
 * Evaluates how soon the next catalyst is and how likely it is to materialize
 */
import { EventMetrics } from '../../types';
import logger from '../../../../config/logger';

interface TimingResult {
  score: number;
  opportunityWindow: 'immediate' | 'near_term' | 'medium_term' | 'distant' | 'limited';
  daysToCatalyst?: number;
  details: string[];
}

export class TimingProbabilityScoring {
  analyze(metrics: Partial<EventMetrics>): TimingResult {
    const details: string[] = [];
    let totalScore = 0;
    let daysToCatalyst = 999;

    const now = new Date();

    // ===== FIND NEAREST CATALYST =====
    let nearestEvent: { expectedDate: Date; type: string; probability?: number } | null = null;

    if (metrics.events && metrics.events.length > 0) {
      const upcomingEvents = metrics.events
        .filter(e => e.expectedDate && e.expectedDate > now)
        .sort((a, b) => a.expectedDate!.getTime() - b.expectedDate!.getTime());

      if (upcomingEvents.length > 0) {
        nearestEvent = {
          expectedDate: upcomingEvents[0].expectedDate!,
          type: upcomingEvents[0].type,
          probability: upcomingEvents[0].probability,
        };
        daysToCatalyst = Math.floor(
          (nearestEvent.expectedDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );
      }
    }

    // Check earnings date
    if (metrics.nextEarningsDate && metrics.nextEarningsDate > now) {
      const daysToEarnings = Math.floor(
        (metrics.nextEarningsDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );
      if (daysToEarnings < daysToCatalyst) {
        daysToCatalyst = daysToEarnings;
        nearestEvent = { expectedDate: metrics.nextEarningsDate, type: 'earnings' };
      }
    }

    // ===== TIMING SCORING =====
    if (daysToCatalyst <= 30) {
      totalScore = 18;
      details.push(`✓✓ Immediate catalyst: ${daysToCatalyst} days (${nearestEvent?.type || 'event'})`);
    } else if (daysToCatalyst <= 60) {
      totalScore = 14;
      details.push(`✓ Near-term catalyst: ${daysToCatalyst} days`);
    } else if (daysToCatalyst <= 90) {
      totalScore = 10;
      details.push(`⚠ Medium-term catalyst: ${daysToCatalyst} days`);
    } else if (daysToCatalyst <= 180) {
      totalScore = 5;
      details.push(`⚠ Distant catalyst: ${daysToCatalyst} days`);
    } else {
      totalScore = 2;
      details.push(`✗ No near-term catalysts`);
    }

    // ===== PROBABILITY BONUS =====
    if (nearestEvent?.probability !== undefined) {
      if (nearestEvent.probability >= 0.9) {
        totalScore += 2;
        details.push(`  High probability (90%+) +2 pts`);
      } else if (nearestEvent.probability >= 0.7) {
        totalScore += 1;
        details.push(`  Moderate probability (70%+)`);
      }
    }

    // ===== EVENT CONCENTRATION =====
    if (metrics.eventCount90Days && metrics.eventCount90Days >= 3) {
      details.push(`  Multiple catalysts in next 90 days`);
    } else if (metrics.eventCount90Days === 0 || !metrics.eventCount90Days) {
      totalScore = Math.max(totalScore - 2, 2);
    }

    // ===== DETERMINE OPPORTUNITY WINDOW =====
    let opportunityWindow: 'immediate' | 'near_term' | 'medium_term' | 'distant' | 'limited';
    if (daysToCatalyst <= 30) opportunityWindow = 'immediate';
    else if (daysToCatalyst <= 60) opportunityWindow = 'near_term';
    else if (daysToCatalyst <= 90) opportunityWindow = 'medium_term';
    else if (daysToCatalyst <= 180) opportunityWindow = 'distant';
    else opportunityWindow = 'limited';

    const finalScore = Math.min(Math.max(totalScore, 1), 20);
    logger.info(`Timing/Probability: ${finalScore}/20 (${daysToCatalyst}d to catalyst)`);

    return {
      score: finalScore,
      opportunityWindow,
      daysToCatalyst: daysToCatalyst < 999 ? daysToCatalyst : undefined,
      details,
    };
  }
}
