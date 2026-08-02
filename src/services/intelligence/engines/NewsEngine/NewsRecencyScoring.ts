/**
 * News Recency Scoring (0-15 points)
 *
 * Fresher news = more relevant to current market conditions.
 * Articles within 24 hours score highest; older than 7 days score lowest.
 */
import logger from '../../../../config/logger';

export interface NewsRecencyResult {
  score: number;
  avgAgeHours: number;
  freshCount: number;
  totalCount: number;
  level: 'breaking' | 'recent' | 'aging' | 'stale' | 'unknown';
  details: string[];
}

export function scoreNewsRecency(
  articles: { headline: string; time: string }[]
): NewsRecencyResult {
  const details: string[] = [];
  const now = Date.now();

  if (!articles || articles.length === 0) {
    return { score: 7, avgAgeHours: 0, freshCount: 0, totalCount: 0,
             level: 'unknown', details: ['No articles to assess recency (7/15 pts)'] };
  }

  let totalAgeHours = 0;
  let freshCount = 0;  // < 24 hours
  let recentCount = 0; // < 72 hours
  const total = articles.length;

  for (const a of articles) {
    let ageHours: number;
    try {
      const articleTime = new Date(a.time).getTime();
      if (isNaN(articleTime)) {
        ageHours = 72; // Default for unparseable dates
      } else {
        ageHours = (now - articleTime) / (1000 * 60 * 60);
      }
    } catch {
      ageHours = 72;
    }

    totalAgeHours += Math.max(0, ageHours);
    if (ageHours <= 24) freshCount++;
    if (ageHours <= 72) recentCount++;
  }

  const avgAgeHours = total / totalAgeHours > 0 ? totalAgeHours / total : 72;
  const freshPct = freshCount / total;

  let score: number;
  let level: NewsRecencyResult['level'];

  if (freshPct >= 0.8) {
    score = 14;
    level = 'breaking';
    details.push(`✓ ${freshCount}/${total} articles <24h old — Breaking news flow (14/15 pts)`);
  } else if (freshPct >= 0.5) {
    score = 12;
    level = 'recent';
    details.push(`✓ ${freshCount}/${total} articles <24h — Recent news (12/15 pts)`);
  } else if (freshPct >= 0.3 && avgAgeHours < 72) {
    score = 9;
    level = 'recent';
    details.push(`⚠ Mostly recent: avg ${avgAgeHours.toFixed(0)}h old (9/15 pts)`);
  } else if (avgAgeHours < 168) {
    score = 6;
    level = 'aging';
    details.push(`⚠ News aging: avg ${avgAgeHours.toFixed(0)}h old (6/15 pts)`);
  } else {
    score = 2;
    level = 'stale';
    details.push(`✗ Stale news: avg ${(avgAgeHours / 24).toFixed(1)}d old (2/15 pts)`);
  }

  score = Math.min(15, Math.max(0, score));
  logger.info(`News Recency Score: ${score}/15 (${level})`);

  return { score, avgAgeHours: Math.round(avgAgeHours * 10) / 10, freshCount, totalCount: total,
           level, details };
}
