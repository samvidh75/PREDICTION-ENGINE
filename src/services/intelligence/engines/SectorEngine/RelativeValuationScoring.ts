/**
 * Relative Valuation Scoring (0-25 points)
 *
 * Compares stock valuation multiples against peer/sector averages.
 * Higher score = cheaper relative to peers.
 */
import logger from '../../../../config/logger';

export interface RelativeValuationResult {
  score: number;
  peVsPeer: number | null;    // Ratio: stockPE / peerAvgPE (1.0 = in line)
  pbVsPeer: number | null;
  evEbitdaVsPeer: number | null;
  level: 'deep_discount' | 'discount' | 'fair' | 'premium' | 'expensive' | 'unknown';
  details: string[];
}

export function scoreRelativeValuation(params: {
  stockPE?: number | null;
  stockPB?: number | null;
  stockEVEbitda?: number | null;
  peerPE?: number | null;
  peerPB?: number | null;
  peerEVEbitda?: number | null;
}): RelativeValuationResult {
  const details: string[] = [];
  const { stockPE, stockPB, stockEVEbitda, peerPE, peerPB, peerEVEbitda } = params;

  const peRatio = stockPE && peerPE && peerPE > 0 ? stockPE / peerPE : null;
  const pbRatio = stockPB && peerPB && peerPB > 0 ? stockPB / peerPB : null;
  const evRatio = stockEVEbitda && peerEVEbitda && peerEVEbitda > 0 ? stockEVEbitda / peerEVEbitda : null;

  const ratios = [peRatio, pbRatio, evRatio].filter((r): r is number => r !== null);

  if (ratios.length === 0) {
    return { score: 12, peVsPeer: null, pbVsPeer: null, evEbitdaVsPeer: null,
             level: 'unknown', details: ['No peer comparison data available (12/25 pts)'] };
  }

  // Average discount/premium across available multiples
  const avgRatio = ratios.reduce((a, r) => a + r, 0) / ratios.length;
  const avgDiscount = (1 - avgRatio) * 100; // Positive = discount

  let score: number;
  let level: RelativeValuationResult['level'];

  if (avgDiscount >= 20) {
    score = 23;
    level = 'deep_discount';
    details.push(`✓ ${avgDiscount.toFixed(0)}% discount to peers — Deep value (23/25 pts)`);
  } else if (avgDiscount >= 10) {
    score = 20;
    level = 'discount';
    details.push(`✓ ${avgDiscount.toFixed(0)}% discount to peers — Attractive (20/25 pts)`);
  } else if (avgDiscount >= 0) {
    score = 15;
    level = 'fair';
    details.push(`✓ Roughly in line with peers (15/25 pts)`);
  } else if (avgDiscount >= -10) {
    score = 10;
    level = 'fair';
    details.push(`⚠ ${Math.abs(avgDiscount).toFixed(0)}% premium to peers — Slightly expensive (10/25 pts)`);
  } else if (avgDiscount >= -20) {
    score = 6;
    level = 'premium';
    details.push(`⚠ ${Math.abs(avgDiscount).toFixed(0)}% premium to peers — Premium priced (6/25 pts)`);
  } else {
    score = 2;
    level = 'expensive';
    details.push(`✗ ${Math.abs(avgDiscount).toFixed(0)}% premium to peers — Significantly expensive (2/25 pts)`);
  }

  if (peRatio !== null) details.push(`PE: ${(peRatio * 100).toFixed(0)}% of peer avg`);
  if (pbRatio !== null) details.push(`PB: ${(pbRatio * 100).toFixed(0)}% of peer avg`);

  score = Math.min(25, Math.max(0, score));
  logger.info(`Relative Valuation Score: ${score}/25 (${level})`);

  return { score, peVsPeer: peRatio, pbVsPeer: pbRatio, evEbitdaVsPeer: evRatio, level, details };
}
