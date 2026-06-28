/**
 * PB Ratio Scoring (0-25 points)
 * Lower PB = better value. Book value anchor.
 */
import logger from '../../../../config/logger';

export interface PBRatioResult {
  score: number;
  pbRatio?: number;
  level: 'below_book' | 'fair_value' | 'premium' | 'expensive' | 'very_expensive' | 'unknown';
  details: string[];
}

export function scorePBRatio(pb?: number | null): PBRatioResult {
  const details: string[] = [];
  let score = 12; // Default
  let level: PBRatioResult['level'] = 'unknown';

  if (pb === undefined || pb === null) {
    details.push('PB Ratio: Not available (12/25 pts — default)');
    return { score, level, details };
  }

  if (pb <= 0) {
    score = 5;
    level = 'unknown';
    details.push(`⚠ PB ${pb.toFixed(2)}x — Negative book value (5/25 pts)`);
  } else if (pb < 1.0) {
    score = 23;
    level = 'below_book';
    details.push(`✓ PB ${pb.toFixed(2)}x — Trading below book value (23/25 pts)`);
  } else if (pb < 2.0) {
    score = 18;
    level = 'fair_value';
    details.push(`✓ PB ${pb.toFixed(2)}x — Fairly valued vs book (18/25 pts)`);
  } else if (pb < 4.0) {
    score = 12;
    level = 'premium';
    details.push(`⚠ PB ${pb.toFixed(2)}x — Premium to book (12/25 pts)`);
  } else if (pb < 6.0) {
    score = 6;
    level = 'expensive';
    details.push(`✗ PB ${pb.toFixed(2)}x — Expensive vs book (6/25 pts)`);
  } else {
    score = 2;
    level = 'very_expensive';
    details.push(`✗ PB ${pb.toFixed(2)}x — Very expensive vs book (2/25 pts)`);
  }

  score = Math.min(score, 25);
  logger.info(`PB Ratio Score: ${score}/25 (${level})`);

  return { score, pbRatio: pb, level, details };
}
