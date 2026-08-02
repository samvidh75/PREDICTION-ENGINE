/**
 * Forward Scoring Module (0-20 points)
 * Evaluates guided earnings growth and PEG ratio attractiveness
 */
import logger from '../../../../config/logger';

interface ForwardInput {
  currentGuidance: {
    epsGrowth: number;
    revenueGrowth: number;
  };
  peg?: number;
  forwardPE?: number;
}

interface ForwardResult {
  score: number;
  details: string[];
}

export class ForwardScoring {
  analyze(input: ForwardInput): ForwardResult {
    logger.info(`ForwardScoring: Guidance EPS ${input.currentGuidance.epsGrowth}% Rev ${input.currentGuidance.revenueGrowth}% PEG ${input.peg}`);
    const details: string[] = [];
    let totalScore = 0;

    const { currentGuidance, peg, forwardPE } = input;

    // ===== GUIDED GROWTH SCORING (0-14 points) =====
    const epsGrowth = currentGuidance.epsGrowth;
    const revGrowth = currentGuidance.revenueGrowth;

    if (epsGrowth >= 20) {
      totalScore += 8;
      details.push(`✓ High EPS growth guided: ${epsGrowth}% (+8)`);
    } else if (epsGrowth >= 10) {
      totalScore += 5;
      details.push(`✓ Moderate EPS growth guided: ${epsGrowth}% (+5)`);
    } else if (epsGrowth >= 5) {
      totalScore += 2;
      details.push(`∼ Low EPS growth guided: ${epsGrowth}% (+2)`);
    } else if (epsGrowth > 0) {
      totalScore += 1;
      details.push(`∼ Minimal EPS growth guided: ${epsGrowth}% (+1)`);
    } else {
      details.push(`✗ Negative EPS guidance: ${epsGrowth}% (+0)`);
    }

    if (revGrowth >= 15) {
      totalScore += 6;
      details.push(`✓ Strong revenue growth guided: ${revGrowth}% (+6)`);
    } else if (revGrowth >= 8) {
      totalScore += 3;
      details.push(`∼ Moderate revenue growth guided: ${revGrowth}% (+3)`);
    } else if (revGrowth >= 0) {
      totalScore += 1;
      details.push(`∼ Low revenue growth guided: ${revGrowth}% (+1)`);
    } else {
      details.push(`✗ Revenue decline guided: ${revGrowth}% (+0)`);
    }

    // ===== PEG RATIO ADJUSTMENT (0-6 points) =====
    if (peg !== undefined && peg > 0) {
      if (peg < 1) {
        totalScore += 6;
        details.push(`✓ Attractive PEG: ${peg.toFixed(2)}x (<1, +6)`);
      } else if (peg <= 1.5) {
        totalScore += 4;
        details.push(`✓ Fair PEG: ${peg.toFixed(2)}x (1-1.5, +4)`);
      } else if (peg <= 2.0) {
        totalScore += 2;
        details.push(`∼ Elevated PEG: ${peg.toFixed(2)}x (1.5-2, +2)`);
      } else {
        details.push(`✗ Expensive PEG: ${peg.toFixed(2)}x (>2, +0)`);
      }
    } else if (forwardPE !== undefined) {
      // Limited adjustment if PEG not available
      if (forwardPE < 15) {
        totalScore += 3;
        details.push(`∼ Low forward PE: ${forwardPE}x (+3)`);
      } else if (forwardPE > 30) {
        totalScore += 0;
        details.push(`✗ High forward PE: ${forwardPE}x (+0)`);
      } else {
        totalScore += 1;
        details.push(`∼ Moderate forward PE: ${forwardPE}x (+1)`);
      }
    }

    const finalScore = Math.min(20, Math.max(0, totalScore));
    logger.info(`Forward Score: ${finalScore}/20`);

    return {
      score: finalScore,
      details,
    };
  }
}
