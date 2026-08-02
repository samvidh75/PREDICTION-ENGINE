/**
 * Dividend Yield Scoring (0-15 points)
 * Rewards healthy dividends (2-6%), penalizes yield traps (>12%) and no dividend.
 */
import logger from '../../../../config/logger';

export interface DividendYieldResult {
  score: number;
  dividendYield?: number;
  level: 'healthy' | 'moderate' | 'low' | 'distress' | 'none' | 'unknown';
  details: string[];
}

export function scoreDividendYield(divYield?: number | null): DividendYieldResult {
  const details: string[] = [];
  let score = 5; // Default (neutral)
  let level: DividendYieldResult['level'] = 'unknown';

  if (divYield === undefined || divYield === null) {
    details.push('Dividend Yield: Not available (5/15 pts — default)');
    return { score, level, details };
  }

  if (divYield >= 0.12) {
    score = 2;
    level = 'distress';
    details.push(`✗ Dividend ${(divYield * 100).toFixed(1)}% — Yield trap / likely unsustainable (2/15 pts)`);
  } else if (divYield >= 0.08) {
    score = 6;
    level = 'low';
    details.push(`⚠ Dividend ${(divYield * 100).toFixed(1)}% — Very high, possible distress (6/15 pts)`);
  } else if (divYield >= 0.04) {
    score = 14;
    level = 'healthy';
    details.push(`✓ Dividend ${(divYield * 100).toFixed(1)}% — Healthy yield (14/15 pts)`);
  } else if (divYield >= 0.02) {
    score = 13;
    level = 'healthy';
    details.push(`✓ Dividend ${(divYield * 100).toFixed(1)}% — Solid (13/15 pts)`);
  } else if (divYield >= 0.01) {
    score = 8;
    level = 'moderate';
    details.push(`⚠ Dividend ${(divYield * 100).toFixed(1)}% — Modest (8/15 pts)`);
  } else if (divYield >= 0.005) {
    score = 6;
    level = 'low';
    details.push(`⚠ Dividend ${(divYield * 100).toFixed(1)}% — Low (6/15 pts)`);
  } else {
    score = 4;
    level = 'none';
    details.push(`⚠ Near-zero dividend (4/15 pts)`);
  }

  score = Math.min(score, 15);
  logger.info(`Dividend Yield Score: ${score}/15 (${level})`);

  return { score, dividendYield: divYield, level, details };
}
