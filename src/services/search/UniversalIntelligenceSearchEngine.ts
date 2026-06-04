/**
 * Universal Intelligence Search Engine
 * Central Navigation System
 * 
 * Allows users to instantly search the entire platform ecosystem:
 * - stocks
 * - companies
 * - sectors
 * - founders
 * - CEOs
 * - macro themes
 * - institutional trends
 * - scanners
 * - Healthometer states
 * - educational topics
 * - market events
 * - historical environments
 */

import {
  SearchResult,
  SearchResultType,
  SearchQuery,
  SearchFilters
} from '../../types/SearchTypes';

class UniversalIntelligenceSearchEngine {
  private searchIndex: Map<string, SearchResult[]> = new Map();
  private isIndexing: boolean = false;
  private holographicIntensity: number = 0.5;

  /**
   * Initialize search index
   */
  async initializeIndex(data: SearchResult[]): Promise<void> {
    this.isIndexing = true;
    
    // Clear existing index
    this.searchIndex.clear();
    
    // Index by type
    for (const item of data) {
      const typeKey = item.type;
      if (!this.searchIndex.has(typeKey)) {
        this.searchIndex.set(typeKey, []);
      }
      this.searchIndex.get(typeKey)!.push(item);
    }
    
    this.isIndexing = false;
  }

  /**
   * Check if indexing
   */
  isCurrentlyIndexing(): boolean {
    return this.isIndexing;
  }

  /**
   * Search across all ecosystems
   */
  search(query: SearchQuery): SearchResult[] {
    const results: SearchResult[] = [];
    
    // If type specified, search only that type
    if (query.type) {
      const typeResults = this.searchIndex.get(query.type) || [];
      results.push(...this.filterResults(typeResults, query));
    } else {
      // Search all types
      for (const [type, items] of this.searchIndex) {
        results.push(...this.filterResults(items, query));
      }
    }
    
    // Sort by confidence
    results.sort((a, b) => b.confidence - a.confidence);
    
    // Apply limit and offset
    const offset = query.offset || 0;
    const limit = query.limit || 20;
    
    return results.slice(offset, offset + limit);
  }

  /**
   * Filter results based on query and filters
   */
  private filterResults(items: SearchResult[], query: SearchQuery): SearchResult[] {
    let filtered = items;
    
    // Text search
    if (query.query) {
      const searchTerms = query.query.toLowerCase().split(' ');
      filtered = filtered.filter(item => {
        const title = item.title.toLowerCase();
        const subtitle = item.subtitle.toLowerCase();
        const description = item.description.toLowerCase();
        
        return searchTerms.some(term => 
          title.includes(term) || 
          subtitle.includes(term) || 
          description.includes(term)
        );
      });
    }
    
    // Apply filters
    if (query.filters) {
      filtered = this.applyFilters(filtered, query.filters);
    }
    
    return filtered;
  }

  /**
   * Apply filters to results
   */
  private applyFilters(items: SearchResult[], filters: SearchFilters): SearchResult[] {
    let filtered = items;
    
    if (filters.sector) {
      filtered = filtered.filter(item => 
        item.metadata.sector === filters.sector
      );
    }
    
    if (filters.theme) {
      filtered = filtered.filter(item => 
        item.metadata.theme === filters.theme
      );
    }
    
    if (filters.healthometerRange) {
      const [min, max] = filters.healthometerRange;
      filtered = filtered.filter(item => 
        item.telemetry.healthometerScore !== undefined &&
        item.telemetry.healthometerScore >= min &&
        item.telemetry.healthometerScore <= max
      );
    }
    
    if (filters.volatilityRange) {
      const [min, max] = filters.volatilityRange;
      filtered = filtered.filter(item => 
        item.telemetry.volatility !== undefined &&
        item.telemetry.volatility >= min &&
        item.telemetry.volatility <= max
      );
    }
    
    if (filters.institutionalConfidence !== undefined) {
      filtered = filtered.filter(item => 
        item.telemetry.institutionalConfidence !== undefined &&
        item.telemetry.institutionalConfidence >= filters.institutionalConfidence!
      );
    }
    
    return filtered;
  }

  /**
   * Get search suggestions
   */
  getSuggestions(query: string, limit: number = 5): SearchResult[] {
    const allResults: SearchResult[] = [];
    
    for (const items of this.searchIndex.values()) {
      allResults.push(...items);
    }
    
    const filtered = this.filterResults(allResults, { query });
    filtered.sort((a, b) => b.confidence - a.confidence);
    
    return filtered.slice(0, limit);
  }

  /**
   * Add item to search index
   */
  addToIndex(item: SearchResult): void {
    const typeKey = item.type;
    if (!this.searchIndex.has(typeKey)) {
      this.searchIndex.set(typeKey, []);
    }
    this.searchIndex.get(typeKey)!.push(item);
  }

  /**
   * Remove item from search index
   */
  removeFromIndex(id: string): void {
    for (const items of this.searchIndex.values()) {
      const index = items.findIndex(item => item.id === id);
      if (index !== -1) {
        items.splice(index, 1);
      }
    }
  }

  /**
   * Update item in search index
   */
  updateInIndex(item: SearchResult): void {
    this.removeFromIndex(item.id);
    this.addToIndex(item);
  }

  /**
   * Get index statistics
   */
  getIndexStatistics(): {
    totalItems: number;
    itemsByType: Record<string, number>;
    isIndexing: boolean;
  } {
    const itemsByType: Record<string, number> = {};
    let totalItems = 0;
    
    for (const [type, items] of this.searchIndex) {
      itemsByType[type] = items.length;
      totalItems += items.length;
    }
    
    return {
      totalItems,
      itemsByType,
      isIndexing: this.isIndexing
    };
  }

  /**
   * Set holographic intensity
   */
  setHolographicIntensity(intensity: number): void {
    this.holographicIntensity = Math.max(0, Math.min(1, intensity));
  }

  /**
   * Get holographic intensity
   */
  getHolographicIntensity(): number {
    return this.holographicIntensity;
  }

  /**
   * Clear search index
   */
  clearIndex(): void {
    this.searchIndex.clear();
  }

  /**
   * Reset to default state
   */
  resetToDefault(): void {
    this.clearIndex();
    this.holographicIntensity = 0.5;
  }
}

// Singleton instance
export const universalIntelligenceSearchEngine = new UniversalIntelligenceSearchEngine();
