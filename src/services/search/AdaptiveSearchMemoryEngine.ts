/**
 * Adaptive Search Memory Engine
 * Personal Intelligence Continuity
 * 
 * Remembers relevant exploration patterns intelligently:
 * - sectors explored
 * - company interest patterns
 * - macro themes
 * - preferred telemetry environments
 * - educational progress
 */

import {
  SearchMemoryEntry,
  SearchResultType
} from '../../types/SearchTypes';

class AdaptiveSearchMemoryEngine {
  private memoryEntries: SearchMemoryEntry[] = [];
  private holographicIntensity: number = 0.5;

  /**
   * Add search to memory
   */
  addToMemory(query: string, resultType: SearchResultType): void {
    const existingEntry = this.memoryEntries.find(entry => entry.query === query);
    
    if (existingEntry) {
      existingEntry.frequency++;
      existingEntry.lastAccessed = Date.now();
    } else {
      this.memoryEntries.push({
        id: this.generateId(),
        query,
        resultType,
        timestamp: Date.now(),
        frequency: 1,
        lastAccessed: Date.now()
      });
    }
    
    // Keep only last 100 entries
    if (this.memoryEntries.length > 100) {
      this.memoryEntries = this.memoryEntries.slice(-100);
    }
  }

  /**
   * Get memory entries
   */
  getMemoryEntries(): SearchMemoryEntry[] {
    return [...this.memoryEntries];
  }

  /**
   * Get recent searches
   */
  getRecentSearches(limit: number = 10): SearchMemoryEntry[] {
    return this.memoryEntries
      .sort((a, b) => b.lastAccessed - a.lastAccessed)
      .slice(0, limit);
  }

  /**
   * Get frequent searches
   */
  getFrequentSearches(limit: number = 10): SearchMemoryEntry[] {
    return this.memoryEntries
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit);
  }

  /**
   * Get searches by type
   */
  getSearchesByType(type: SearchResultType): SearchMemoryEntry[] {
    return this.memoryEntries.filter(entry => entry.resultType === type);
  }

  /**
   * Get sector exploration patterns
   */
  getSectorExplorationPatterns(): Array<{
    sector: string;
    frequency: number;
    lastExplored: number;
  }> {
    const patterns: Map<string, { frequency: number; lastExplored: number }> = new Map();

    for (const entry of this.memoryEntries) {
      // Extract sector from query (simplified)
      const sector = this.extractSectorFromQuery(entry.query);
      if (sector) {
        const existing = patterns.get(sector);
        if (existing) {
          existing.frequency++;
          existing.lastExplored = Math.max(existing.lastExplored, entry.lastAccessed);
        } else {
          patterns.set(sector, {
            frequency: 1,
            lastExplored: entry.lastAccessed
          });
        }
      }
    }

    return Array.from(patterns.entries()).map(([sector, data]) => ({
      sector,
      frequency: data.frequency,
      lastExplored: data.lastExplored
    })).sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Get company interest patterns
   */
  getCompanyInterestPatterns(): Array<{
    company: string;
    frequency: number;
    lastAccessed: number;
  }> {
    const patterns: Map<string, { frequency: number; lastAccessed: number }> = new Map();

    for (const entry of this.memoryEntries) {
      if (entry.resultType === SearchResultType.COMPANY || entry.resultType === SearchResultType.STOCK) {
        const existing = patterns.get(entry.query);
        if (existing) {
          existing.frequency++;
          existing.lastAccessed = Math.max(existing.lastAccessed, entry.lastAccessed);
        } else {
          patterns.set(entry.query, {
            frequency: 1,
            lastAccessed: entry.lastAccessed
          });
        }
      }
    }

    return Array.from(patterns.entries()).map(([company, data]) => ({
      company,
      frequency: data.frequency,
      lastAccessed: data.lastAccessed
    })).sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Get macro theme patterns
   */
  getMacroThemePatterns(): Array<{
    theme: string;
    frequency: number;
    lastExplored: number;
  }> {
    const patterns: Map<string, { frequency: number; lastExplored: number }> = new Map();

    for (const entry of this.memoryEntries) {
      if (entry.resultType === SearchResultType.MACRO_THEME) {
        const existing = patterns.get(entry.query);
        if (existing) {
          existing.frequency++;
          existing.lastExplored = Math.max(existing.lastExplored, entry.lastAccessed);
        } else {
          patterns.set(entry.query, {
            frequency: 1,
            lastExplored: entry.lastAccessed
          });
        }
      }
    }

    return Array.from(patterns.entries()).map(([theme, data]) => ({
      theme,
      frequency: data.frequency,
      lastExplored: data.lastExplored
    })).sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Get preferred telemetry environments
   */
  getPreferredTelemetryEnvironments(): Array<{
    environment: string;
    frequency: number;
  }> {
    // This would track which telemetry environments the user prefers
    // For now, return empty array as placeholder
    return [];
  }

  /**
   * Get educational progress
   */
  getEducationalProgress(): Array<{
    topic: string;
    progress: number;
    lastAccessed: number;
  }> {
    const progress: Map<string, { progress: number; lastAccessed: number }> = new Map();

    for (const entry of this.memoryEntries) {
      if (entry.resultType === SearchResultType.EDUCATIONAL_TOPIC) {
        const existing = progress.get(entry.query);
        if (existing) {
          existing.progress = Math.min(1, existing.progress + 0.1);
          existing.lastAccessed = Math.max(existing.lastAccessed, entry.lastAccessed);
        } else {
          progress.set(entry.query, {
            progress: 0.1,
            lastAccessed: entry.lastAccessed
          });
        }
      }
    }

    return Array.from(progress.entries()).map(([topic, data]) => ({
      topic,
      progress: data.progress,
      lastAccessed: data.lastAccessed
    })).sort((a, b) => b.progress - a.progress);
  }

  /**
   * Generate memory-based suggestions
   */
  generateMemoryBasedSuggestions(query: string): string[] {
    const suggestions: string[] = [];
    const lowerQuery = query.toLowerCase();

    for (const entry of this.memoryEntries) {
      if (entry.query.toLowerCase().includes(lowerQuery) || 
          lowerQuery.includes(entry.query.toLowerCase())) {
        suggestions.push(entry.query);
      }
    }

    return suggestions.slice(0, 5);
  }

  /**
   * Clear old entries
   */
  clearOldEntries(daysOld: number = 30): void {
    const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    this.memoryEntries = this.memoryEntries.filter(entry => entry.lastAccessed > cutoff);
  }

  /**
   * Clear all memory
   */
  clearAllMemory(): void {
    this.memoryEntries = [];
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
   * Extract sector from query
   */
  private extractSectorFromQuery(query: string): string | null {
    const sectors = ['Banking', 'IT Services', 'FMCG', 'Pharmaceuticals', 'Automobile', 'Telecom', 'Infrastructure', 'Energy'];
    const lowerQuery = query.toLowerCase();

    for (const sector of sectors) {
      if (lowerQuery.includes(sector.toLowerCase())) {
        return sector;
      }
    }

    return null;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Reset to default state
   */
  resetToDefault(): void {
    this.clearAllMemory();
    this.holographicIntensity = 0.5;
  }
}

// Singleton instance
export const adaptiveSearchMemoryEngine = new AdaptiveSearchMemoryEngine();
