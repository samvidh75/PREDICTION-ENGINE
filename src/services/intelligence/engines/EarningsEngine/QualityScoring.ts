/**
 * Quality Scoring Module (0-20 points)
 * Evaluates revenue vs EPS quality, one-time items, and free cash flow
 */
import { EarningsHistoryPeriod } from '../../types';
import logger from '../../../../config/logger';

interface QualityResult {
  score: number;
  earningsQuality: 'excellent' | 'good' | 'average' | 'weak';
  revenueQuality: 'solid' | 'adequate' | 'concerning';
  details: string[];
}

interface QualityInput {
  history: EarningsHistoryPeriod[];
  oneTimeItems?: number;
  fcfMargin?: number;
}

export class QualityScoring {
  analyze(input: QualityInput): QualityResult {
    logger.info(`QualityScoring: ${input.history.length} periods, FCF ${input.fcfMargin}%`);
    const details: string[] = [];
    let totalScore = 0;

    const { history, oneTimeItems, fcfMargin } = input;

    // ===== REVENUE vs EPS QUALITY (0-8 points) =====
    if (history.length >= 2) {
      const recentHalf = history.slice(-Math.min(4, history.length));
      const avgEpsGrowth =
        recentHalf.reduce((s, h) => s + h.epsYoY, 0) / recentHalf.length;
      const avgRevGrowth =
        recentHalf.reduce((s, h) => s + h.revenueYoY, 0) / recentHalf.length;

      if (avgRevGrowth >= avgEpsGrowth * 0.9) {
        totalScore += 8;
        details.push(
          `✓ Revenue tracks EPS well (Rev: ${avgRevGrowth.toFixed(1)}% vs EPS: ${avgEpsGrowth.toFixed(1)}%, +8)`
        );
      } else if (avgRevGrowth >= avgEpsGrowth * 0.7) {
        totalScore += 5;
        details.push(
          `✓ Revenue moderately tracks EPS (Rev: ${avgRevGrowth.toFixed(1)}% vs EPS: ${avgEpsGrowth.toFixed(1)}%, +5)`
        );
      } else if (avgRevGrowth >= avgEpsGrowth * 0.5) {
        totalScore += 2;
        details.push(
          `∼ Revenue weakly tracks EPS (Rev: ${avgRevGrowth.toFixed(1)}% vs EPS: ${avgEpsGrowth.toFixed(1)}%, +2)`
        );
      } else {
        details.push(
          `✗ Revenue diverging from EPS (Rev: ${avgRevGrowth.toFixed(1)}% vs EPS: ${avgEpsGrowth.toFixed(1)}%, +0)`
        );
      }
    }

    // ===== ONE-TIME ITEMS CHECK (0-6 points) =====
    if (oneTimeItems !== undefined) {
      if (oneTimeItems < 2) {
        totalScore += 6;
        details.push(`✓ Clean earnings: ${oneTimeItems}% one-time items (+6)`);
      } else if (oneTimeItems < 5) {
        totalScore += 3;
        details.push(`∼ Minor one-time items: ${oneTimeItems}% (+3)`);
      } else if (oneTimeItems < 10) {
        totalScore += 1;
        details.push(`∼ Moderate one-time items: ${oneTimeItems}% (+1)`);
      } else {
        totalScore += 0;
        details.push(`✗ High one-time items: ${oneTimeItems}% (+0)`);
      }
    }

    // ===== FREE CASH FLOW MARGIN (0-6 points) =====
    if (fcfMargin !== undefined) {
      if (fcfMargin >= 15) {
        totalScore += 6;
        details.push(`✓ Strong FCF margin: ${fcfMargin}% (+6)`);
      } else if (fcfMargin >= 10) {
        totalScore += 4;
        details.push(`✓ Good FCF margin: ${fcfMargin}% (+4)`);
      } else if (fcfMargin >= 5) {
        totalScore += 2;
        details.push(`∼ Moderate FCF margin: ${fcfMargin}% (+2)`);
      } else if (fcfMargin > 0) {
        totalScore += 1;
        details.push(`∼ Low FCF margin: ${fcfMargin}% (+1)`);
      } else {
        totalScore += 0;
        details.push(`✗ Negative FCF (0 pts)`);
      }
    }

    // ===== QUALITY CLASSIFICATION =====
    let earningsQuality: 'excellent' | 'good' | 'average' | 'weak';
    if (totalScore >= 15) {
      earningsQuality = 'excellent';
    } else if (totalScore >= 10) {
      earningsQuality = 'good';
    } else if (totalScore >= 5) {
      earningsQuality = 'average';
    } else {
      earningsQuality = 'weak';
    }

    // Compute revenue quality
    let revenueQuality: 'solid' | 'adequate' | 'concerning';
    if (history.length >= 2) {
      const recentHalf = history.slice(-Math.min(4, history.length));
      const avgEpsGrowth =
        recentHalf.reduce((s, h) => s + h.epsYoY, 0) / recentHalf.length;
      const avgRevGrowth =
        recentHalf.reduce((s, h) => s + h.revenueYoY, 0) / recentHalf.length;

      if (avgRevGrowth >= avgEpsGrowth * 0.8) {
        revenueQuality = 'solid';
      } else if (avgRevGrowth > 0) {
        revenueQuality = 'adequate';
      } else {
        revenueQuality = 'concerning';
      }
    } else {
      revenueQuality = 'adequate';
    }

    const finalScore = Math.min(20, totalScore);
    logger.info(`Quality Score: ${finalScore}/20 (Earnings: ${earningsQuality})`);

    return {
      score: finalScore,
      earningsQuality,
      revenueQuality,
      details,
    };
  }
}
