/**
 * Sentiment Polarity Scoring (0-35 points)
 *
 * Keyword-based NLP analysis of news headlines.
 * Bullish = positive market sentiment, Bearish = negative.
 * Higher score = more bullish tilt.
 */
import logger from '../../../../config/logger';

export interface SentimentResult {
  score: number;
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  sentiment: 'bullish' | 'bearish' | 'neutral' | 'unknown';
  topKeywords: string[];
  details: string[];
}

const BULLISH_KEYWORDS = [
  'profit', 'growth', 'rise', 'surge', 'jump', 'rally', 'record',
  'expansion', 'upgrade', 'beat', 'outperform', 'dividend', 'buyback',
  'partnership', 'launch', 'approval', 'order', 'contract', 'positive',
  'strong', 'boost', 'gain', 'high', 'breakout', 'momentum', 'bull',
  'acquisition', 'merger', 'ipo', 'listing', 'investment', 'expansion',
];

const BEARISH_KEYWORDS = [
  'loss', 'decline', 'fall', 'drop', 'crash', 'plunge', 'crisis',
  'downgrade', 'miss', 'underperform', 'debt', 'default', 'lawsuit',
  'penalty', 'fine', 'investigation', 'fraud', 'scam', 'warning',
  'weak', 'cut', 'layoff', 'restructuring', 'volatility', 'risk',
  'sell', 'bear', 'correction', 'slowdown', 'recession', 'concern',
  'delisting', 'suspension', 'probe', 'raid', 'crackdown',
];

function analyzeHeadline(headline: string): 'bullish' | 'bearish' | 'neutral' {
  const lower = headline.toLowerCase();
  let bullishHits = 0;
  let bearishHits = 0;

  for (const kw of BULLISH_KEYWORDS) {
    if (lower.includes(kw)) bullishHits++;
  }
  for (const kw of BEARISH_KEYWORDS) {
    if (lower.includes(kw)) bearishHits++;
  }

  if (bullishHits > bearishHits) return 'bullish';
  if (bearishHits > bullishHits) return 'bearish';
  return 'neutral';
}

function findTopKeywords(headlines: string[]): string[] {
  const hits = new Map<string, number>();
  for (const h of headlines) {
    const lower = h.toLowerCase();
    for (const kw of [...BULLISH_KEYWORDS, ...BEARISH_KEYWORDS]) {
      if (lower.includes(kw)) hits.set(kw, (hits.get(kw) ?? 0) + 1);
    }
  }
  return [...hits.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([kw]) => kw);
}

export function scoreSentiment(articles: { headline: string }[]): SentimentResult {
  const details: string[] = [];

  if (!articles || articles.length === 0) {
    details.push('No articles to analyze sentiment (17/35 pts — default)');
    return { score: 17, bullishCount: 0, bearishCount: 0, neutralCount: 0,
             sentiment: 'unknown', topKeywords: [], details };
  }

  const headlines = articles.map(a => a.headline);
  let bullishCount = 0, bearishCount = 0, neutralCount = 0;

  for (const h of headlines) {
    const sent = analyzeHeadline(h);
    if (sent === 'bullish') bullishCount++;
    else if (sent === 'bearish') bearishCount++;
    else neutralCount++;
  }

  const total = headlines.length;
  const bullishPct = bullishCount / total;
  const bearishPct = bearishCount / total;

  let score: number;
  let sentiment: SentimentResult['sentiment'];

  if (bullishPct >= 0.6) {
    score = 32;
    sentiment = 'bullish';
    details.push(`✓ Strong bullish sentiment: ${bullishCount}/${total} bullish (32/35 pts)`);
  } else if (bullishPct >= 0.4) {
    score = 26;
    sentiment = 'bullish';
    details.push(`✓ Bullish tilt: ${bullishCount}/${total} bullish, ${bearishCount}/${total} bearish (26/35 pts)`);
  } else if (bearishPct >= 0.6) {
    score = 5;
    sentiment = 'bearish';
    details.push(`✗ Strong bearish sentiment: ${bearishCount}/${total} bearish (5/35 pts)`);
  } else if (bearishPct >= 0.4) {
    score = 10;
    sentiment = 'bearish';
    details.push(`✗ Bearish tilt: ${bearishCount}/${total} bearish, ${bullishCount}/${total} bullish (10/35 pts)`);
  } else {
    score = 18;
    sentiment = 'neutral';
    details.push(`⚠ Mixed/neutral sentiment (18/35 pts)`);
  }

  const topKeywords = findTopKeywords(headlines);
  if (topKeywords.length > 0) {
    details.push(`Top keywords: ${topKeywords.join(', ')}`);
  }

  score = Math.min(35, Math.max(0, score));
  logger.info(`Sentiment Score: ${score}/35 (${sentiment})`);

  return { score, bullishCount, bearishCount, neutralCount, sentiment, topKeywords, details };
}
