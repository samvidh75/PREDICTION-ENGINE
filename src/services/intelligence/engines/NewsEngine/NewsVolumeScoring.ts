/**
 * News Volume Scoring (0-30 points)
 * More news articles = more market attention and information flow.
 * Extremely high volume (>20 articles) may indicate crisis/overhype.
 */
import logger from '../../../../config/logger';

export interface NewsVolumeResult {
  score: number;
  articleCount: number;
  level: 'high_flow' | 'moderate' | 'low' | 'silent' | 'unknown';
  details: string[];
}

export function scoreNewsVolume(articles: { headline: string }[]): NewsVolumeResult {
  const details: string[] = [];
  const count = articles?.length ?? 0;

  let score: number;
  let level: NewsVolumeResult['level'];

  if (!articles || count === 0) {
    score = 5;
    level = 'silent';
    details.push('No recent news — low information flow (5/30 pts)');
  } else if (count >= 10 && count <= 20) {
    score = 28;
    level = 'high_flow';
    details.push(`✓ ${count} articles — Strong information flow (28/30 pts)`);
  } else if (count >= 6) {
    score = 24;
    level = 'high_flow';
    details.push(`✓ ${count} articles — Healthy news coverage (24/30 pts)`);
  } else if (count >= 3) {
    score = 18;
    level = 'moderate';
    details.push(`✓ ${count} articles — Moderate news flow (18/30 pts)`);
  } else if (count >= 1) {
    score = 10;
    level = 'low';
    details.push(`⚠ ${count} article(s) — Low news coverage (10/30 pts)`);
  } else {
    score = 5;
    level = 'silent';
    details.push('No news data (5/30 pts)');
  }

  // Penalize extreme volume (potential noise/crisis)
  if (count > 20) {
    score = Math.max(15, score - (count - 20) * 1);
    level = 'high_flow';
    details.push(`⚠ ${count} articles — Extremely high volume, potential noise (${score}/30 pts)`);
  }

  logger.info(`News Volume Score: ${score}/30 (${level})`);
  return { score, articleCount: count, level, details };
}
