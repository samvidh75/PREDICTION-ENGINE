/**
 * News Quality Scorer
 *
 * Scores news source quality internally (0–1) based on source category.
 * Never exposes provider/source names in public output.
 */

import type { NewsSourceQuality, NewsQualityScore } from './NewsQualityTypes';

/** Internal mapping of source IDs to quality tiers. Never exposed publicly. */
const SOURCE_QUALITY_MAP: Record<string, { quality: NewsSourceQuality; score: number }> = {
  'nse-official': { quality: 'official_exchange', score: 1.0 },
  'bse-official': { quality: 'official_exchange', score: 1.0 },
  'bse-corp-announcements': { quality: 'official_exchange', score: 1.0 },
  'nse-corp-announcements': { quality: 'official_exchange', score: 1.0 },
  'sec-edgar': { quality: 'regulated', score: 0.95 },
  'stockedge': { quality: 'reputable', score: 0.7 },
  'trendlyne': { quality: 'reputable', score: 0.7 },
  'yahoo-finance': { quality: 'reputable', score: 0.65 },
};

const DEFAULT_QUALITY: { quality: NewsSourceQuality; score: number } = {
  quality: 'unknown',
  score: 0.3,
};

export class NewsQualityScorer {
  private qualityMap: Map<string, { quality: NewsSourceQuality; score: number }>;

  constructor() {
    this.qualityMap = new Map(Object.entries(SOURCE_QUALITY_MAP));
  }

  /** Register or override a source's quality tier */
  registerSource(sourceId: string, quality: NewsSourceQuality, score: number): void {
    this.qualityMap.set(sourceId, { quality, score });
  }

  /** Score a news source by its source ID. Returns 0–1 score. */
  score(sourceId: string): NewsQualityScore {
    const entry = this.qualityMap.get(sourceId) ?? DEFAULT_QUALITY;
    return {
      sourceId,
      quality: entry.quality,
      score: entry.score,
    };
  }

  /** Get the quality tier for a source */
  getQuality(sourceId: string): NewsSourceQuality {
    return this.qualityMap.get(sourceId)?.quality ?? 'unknown';
  }

  /** Get the public-safe quality description for a source */
  getPublicLabel(sourceId: string): string {
    const entry = this.qualityMap.get(sourceId) ?? DEFAULT_QUALITY;
    switch (entry.quality) {
      case 'official_exchange': return 'Exchange Announcement';
      case 'regulated': return 'Regulatory Filing';
      case 'reputable': return 'News Report';
      case 'unknown': return 'News';
      case 'low_quality': return 'News';
    }
  }

  /** Get stats about registered sources */
  getStats(): { totalSources: number; byTier: Record<string, number> } {
    const byTier: Record<string, number> = {};
    for (const entry of this.qualityMap.values()) {
      byTier[entry.quality] = (byTier[entry.quality] ?? 0) + 1;
    }
    return { totalSources: this.qualityMap.size, byTier };
  }
}

export const newsQualityScorer = new NewsQualityScorer();
