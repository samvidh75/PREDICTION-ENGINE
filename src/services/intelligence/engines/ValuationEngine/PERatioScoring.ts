/**
 * PE Ratio Scoring (0-25 points)
 * Lower PE = better value. Sector-agnostic thresholds.
 */
import logger from '../../../../config/logger';

export interface PERatioResult {
  score: number;
  peRatio?: number;
  level: 'deep_value' | 'attractive' | 'fair' | 'premium' | 'expensive' | 'unprofitable' | 'unknown';
  details: string[];
}

export function scorePERatio(pe?: number | null): PERatioResult {
  const details: string[] = [];
  let score = 12; // Default
  let level: PERatioResult['level'] = 'unknown';

  if (pe === undefined || pe === null) {
    details.push('PE Ratio: Not available (12/25 pts — default)');
    return { score, level, details };
  }

  if (pe <= 0) {
    score = 5;
    level = 'unprofitable';
    details.push(`✗ PE ${pe.toFixed(1)}x — Negative earnings (5/25 pts)`);
  } else if (pe < 10) {
    score = 23;
    level = 'deep_value';
    details.push(`✓ PE ${pe.toFixed(1)}x — Deep value territory (23/25 pts)`);
  } else if (pe < 15) {
    score = 20;
    level = 'attractive';
    details.push(`✓ PE ${pe.toFixed(1)}x — Attractive valuation (20/25 pts)`);
  } else if (pe < 20) {
    score = 15;
    level = 'fair';
    details.push(`✓ PE ${pe.toFixed(1)}x — Fairly valued (15/25 pts)`);
  } else if (pe < 30) {
    score = 8;
    level = 'premium';
    details.push(`⚠ PE ${pe.toFixed(1)}x — Premium valuation (8/25 pts)`);
  } else {
    score = 3;
    level = 'expensive';
    details.push(`✗ PE ${pe.toFixed(1)}x — Expensive (3/25 pts)`);
  }

  score = Math.min(score, 25);
  logger.info(`PE Ratio Score: ${score}/25 (${level})`);

  return { score, peRatio: pe, level, details };
}
