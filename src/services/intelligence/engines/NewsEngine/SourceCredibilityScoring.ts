/**
 * Source Credibility Scoring (0-20 points)
 *
 * Higher scores for reputable financial news sources.
 * Lower scores for unknown or low-quality sources.
 */
import logger from '../../../../config/logger';

export interface SourceCredibilityResult {
  score: number;
  credibleCount: number;
  totalCount: number;
  level: 'high_quality' | 'mixed' | 'low_quality' | 'unknown';
  details: string[];
}

const HIGH_CREDIBILITY_SOURCES = [
  'reuters', 'bloomberg', 'economic times', 'mint', 'business standard',
  'moneycontrol', 'cnbc', 'livemint', 'financial express', 'business line',
  'ndtv profit', 'zee business', 'et now', 'bq prime', 'morgan stanley',
  'jp morgan', 'goldman sachs', 'credit suisse', 'nomura', 'clsa',
  'motilal oswal', 'icici direct', 'hdfc securities', 'kotak securities',
  'crisil', 'icra', 'care ratings', 'india ratings',
];

const MEDIUM_CREDIBILITY_SOURCES = [
  'yahoo', 'google', 'msn', 'indiatimes', 'times of india', 'the hindu',
  'indian express', 'firstpost', 'news18', 'abp', 'republic', 'times now',
  'investing.com', 'tradingview', 'screener', 'ticker tape',
];

function classifySource(source: string): 'high' | 'medium' | 'low' {
  const lower = source.toLowerCase().trim();

  for (const cred of HIGH_CREDIBILITY_SOURCES) {
    if (lower.includes(cred)) return 'high';
  }
  for (const cred of MEDIUM_CREDIBILITY_SOURCES) {
    if (lower.includes(cred)) return 'medium';
  }
  return 'low';
}

export function scoreSourceCredibility(
  articles: { headline: string; source: string }[]
): SourceCredibilityResult {
  const details: string[] = [];

  if (!articles || articles.length === 0) {
    return { score: 10, credibleCount: 0, totalCount: 0,
             level: 'unknown', details: ['No articles to assess source quality (10/20 pts)'] };
  }

  const total = articles.length;
  let highCount = 0, mediumCount = 0;

  for (const a of articles) {
    const cls = classifySource(a.source);
    if (cls === 'high') highCount++;
    else if (cls === 'medium') mediumCount++;
  }

  const credibleCount = highCount + mediumCount;
  const highPct = highCount / total;
  const crediblePct = credibleCount / total;

  let score: number;
  let level: SourceCredibilityResult['level'];

  if (highPct >= 0.6) {
    score = 18;
    level = 'high_quality';
    details.push(`✓ ${highCount}/${total} from top-tier sources (18/20 pts)`);
  } else if (crediblePct >= 0.6) {
    score = 14;
    level = 'high_quality';
    details.push(`✓ ${credibleCount}/${total} from credible sources (14/20 pts)`);
  } else if (crediblePct >= 0.4) {
    score = 10;
    level = 'mixed';
    details.push(`⚠ Mixed source quality: ${credibleCount}/${total} credible (10/20 pts)`);
  } else if (crediblePct > 0) {
    score = 6;
    level = 'low_quality';
    details.push(`⚠ Mostly lower-tier sources (6/20 pts)`);
  } else {
    score = 3;
    level = 'low_quality';
    details.push('✗ No recognized credible sources (3/20 pts)');
  }

  score = Math.min(20, Math.max(0, score));
  logger.info(`Source Credibility Score: ${score}/20 (${level})`);

  return { score, credibleCount: highCount, totalCount: total, level, details };
}
