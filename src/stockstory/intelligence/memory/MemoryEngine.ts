/**
 * Research Memory Engine
 *
 * Persists research decisions, signals, theses, and observations
 * for later retrieval. Builds a queryable research history per stock.
 *
 * No fake performance data — only research artifacts.
 */

import type { IntelligenceInput } from '../../types';

export interface ResearchMemoryEntry {
  id: string;
  symbol: string;
  timestamp: string;
  category: MemoryCategory;
  data: Record<string, unknown>;
  tags: string[];
}

export type MemoryCategory =
  'signal_generated' | 'thesis_created' | 'thesis_updated' |
  'catalyst_detected' | 'risk_flagged' | 'observation_added' |
  'engine_run' | 'user_note';

export interface ResearchMemoryReport {
  symbol: string;
  generatedAt: string;
  entries: ResearchMemoryEntry[];
  entryCount: number;
  categoriesPresent: MemoryCategory[];
  dateRange: { earliest: string | null; latest: string | null };
  queryableTags: string[];
  summary: string;
}

export interface MemoryQuery {
  symbol?: string;
  category?: MemoryCategory;
  tag?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
}

export class MemoryEngine {
  private store: ResearchMemoryEntry[] = [];

  /**
   * Record a memory entry
   */
  record(
    symbol: string,
    category: MemoryCategory,
    data: Record<string, unknown>,
    tags: string[] = [],
  ): ResearchMemoryEntry {
    const entry: ResearchMemoryEntry = {
      id: `mem_${symbol}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      symbol,
      timestamp: new Date().toISOString(),
      category,
      data,
      tags,
    };
    this.store.push(entry);
    return entry;
  }

  /**
   * Record an engine run with its output
   */
  recordEngineRun(symbol: string, engineName: string, output: Record<string, unknown>): ResearchMemoryEntry {
    return this.record(symbol, 'engine_run', {
      engine: engineName,
      output,
    }, [engineName, 'engine_run']);
  }

  /**
   * Record a signal
   */
  recordSignal(symbol: string, signalId: string, signalData: Record<string, unknown>): ResearchMemoryEntry {
    return this.record(symbol, 'signal_generated', {
      signalId,
      ...signalData,
    }, [signalId, 'signal']);
  }

  /**
   * Record a thesis state change
   */
  recordThesisUpdate(symbol: string, thesisId: string, oldState: string, newState: string): ResearchMemoryEntry {
    return this.record(symbol, 'thesis_updated', {
      thesisId,
      oldState,
      newState,
    }, ['thesis', oldState, newState]);
  }

  /**
   * Query memory by criteria
   */
  query(q: MemoryQuery): ResearchMemoryEntry[] {
    let results = [...this.store];

    if (q.symbol) results = results.filter(e => e.symbol === q.symbol);
    if (q.category) results = results.filter(e => e.category === q.category);
    if (q.tag) results = results.filter(e => e.tags.includes(q.tag));
    if (q.fromDate) results = results.filter(e => e.timestamp >= q.fromDate!);
    if (q.toDate) results = results.filter(e => e.timestamp <= q.toDate!);

    results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    if (q.limit) results = results.slice(0, q.limit);
    return results;
  }

  /**
   * Get all entries for a symbol
   */
  getForSymbol(symbol: string, limit = 50): ResearchMemoryEntry[] {
    return this.query({ symbol, limit });
  }

  /**
   * Get the latest entry of each category for a symbol
   */
  getLatestByCategory(symbol: string): Map<MemoryCategory, ResearchMemoryEntry | null> {
    const map = new Map<MemoryCategory, ResearchMemoryEntry | null>();
    const categories: MemoryCategory[] = [
      'signal_generated', 'thesis_created', 'thesis_updated',
      'catalyst_detected', 'risk_flagged', 'observation_added',
      'engine_run', 'user_note',
    ];

    for (const cat of categories) {
      const entries = this.query({ symbol, category: cat, limit: 1 });
      map.set(cat, entries[0] ?? null);
    }

    return map;
  }

  /**
   * Build a memory report for a symbol
   */
  buildReport(symbol: string): ResearchMemoryReport {
    const entries = this.getForSymbol(symbol);
    const categories = [...new Set(entries.map(e => e.category))] as MemoryCategory[];
    const tags = [...new Set(entries.flatMap(e => e.tags))];

    const timestamps = entries.map(e => e.timestamp).sort();

    return {
      symbol,
      generatedAt: new Date().toISOString(),
      entries: entries.slice(0, 100),
      entryCount: entries.length,
      categoriesPresent: categories,
      dateRange: {
        earliest: timestamps[0] ?? null,
        latest: timestamps[timestamps.length - 1] ?? null,
      },
      queryableTags: tags.slice(0, 50),
      summary: `${entries.length} research memory entries for ${symbol} across ${categories.length} categories.`,
    };
  }

  /**
   * Clear memory for a symbol (useful for testing)
   */
  clearForSymbol(symbol: string): number {
    const before = this.store.length;
    this.store = this.store.filter(e => e.symbol !== symbol);
    return before - this.store.length;
  }

  /**
   * Clear all memory
   */
  clearAll(): number {
    const count = this.store.length;
    this.store = [];
    return count;
  }

  /**
   * Get total memory size
   */
  get size(): number {
    return this.store.length;
  }
}

export const memoryEngine = new MemoryEngine();
