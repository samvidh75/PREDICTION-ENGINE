/**
 * News Quality Types
 *
 * Types for scoring news source quality, deduplicating news,
 * and matching news to company entities.
 */

export type NewsSourceQuality =
  | 'official_exchange'
  | 'regulated'
  | 'reputable'
  | 'unknown'
  | 'low_quality';

export interface NewsQualityScore {
  sourceId: string;
  quality: NewsSourceQuality;
  score: number; // 0–1
  reason?: string;
}

export interface NewsDedupResult {
  originalId: string;
  duplicateIds: string[];
  deduplicated: boolean;
  canonicalId: string;
}

export interface NewsEntityMatch {
  matchedSymbol: string | null;
  matchedCompanyName: string | null;
  confidence: number; // 0–1
  matchedBy: 'symbol' | 'company_name' | 'alias' | 'isin' | 'none';
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string | null;
  sourceId: string;
  sourceName: string;
  url: string | null;
  publishedAt: string;
  symbols: string[];
  relevanceScore: number;
  qualityScore: number;
  isDuplicate: boolean;
  categories: string[];
}
