/**
 * News Items Mapper
 *
 * Maps raw news/article data to canonical IntelligenceInput.sentiment.
 */

export interface NewsItemRaw {
  title: string;
  source: string;
  url?: string;
  publishedAt: string;
  sentimentScore?: number | null;      // -1 to 1
  relevanceScore?: number | null;      // 0 to 1
  isPositive?: boolean | null;
  categories?: string[];
}

export interface NewsItemsRaw {
  items: NewsItemRaw[];
  asOf?: string;
}

export interface SentimentMapped {
  overallScore: number | null;
  recentHeadlines: number | null;
  avgRecentSentiment: number | null;
  mentionVolume: number | null;
  positiveRatio: number | null;
  negativeRatio: number | null;
  neutralRatio: number | null;
  trending: boolean | null;
  controversyScore: number | null;
  asOf: string | null;
}

export function mapNewsItems(raw: NewsItemsRaw): SentimentMapped {
  const items = raw.items ?? [];

  // Only consider headlines from last 30 days for scoring
  const now = raw.asOf ? new Date(raw.asOf) : new Date();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const recent = items.filter((item) => {
    const age = now.getTime() - new Date(item.publishedAt).getTime();
    return age <= thirtyDaysMs;
  });

  const totalCount = items.length;
  const recentCount = recent.length;

  // Average sentiment from recent headlines
  const sentiments = recent
    .map((i) => toNumber(i.sentimentScore))
    .filter((s): s is number => s !== null);

  const avgSentiment = sentiments.length > 0
    ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length
    : null;

  // Sentiment distribution
  const positive = sentiments.filter((s) => s > 0.1).length;
  const negative = sentiments.filter((s) => s < -0.1).length;
  const neutral = sentiments.length - positive - negative;

  const total = sentiments.length || 1;

  // Controversy: high disagreement or extreme negative outliers
  const controversyScore = computeControversy(sentiments);

  return {
    overallScore: avgSentiment !== null ? clamp(avgSentiment, -1, 1) : null,
    recentHeadlines: recentCount,
    avgRecentSentiment: avgSentiment !== null ? clamp(avgSentiment, -1, 1) : null,
    mentionVolume: totalCount,
    positiveRatio: positive / total,
    negativeRatio: negative / total,
    neutralRatio: neutral / total,
    trending: recentCount >= 5 && avgSentiment !== null && avgSentiment > 0.2,
    controversyScore: clamp(controversyScore, 0, 1),
    asOf: raw.asOf ?? null,
  };
}

function computeControversy(sentiments: number[]): number {
  if (sentiments.length < 3) return 0;
  const mean = sentiments.reduce((a, b) => a + b, 0) / sentiments.length;
  const variance = sentiments.reduce((acc, s) => acc + (s - mean) ** 2, 0) / sentiments.length;
  const stdDev = Math.sqrt(variance);
  // High std dev = high disagreement = controversy
  return Math.min(1, stdDev);
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'boolean') return null;
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
