/**
 * Catalyst Detection Scoring (0-25 points)
 * Identifies upcoming catalysts: earnings, dividends, deals, approvals, products
 */
import { EventMetrics } from '../../types';
import logger from '../../../../config/logger';

interface DetectionResult {
  score: number;
  detectedEvents: { type: string; description: string; date?: Date; daysAway?: number }[];
  summaryDetails: string[];
}

export class CatalystDetectionScoring {
  analyze(metrics: Partial<EventMetrics>): DetectionResult {
    const summaryDetails: string[] = [];
    const detectedEvents: { type: string; description: string; date?: Date; daysAway?: number }[] = [];
    let totalScore = 0;
    let eventCount = 0;

    const now = new Date();

    // ===== EARNINGS CATALYST =====
    if (metrics.nextEarningsDate) {
      const daysToEarnings = Math.floor(
        (metrics.nextEarningsDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );

      if (daysToEarnings > 0 && daysToEarnings <= 90) {
        detectedEvents.push({
          type: 'earnings',
          description: `Q${Math.ceil(daysToEarnings / 90)} earnings announcement`,
          date: metrics.nextEarningsDate,
          daysAway: daysToEarnings,
        });
        eventCount++;

        if (daysToEarnings <= 30) {
          summaryDetails.push(`✓ Earnings coming in ${daysToEarnings} days (major catalyst)`);
          totalScore += 6;
        } else if (daysToEarnings <= 60) {
          summaryDetails.push(`✓ Earnings in ${daysToEarnings} days`);
          totalScore += 5;
        } else {
          summaryDetails.push(`⚠ Earnings in ${daysToEarnings} days`);
          totalScore += 3;
        }
      }
    }

    // ===== DIVIDEND CATALYST =====
    if (metrics.nextDividendDate) {
      const daysToDividend = Math.floor(
        (metrics.nextDividendDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );

      if (daysToDividend > 0 && daysToDividend <= 90) {
        detectedEvents.push({
          type: 'dividend',
          description: `Dividend payment in ${daysToDividend} days`,
          date: metrics.nextDividendDate,
        });
        eventCount++;
        totalScore += 2;
        summaryDetails.push(`✓ Dividend catalyst in ${daysToDividend} days`);
      }
    }

    // ===== DEAL CATALYST =====
    if (metrics.pendingDeals && metrics.pendingDeals.length > 0) {
      detectedEvents.push({
        type: 'deal',
        description: metrics.pendingDeals[0],
      });
      eventCount++;

      if (metrics.pendingDeals.length === 1) {
        totalScore += 4;
        summaryDetails.push(`⚠ Potential deal: ${metrics.pendingDeals[0]}`);
      } else {
        totalScore += 5;
        summaryDetails.push(`✓ Multiple deals under discussion (${metrics.pendingDeals.length})`);
      }
    }

    // ===== APPROVAL CATALYST =====
    if (metrics.pendingApprovals && metrics.pendingApprovals.length > 0) {
      detectedEvents.push({
        type: 'approval',
        description: metrics.pendingApprovals[0],
      });
      eventCount++;
      totalScore += 4;
      summaryDetails.push(`⚠ Regulatory approval pending: ${metrics.pendingApprovals[0]}`);
    }

    // ===== PRODUCT CATALYST =====
    if (metrics.productLaunchesPlanned && metrics.productLaunchesPlanned.length > 0) {
      detectedEvents.push({
        type: 'product',
        description: metrics.productLaunchesPlanned[0],
      });
      eventCount++;
      totalScore += 3;
      summaryDetails.push(`⚠ Product launch planned: ${metrics.productLaunchesPlanned[0]}`);
    }

    // ===== EVENT COUNT BONUS =====
    if (eventCount === 0) {
      totalScore = 5;
      summaryDetails.push(`✗ No catalysts identified`);
    } else if (eventCount >= 5) {
      totalScore += 2;
      summaryDetails.push(`✓ Multiple catalysts (${eventCount} identified)`);
    }

    const finalScore = Math.min(totalScore, 25);
    logger.info(`Catalyst Detection Score: ${finalScore}/25 (${eventCount} catalysts)`);

    return { score: finalScore, detectedEvents, summaryDetails };
  }
}
