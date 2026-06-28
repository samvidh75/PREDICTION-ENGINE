import logger from '../../../../config/logger';

export interface QualityResult {
  score: number;              // 0-35
  roeScore: number;           // 0-15
  operatingMarginScore: number; // 0-10
  netMarginScore: number;     // 0-10
  details: string[];
}

export class QualityScoring {
  /**
   * Score business quality based on profitability metrics
   * Maximum: 35 points
   *
   * Breakdown:
   * - ROE (Return on Equity) → 0-15 pts
   *   (High ROE = capital efficient, better quality)
   * - Operating Margin → 0-10 pts
   *   (High margins = pricing power, operational efficiency)
   * - Net Margin → 0-10 pts
   *   (High margins = bottom-line profitability)
   *
   * Total: 35 points
   */
  analyze(metrics: {
    roe?: number;
    operatingMargin?: number;
    netMargin?: number;
  }): QualityResult {
    const details: string[] = [];
    let totalScore = 0;

    // ===== ROE SCORING (0-15 points) =====
    let roeScore = 0;

    if (!metrics.roe && metrics.roe !== 0) {
      details.push('ROE: Not available (-0 pts)');
      roeScore = 0;
    } else {
      const roe = metrics.roe!;

      if (roe >= 30) {
        roeScore = 15;
        details.push(`✓ ROE ${roe.toFixed(1)}% - Exceptional (15/15 pts)`);
      } else if (roe >= 25) {
        roeScore = 14;
        details.push(`✓ ROE ${roe.toFixed(1)}% - Excellent (14/15 pts)`);
      } else if (roe >= 20) {
        roeScore = 12;
        details.push(`✓ ROE ${roe.toFixed(1)}% - Very Good (12/15 pts)`);
      } else if (roe >= 15) {
        roeScore = 10;
        details.push(`✓ ROE ${roe.toFixed(1)}% - Good (10/15 pts)`);
      } else if (roe >= 10) {
        roeScore = 6;
        details.push(`⚠ ROE ${roe.toFixed(1)}% - Fair (6/15 pts)`);
      } else if (roe > 0) {
        roeScore = 2;
        details.push(`✗ ROE ${roe.toFixed(1)}% - Weak (2/15 pts)`);
      } else {
        roeScore = 0;
        details.push(`✗ ROE ${roe.toFixed(1)}% - Negative (0/15 pts)`);
      }
    }
    totalScore += roeScore;

    // ===== OPERATING MARGIN SCORING (0-10 points) =====
    let operatingMarginScore = 0;

    if (!metrics.operatingMargin && metrics.operatingMargin !== 0) {
      details.push('Operating Margin: Not available (-0 pts)');
      operatingMarginScore = 0;
    } else {
      const om = metrics.operatingMargin!;

      if (om >= 30) {
        operatingMarginScore = 10;
        details.push(`✓ Operating Margin ${om.toFixed(1)}% - Exceptional (10/10 pts)`);
      } else if (om >= 25) {
        operatingMarginScore = 9;
        details.push(`✓ Operating Margin ${om.toFixed(1)}% - Excellent (9/10 pts)`);
      } else if (om >= 20) {
        operatingMarginScore = 8;
        details.push(`✓ Operating Margin ${om.toFixed(1)}% - Very Good (8/10 pts)`);
      } else if (om >= 15) {
        operatingMarginScore = 6;
        details.push(`✓ Operating Margin ${om.toFixed(1)}% - Good (6/10 pts)`);
      } else if (om >= 10) {
        operatingMarginScore = 3;
        details.push(`⚠ Operating Margin ${om.toFixed(1)}% - Acceptable (3/10 pts)`);
      } else if (om > 0) {
        operatingMarginScore = 1;
        details.push(`✗ Operating Margin ${om.toFixed(1)}% - Weak (1/10 pts)`);
      } else {
        operatingMarginScore = 0;
        details.push(`✗ Operating Margin ${om.toFixed(1)}% - Negative (0/10 pts)`);
      }
    }
    totalScore += operatingMarginScore;

    // ===== NET MARGIN SCORING (0-10 points) =====
    let netMarginScore = 0;

    if (!metrics.netMargin && metrics.netMargin !== 0) {
      details.push('Net Margin: Not available (-0 pts)');
      netMarginScore = 0;
    } else {
      const nm = metrics.netMargin!;

      if (nm >= 25) {
        netMarginScore = 10;
        details.push(`✓ Net Margin ${nm.toFixed(1)}% - Exceptional (10/10 pts)`);
      } else if (nm >= 20) {
        netMarginScore = 9;
        details.push(`✓ Net Margin ${nm.toFixed(1)}% - Excellent (9/10 pts)`);
      } else if (nm >= 15) {
        netMarginScore = 8;
        details.push(`✓ Net Margin ${nm.toFixed(1)}% - Very Good (8/10 pts)`);
      } else if (nm >= 10) {
        netMarginScore = 6;
        details.push(`✓ Net Margin ${nm.toFixed(1)}% - Good (6/10 pts)`);
      } else if (nm >= 5) {
        netMarginScore = 3;
        details.push(`⚠ Net Margin ${nm.toFixed(1)}% - Acceptable (3/10 pts)`);
      } else if (nm > 0) {
        netMarginScore = 1;
        details.push(`✗ Net Margin ${nm.toFixed(1)}% - Weak (1/10 pts)`);
      } else {
        netMarginScore = 0;
        details.push(`✗ Net Margin ${nm.toFixed(1)}% - Negative (0/10 pts)`);
      }
    }
    totalScore += netMarginScore;

    const finalScore = Math.min(totalScore, 35);

    logger.info(
      `Quality Score: ${finalScore}/35 (ROE: ${roeScore}/15, OpMargin: ${operatingMarginScore}/10, NetMargin: ${netMarginScore}/10)`
    );

    return {
      score: finalScore,
      roeScore,
      operatingMarginScore,
      netMarginScore,
      details,
    };
  }
}
