import { dbAdapter } from '../../db/DatabaseAdapter.js';
import { buildEarningsNarrativeEngineOutput } from '../earnings/earningsNarrativeEngine.js';

export interface EarningsCalendarEntry {
  symbol: string;
  eventType: 'earnings';
  estimatedDate: string;
  availability: 'derived';
  rationale: string;
}

export interface SentimentHeadline {
  headline: string;
  source: string | null;
  publishedAt: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface SentimentSummary {
  symbol: string;
  availability: 'real' | 'unavailable';
  methodology: 'headline_lexicon';
  score: number | null;
  sentiment: 'positive' | 'negative' | 'neutral' | 'unavailable';
  headlineCount: number;
  headlines: SentimentHeadline[];
}

const POSITIVE_TERMS = ['beat', 'growth', 'upside', 'expansion', 'win', 'approval', 'profit', 'record', 'surge', 'strong'];
const NEGATIVE_TERMS = ['miss', 'downgrade', 'decline', 'fall', 'weak', 'probe', 'loss', 'cut', 'drop', 'pressure'];

function classifyHeadlineSentiment(text: string): 'positive' | 'negative' | 'neutral' {
  const normalized = text.toLowerCase();
  const positiveHits = POSITIVE_TERMS.filter((term) => normalized.includes(term)).length;
  const negativeHits = NEGATIVE_TERMS.filter((term) => normalized.includes(term)).length;
  if (positiveHits > negativeHits) return 'positive';
  if (negativeHits > positiveHits) return 'negative';
  return 'neutral';
}

function computeSummaryScore(items: SentimentHeadline[]): number | null {
  if (items.length === 0) return null;
  const total = items.reduce((sum, item) => {
    if (item.sentiment === 'positive') return sum + 1;
    if (item.sentiment === 'negative') return sum - 1;
    return sum;
  }, 0);
  return Math.round((total / items.length) * 100) / 100;
}

function estimateNextQuarterDate(now = new Date()): Date {
  return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
}

export class EarningsSentimentService {
  buildEstimatedEarningsCalendar(symbols: string[]): EarningsCalendarEntry[] {
    const next = estimateNextQuarterDate();
    return symbols
      .map((symbol) => symbol.trim().toUpperCase())
      .filter(Boolean)
      .map((symbol) => ({
        symbol,
        eventType: 'earnings' as const,
        estimatedDate: next.toISOString(),
        availability: 'derived' as const,
        rationale: 'Estimated using a generic quarterly cadence because a source-backed earnings calendar is not yet integrated.',
      }));
  }

  async summarizeHeadlineSentiment(symbol: string): Promise<SentimentSummary> {
    const normalized = symbol.trim().toUpperCase();
    const result = await dbAdapter.query(
      `SELECT headline_text, source_origin, published_epoch
       FROM asset_news_sentiment_stream
       WHERE ticker LIKE $1
       ORDER BY published_epoch DESC
       LIMIT 10`,
      [`${normalized}%`],
    );

    const headlines = (result.rows ?? []).map((row) => ({
      headline: String(row.headline_text ?? ''),
      source: row.source_origin ? String(row.source_origin) : null,
      publishedAt: new Date(Number(row.published_epoch) * 1000).toISOString(),
      sentiment: classifyHeadlineSentiment(String(row.headline_text ?? '')),
    })) satisfies SentimentHeadline[];

    const score = computeSummaryScore(headlines);
    const sentiment = score === null ? 'unavailable' : score > 0.15 ? 'positive' : score < -0.15 ? 'negative' : 'neutral';

    return {
      symbol: normalized,
      availability: headlines.length > 0 ? 'real' : 'unavailable',
      methodology: 'headline_lexicon',
      score,
      sentiment,
      headlineCount: headlines.length,
      headlines,
    };
  }

  buildEarningsNarrativePreview(symbol: string, sentiment: SentimentSummary) {
    const narrative = buildEarningsNarrativeEngineOutput({
      confidenceState: sentiment.sentiment === 'negative'
        ? 'ELEVATED_RISK'
        : sentiment.sentiment === 'positive'
          ? 'CONFIDENCE_RISING'
          : 'NEUTRAL_ENVIRONMENT',
      financial: {},
      management: {
        summary: `${symbol} headline flow currently reads ${sentiment.sentiment === 'unavailable' ? 'unavailable' : sentiment.sentiment}.`,
      },
      institutional: {},
      narrativeKey: sentiment.headlineCount || 1,
    });
    return {
      ...narrative,
      executiveNarrative: `${symbol}: ${narrative.executiveNarrative}`,
    };
  }
}

export const earningsSentimentService = new EarningsSentimentService();
