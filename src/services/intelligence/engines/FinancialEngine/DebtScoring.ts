import logger from '../../../../config/logger';

export interface DebtResult {
  score: number;              // 0-10
  deDetails: string[];
}

export class DebtScoring {
  /**
   * Score leverage and solvency
   * Maximum: 10 points (binary mostly: low leverage = 10, high = 0)
   *
   * Key metric: Debt-to-Equity ratio
   * - D/E < 0.5 → 10 pts (very healthy, can borrow if needed)
   * - D/E 0.5-1.0 → 5 pts (moderate, acceptable)
   * - D/E > 1.0 → 0 pts (high risk, over-leveraged)
   *
   * Adjustment: Interest Coverage
   * - If can't comfortably pay interest → deduct points
   * - If have slack → no adjustment
   */
  analyze(metrics: {
    debtToEquity?: number;
    interestCoverage?: number;
  }): DebtResult {
    const deDetails: string[] = [];
    let score = 0;

    // ===== DEBT-TO-EQUITY SCORING =====
    if (!metrics.debtToEquity && metrics.debtToEquity !== 0) {
      deDetails.push('D/E Ratio: Not available (-0 pts)');
      score = 0;
    } else {
      const de = metrics.debtToEquity;

      if (de < 0.3) {
        score = 10;
        deDetails.push(`✓ D/E ${de.toFixed(2)} - Very Low Leverage (10/10 pts)`);
      } else if (de < 0.5) {
        score = 10;
        deDetails.push(`✓ D/E ${de.toFixed(2)} - Low Leverage (10/10 pts)`);
      } else if (de < 0.75) {
        score = 7;
        deDetails.push(`✓ D/E ${de.toFixed(2)} - Moderate Leverage (7/10 pts)`);
      } else if (de < 1.0) {
        score = 5;
        deDetails.push(`⚠ D/E ${de.toFixed(2)} - Elevated Leverage (5/10 pts)`);
      } else if (de < 1.5) {
        score = 2;
        deDetails.push(`✗ D/E ${de.toFixed(2)} - High Leverage (2/10 pts)`);
      } else {
        score = 0;
        deDetails.push(`✗ D/E ${de.toFixed(2)} - Very High Leverage (0/10 pts)`);
      }
    }

    // ===== INTEREST COVERAGE ADJUSTMENT =====
    if (metrics.interestCoverage !== undefined) {
      const ic = metrics.interestCoverage;

      if (ic >= 10) {
        deDetails.push(`✓ Interest Coverage ${ic.toFixed(1)}x - Very Comfortable (no adjustment)`);
      } else if (ic >= 5) {
        deDetails.push(`✓ Interest Coverage ${ic.toFixed(1)}x - Comfortable (no adjustment)`);
      } else if (ic >= 2) {
        deDetails.push(`⚠ Interest Coverage ${ic.toFixed(1)}x - Tight (no adjustment)`);
      } else if (ic > 1) {
        const penalty = 3;
        score = Math.max(0, score - penalty);
        deDetails.push(`✗ Interest Coverage ${ic.toFixed(1)}x - Very Tight (-${penalty} pts)`);
      } else {
        score = 0;
        deDetails.push(`✗ Interest Coverage ${ic.toFixed(1)}x - Can't Pay Interest (0/10 pts)`);
      }
    }

    score = Math.max(0, Math.min(score, 10));

    logger.info(`Debt Score: ${score}/10`);

    return {
      score,
      deDetails,
    };
  }
}
