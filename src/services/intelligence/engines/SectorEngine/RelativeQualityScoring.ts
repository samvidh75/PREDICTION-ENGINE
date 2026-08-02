/**
 * Relative Quality Scoring (0-20 points)
 *
 * Compares stock quality metrics (ROE, margins) against sector peers.
 * Higher score = better quality relative to sector.
 */
import logger from '../../../../config/logger';

export interface RelativeQualityResult {
  score: number;
  roeVsPeer: number | null;
  marginVsPeer: number | null;
  level: 'best_in_class' | 'above_median' | 'at_median' | 'below_median' | 'unknown';
  details: string[];
}

export function scoreRelativeQuality(params: {
  stockROE?: number | null;
  stockNetMargin?: number | null;
  peerROE?: number | null;
  peerNetMargin?: number | null;
}): RelativeQualityResult {
  const details: string[] = [];
  const { stockROE, stockNetMargin, peerROE, peerNetMargin } = params;

  const roeRatio = stockROE != null && peerROE && peerROE > 0 ? stockROE / peerROE : null;
  const marginRatio = stockNetMargin != null && peerNetMargin && peerNetMargin > 0
    ? stockNetMargin / peerNetMargin : null;

  const ratios = [roeRatio, marginRatio].filter((r): r is number => r !== null);

  if (ratios.length === 0) {
    return { score: 10, roeVsPeer: null, marginVsPeer: null,
             level: 'unknown', details: ['No peer quality data (10/20 pts)'] };
  }

  const avgRatio = ratios.reduce((a, r) => a + r, 0) / ratios.length;

  let score: number;
  let level: RelativeQualityResult['level'];

  if (avgRatio >= 1.3) {
    score = 18;
    level = 'best_in_class';
    details.push(`✓ ${((avgRatio - 1) * 100).toFixed(0)}% above peer median — Best-in-class quality (18/20 pts)`);
  } else if (avgRatio >= 1.1) {
    score = 15;
    level = 'above_median';
    details.push(`✓ ${((avgRatio - 1) * 100).toFixed(0)}% above peers — Above median (15/20 pts)`);
  } else if (avgRatio >= 0.9) {
    score = 10;
    level = 'at_median';
    details.push('⚠ At sector median quality (10/20 pts)');
  } else if (avgRatio >= 0.7) {
    score = 6;
    level = 'below_median';
    details.push(`⚠ ${((1 - avgRatio) * 100).toFixed(0)}% below peer median (6/20 pts)`);
  } else {
    score = 2;
    level = 'below_median';
    details.push(`✗ ${((1 - avgRatio) * 100).toFixed(0)}% below peers — Well below median (2/20 pts)`);
  }

  if (roeRatio !== null) details.push(`ROE: ${(roeRatio * 100).toFixed(0)}% of peer median`);
  if (marginRatio !== null) details.push(`Net Margin: ${(marginRatio * 100).toFixed(0)}% of peer median`);

  score = Math.min(20, Math.max(0, score));
  logger.info(`Relative Quality Score: ${score}/20 (${level})`);

  return { score, roeVsPeer: roeRatio, marginVsPeer: marginRatio, level, details };
}
