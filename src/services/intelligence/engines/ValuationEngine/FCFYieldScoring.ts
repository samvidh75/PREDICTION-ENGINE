/**
 * Free Cash Flow Yield Scoring (0-15 points)
 * Higher FCF yield = better value. Cash-generative companies score well.
 */
import logger from '../../../../config/logger';

export interface FCFYieldResult {
  score: number;
  fcfYield?: number;
  level: 'excellent' | 'good' | 'decent' | 'moderate' | 'low' | 'negative' | 'unknown';
  details: string[];
}

export function scoreFCFYield(fcfYield?: number | null): FCFYieldResult {
  const details: string[] = [];
  let score = 7; // Default
  let level: FCFYieldResult['level'] = 'unknown';

  if (fcfYield === undefined || fcfYield === null) {
    details.push('FCF Yield: Not available (7/15 pts — default)');
    return { score, level, details };
  }

  if (fcfYield >= 0.08) {
    score = 14;
    level = 'excellent';
    details.push(`✓ FCF Yield ${(fcfYield * 100).toFixed(1)}% — Excellent cash generation (14/15 pts)`);
  } else if (fcfYield >= 0.05) {
    score = 12;
    level = 'good';
    details.push(`✓ FCF Yield ${(fcfYield * 100).toFixed(1)}% — Strong (12/15 pts)`);
  } else if (fcfYield >= 0.03) {
    score = 9;
    level = 'decent';
    details.push(`✓ FCF Yield ${(fcfYield * 100).toFixed(1)}% — Decent (9/15 pts)`);
  } else if (fcfYield >= 0.02) {
    score = 6;
    level = 'moderate';
    details.push(`⚠ FCF Yield ${(fcfYield * 100).toFixed(1)}% — Moderate (6/15 pts)`);
  } else if (fcfYield >= 0) {
    score = 3;
    level = 'low';
    details.push(`⚠ FCF Yield ${(fcfYield * 100).toFixed(1)}% — Low (3/15 pts)`);
  } else {
    score = 1;
    level = 'negative';
    details.push(`✗ FCF Yield ${(fcfYield * 100).toFixed(1)}% — Negative FCF (1/15 pts)`);
  }

  score = Math.min(score, 15);
  logger.info(`FCF Yield Score: ${score}/15 (${level})`);

  return { score, fcfYield, level, details };
}
