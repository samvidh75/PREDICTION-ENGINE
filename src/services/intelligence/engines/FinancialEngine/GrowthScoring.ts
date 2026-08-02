import logger from '../../../../config/logger';

export interface GrowthResult {
  score: number;              // 0-25
  revenueScore: number;       // 0-12
  epsScore: number;           // 0-13
  details: string[];
}

export class GrowthScoring {
  /**
   * Score growth trajectory
   * Maximum: 25 points
   *
   * Breakdown:
   * - Revenue Growth → 0-12 pts
   *   (7-10% is healthy for most sectors)
   * - EPS Growth → 0-13 pts
   *   (Weighted higher - bottom line is key)
   *
   * Total: 25 points
   */
  analyze(metrics: {
    revenueGrowth?: number;
    epsGrowth?: number;
  }): GrowthResult {
    const details: string[] = [];
    let totalScore = 0;

    // ===== REVENUE GROWTH SCORING (0-12 points) =====
    let revenueScore: number;

    if (!metrics.revenueGrowth && metrics.revenueGrowth !== 0) {
      details.push('Revenue Growth: Not available (-0 pts)');
      revenueScore = 0;
    } else {
      const rg = metrics.revenueGrowth!;

      if (rg >= 20) {
        revenueScore = 12;
        details.push(`✓ Revenue Growth ${rg.toFixed(1)}% - Exceptional (12/12 pts)`);
      } else if (rg >= 15) {
        revenueScore = 11;
        details.push(`✓ Revenue Growth ${rg.toFixed(1)}% - Excellent (11/12 pts)`);
      } else if (rg >= 10) {
        revenueScore = 10;
        details.push(`✓ Revenue Growth ${rg.toFixed(1)}% - Very Good (10/12 pts)`);
      } else if (rg >= 7) {
        revenueScore = 9;
        details.push(`✓ Revenue Growth ${rg.toFixed(1)}% - Good (9/12 pts)`);
      } else if (rg >= 5) {
        revenueScore = 6;
        details.push(`⚠ Revenue Growth ${rg.toFixed(1)}% - Acceptable (6/12 pts)`);
      } else if (rg > 0) {
        revenueScore = 2;
        details.push(`✗ Revenue Growth ${rg.toFixed(1)}% - Weak (2/12 pts)`);
      } else if (rg === 0) {
        revenueScore = 0;
        details.push(`✗ Revenue Growth ${rg.toFixed(1)}% - Stagnant (0/12 pts)`);
      } else {
        revenueScore = 0;
        details.push(`✗ Revenue Growth ${rg.toFixed(1)}% - Declining (0/12 pts)`);
      }
    }
    totalScore += revenueScore;

    // ===== EPS GROWTH SCORING (0-13 points) =====
    let epsScore: number;

    if (!metrics.epsGrowth && metrics.epsGrowth !== 0) {
      details.push('EPS Growth: Not available (-0 pts)');
      epsScore = 0;
    } else {
      const eg = metrics.epsGrowth!;

      if (eg >= 25) {
        epsScore = 13;
        details.push(`✓ EPS Growth ${eg.toFixed(1)}% - Exceptional (13/13 pts)`);
      } else if (eg >= 20) {
        epsScore = 12;
        details.push(`✓ EPS Growth ${eg.toFixed(1)}% - Excellent (12/13 pts)`);
      } else if (eg >= 15) {
        epsScore = 11;
        details.push(`✓ EPS Growth ${eg.toFixed(1)}% - Very Good (11/13 pts)`);
      } else if (eg >= 10) {
        epsScore = 10;
        details.push(`✓ EPS Growth ${eg.toFixed(1)}% - Good (10/13 pts)`);
      } else if (eg >= 7) {
        epsScore = 8;
        details.push(`✓ EPS Growth ${eg.toFixed(1)}% - Acceptable (8/13 pts)`);
      } else if (eg >= 5) {
        epsScore = 5;
        details.push(`⚠ EPS Growth ${eg.toFixed(1)}% - Moderate (5/13 pts)`);
      } else if (eg > 0) {
        epsScore = 2;
        details.push(`✗ EPS Growth ${eg.toFixed(1)}% - Weak (2/13 pts)`);
      } else if (eg === 0) {
        epsScore = 0;
        details.push(`✗ EPS Growth ${eg.toFixed(1)}% - Stagnant (0/13 pts)`);
      } else {
        epsScore = 0;
        details.push(`✗ EPS Growth ${eg.toFixed(1)}% - Declining (0/13 pts)`);
      }
    }
    totalScore += epsScore;

    const finalScore = Math.min(totalScore, 25);

    logger.info(
      `Growth Score: ${finalScore}/25 (Revenue: ${revenueScore}/12, EPS: ${epsScore}/13)`
    );

    return {
      score: finalScore,
      revenueScore,
      epsScore,
      details,
    };
  }
}
