/**
 * Relative Growth Scoring (0-15 points)
 *
 * Compares revenue and EPS growth rates against sector peers.
 * Higher score = growing faster than sector.
 */
import logger from '../../../../config/logger';

export interface RelativeGrowthResult {
  score: number;
  revenueGrowthVsPeer: number | null;
  epsGrowthVsPeer: number | null;
  level: 'outgrowing' | 'slightly_ahead' | 'in_line' | 'lagging' | 'unknown';
  details: string[];
}

export function scoreRelativeGrowth(params: {
  stockRevGrowth?: number | null;
  stockEPSGrowth?: number | null;
  peerRevGrowth?: number | null;
  peerEPSGrowth?: number | null;
}): RelativeGrowthResult {
  const details: string[] = [];
  const { stockRevGrowth, stockEPSGrowth, peerRevGrowth, peerEPSGrowth } = params;

  const revDiff = stockRevGrowth != null && peerRevGrowth != null
    ? stockRevGrowth - peerRevGrowth : null;
  const epsDiff = stockEPSGrowth != null && peerEPSGrowth != null
    ? stockEPSGrowth - peerEPSGrowth : null;

  const diffs = [revDiff, epsDiff].filter((d): d is number => d !== null);

  if (diffs.length === 0) {
    return { score: 7, revenueGrowthVsPeer: null, epsGrowthVsPeer: null,
             level: 'unknown', details: ['No peer growth comparison data (7/15 pts)'] };
  }

  const avgDiff = diffs.reduce((a, d) => a + d, 0) / diffs.length; // Percentage points

  let score: number;
  let level: RelativeGrowthResult['level'];

  if (avgDiff >= 5) {
    score = 14;
    level = 'outgrowing';
    details.push(`✓ Growing ${avgDiff.toFixed(1)}pp faster than sector — Strong outperformance (14/15 pts)`);
  } else if (avgDiff >= 2) {
    score = 11;
    level = 'slightly_ahead';
    details.push(`✓ Growing ${avgDiff.toFixed(1)}pp faster than sector (11/15 pts)`);
  } else if (avgDiff >= -2) {
    score = 7;
    level = 'in_line';
    details.push('⚠ Growth roughly in line with sector (7/15 pts)');
  } else if (avgDiff >= -5) {
    score = 4;
    level = 'lagging';
    details.push(`⚠ Lagging sector by ${Math.abs(avgDiff).toFixed(1)}pp (4/15 pts)`);
  } else {
    score = 1;
    level = 'lagging';
    details.push(`✗ Significantly lagging sector by ${Math.abs(avgDiff).toFixed(1)}pp (1/15 pts)`);
  }

  if (revDiff !== null) details.push(`Revenue growth: ${revDiff > 0 ? '+' : ''}${revDiff.toFixed(1)}pp vs sector`);
  if (epsDiff !== null) details.push(`EPS growth: ${epsDiff > 0 ? '+' : ''}${epsDiff.toFixed(1)}pp vs sector`);

  score = Math.min(15, Math.max(0, score));
  logger.info(`Relative Growth Score: ${score}/15 (${level})`);

  return { score, revenueGrowthVsPeer: revDiff, epsGrowthVsPeer: epsDiff, level, details };
}
