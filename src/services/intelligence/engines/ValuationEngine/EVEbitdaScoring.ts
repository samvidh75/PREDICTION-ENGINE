/**
 * EV/EBITDA Scoring (0-20 points)
 * Enterprise value to EBITDA — lower = cheaper. Capital-structure neutral.
 */
import logger from '../../../../config/logger';

export interface EVEbitdaResult {
  score: number;
  evEbitda?: number;
  level: 'cheap' | 'reasonable' | 'fair' | 'premium' | 'expensive' | 'unknown';
  details: string[];
}

export function scoreEVEbitda(evEbitda?: number | null): EVEbitdaResult {
  const details: string[] = [];
  let score = 10; // Default
  let level: EVEbitdaResult['level'] = 'unknown';

  if (evEbitda === undefined || evEbitda === null) {
    details.push('EV/EBITDA: Not available (10/20 pts — default)');
    return { score, level, details };
  }

  if (evEbitda <= 0) {
    score = 4;
    level = 'unknown';
    details.push(`⚠ EV/EBITDA ${evEbitda.toFixed(1)}x — Negative EBITDA (4/20 pts)`);
  } else if (evEbitda < 8) {
    score = 18;
    level = 'cheap';
    details.push(`✓ EV/EBITDA ${evEbitda.toFixed(1)}x — Inexpensive (18/20 pts)`);
  } else if (evEbitda < 12) {
    score = 15;
    level = 'reasonable';
    details.push(`✓ EV/EBITDA ${evEbitda.toFixed(1)}x — Reasonable (15/20 pts)`);
  } else if (evEbitda < 18) {
    score = 10;
    level = 'fair';
    details.push(`⚠ EV/EBITDA ${evEbitda.toFixed(1)}x — Fair (10/20 pts)`);
  } else if (evEbitda < 25) {
    score = 5;
    level = 'premium';
    details.push(`✗ EV/EBITDA ${evEbitda.toFixed(1)}x — Premium (5/20 pts)`);
  } else {
    score = 2;
    level = 'expensive';
    details.push(`✗ EV/EBITDA ${evEbitda.toFixed(1)}x — Expensive (2/20 pts)`);
  }

  score = Math.min(score, 20);
  logger.info(`EV/EBITDA Score: ${score}/20 (${level})`);

  return { score, evEbitda, level, details };
}
