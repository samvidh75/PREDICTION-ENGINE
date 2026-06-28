/**
 * News Deduper
 *
 * Deduplicates news stories by normalized title hash and time window.
 * Prevents duplicate alert spam and redundant processing.
 */

import type { NewsDedupResult, NewsItem } from './NewsQualityTypes';

/** Normalize a title for deduplication comparison */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Simple hash of a normalized string */
function titleHash(normalized: string): string {
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) - hash) + normalized.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

interface DedupEntry {
  hash: string;
  newsId: string;
  publishedAt: string;
}

export class NewsDeduper {
  private entries: DedupEntry[] = [];
  private symbolEntries: Map<string, DedupEntry[]> = new Map();
  private maxAgeDays: number;

  constructor(maxAgeDays: number = 7) {
    this.maxAgeDays = maxAgeDays;
  }

  /** Set the deduplication time window */
  setMaxAgeDays(days: number): void {
    this.maxAgeDays = days;
  }

  /** Check if a news item is a duplicate within the time window */
  check(news: NewsItem): NewsDedupResult {
    const normalized = normalizeTitle(news.title);
    const hash = titleHash(normalized);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.maxAgeDays);

    // Check all entries for a match
    for (const entry of this.entries) {
      if (entry.hash === hash) {
        const entryDate = new Date(entry.publishedAt);
        if (entryDate >= cutoff) {
          return {
            originalId: entry.newsId,
            duplicateIds: [news.id],
            deduplicated: true,
            canonicalId: entry.newsId,
          };
        }
      }
    }

    return {
      originalId: news.id,
      duplicateIds: [],
      deduplicated: false,
      canonicalId: news.id,
    };
  }

  /** Register a news item in the dedup index */
  register(news: NewsItem): void {
    const normalized = normalizeTitle(news.title);
    const hash = titleHash(normalized);
    const entry: DedupEntry = { hash, newsId: news.id, publishedAt: news.publishedAt };
    this.entries.push(entry);

    for (const sym of news.symbols) {
      const symEntries = this.symbolEntries.get(sym) ?? [];
      symEntries.push(entry);
      this.symbolEntries.set(sym, symEntries);
    }

    // Prune old entries
    this.prune();
  }

  /** Register multiple news items */
  registerMany(newsItems: NewsItem[]): void {
    for (const item of newsItems) this.register(item);
  }

  /** Check and register in one step */
  checkAndRegister(news: NewsItem): NewsDedupResult {
    const result = this.check(news);
    if (!result.deduplicated) {
      this.register(news);
    }
    return result;
  }

  /** Remove entries older than maxAgeDays */
  prune(): void {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.maxAgeDays);
    const cutoffStr = cutoff.toISOString();

    this.entries = this.entries.filter(e => e.publishedAt >= cutoffStr);
    for (const [sym, entries] of this.symbolEntries.entries()) {
      const filtered = entries.filter(e => e.publishedAt >= cutoffStr);
      if (filtered.length > 0) {
        this.symbolEntries.set(sym, filtered);
      } else {
        this.symbolEntries.delete(sym);
      }
    }
  }

  /** Clear all dedup entries */
  clear(): void {
    this.entries = [];
    this.symbolEntries.clear();
  }

  /** Get stats */
  getStats(): { totalEntries: number; symbolsTracked: number } {
    return {
      totalEntries: this.entries.length,
      symbolsTracked: this.symbolEntries.size,
    };
  }
}

export const newsDeduper = new NewsDeduper();
