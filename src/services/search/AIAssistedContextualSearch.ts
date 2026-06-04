/**
 * AI-Assisted Contextual Search
 * Intelligence Interpretation Layer
 * 
 * Allows natural-language discovery:
 * - "healthy banking stocks"
 * - "companies benefiting from AI"
 * - "defensive sectors"
 * - "strong cash flow businesses"
 * - "high institutional participation"
 */

import {
  SearchResult,
  SearchResultType,
  SearchQuery
} from '../../types/SearchTypes';

class AIAssistedContextualSearch {
  private holographicIntensity: number = 0.5;

  /**
   * Process natural language query
   */
  processNaturalLanguageQuery(query: string): SearchQuery {
    const searchQuery: SearchQuery = {
      query: '',
      filters: {}
    };

    // Extract keywords and filters
    const lowerQuery = query.toLowerCase();

    // Health-related queries
    if (lowerQuery.includes('healthy')) {
      searchQuery.filters!.healthometerRange = [0.7, 1];
    }

    // Sector-related queries
    if (lowerQuery.includes('banking')) {
      searchQuery.filters!.sector = 'Banking';
    } else if (lowerQuery.includes('it') || lowerQuery.includes('technology')) {
      searchQuery.filters!.sector = 'IT Services';
    } else if (lowerQuery.includes('fmcg')) {
      searchQuery.filters!.sector = 'FMCG';
    } else if (lowerQuery.includes('pharmaceutical') || lowerQuery.includes('healthcare')) {
      searchQuery.filters!.sector = 'Pharmaceuticals';
    }

    // Volatility-related queries
    if (lowerQuery.includes('low volatility') || lowerQuery.includes('stable')) {
      searchQuery.filters!.volatilityRange = [0, 0.3];
    } else if (lowerQuery.includes('high volatility')) {
      searchQuery.filters!.volatilityRange = [0.7, 1];
    }

    // Institutional participation queries
    if (lowerQuery.includes('high institutional') || lowerQuery.includes('strong institutional')) {
      searchQuery.filters!.institutionalConfidence = 0.7;
    }

    // AI-related queries
    if (lowerQuery.includes('ai') || lowerQuery.includes('artificial intelligence')) {
      searchQuery.filters!.theme = 'AI Infrastructure';
    }

    // Defensive sector queries
    if (lowerQuery.includes('defensive')) {
      searchQuery.filters!.sector = 'FMCG'; // FMCG is typically considered defensive
    }

    // Cash flow queries
    if (lowerQuery.includes('cash flow') || lowerQuery.includes('strong cash flow')) {
      // In a full implementation, this would filter by cash flow metrics
      searchQuery.query = 'cash flow';
    }

    return searchQuery;
  }

  /**
   * Generate query interpretation
   */
  generateQueryInterpretation(query: string): {
    interpretation: string;
    confidence: number;
    appliedFilters: string[];
  } {
    const lowerQuery = query.toLowerCase();
    const appliedFilters: string[] = [];
    let interpretation = '';

    if (lowerQuery.includes('healthy')) {
      appliedFilters.push('Healthometer score > 0.7');
      interpretation += 'Filtering for healthy companies. ';
    }

    if (lowerQuery.includes('banking')) {
      appliedFilters.push('Sector: Banking');
      interpretation += 'Focusing on banking sector. ';
    }

    if (lowerQuery.includes('ai') || lowerQuery.includes('artificial intelligence')) {
      appliedFilters.push('Theme: AI Infrastructure');
      interpretation += 'Including AI-related companies. ';
    }

    if (lowerQuery.includes('low volatility')) {
      appliedFilters.push('Volatility: Low');
      interpretation += 'Filtering for low volatility stocks. ';
    }

    if (lowerQuery.includes('high institutional')) {
      appliedFilters.push('Institutional confidence: High');
      interpretation += 'Prioritising high institutional participation. ';
    }

    if (interpretation === '') {
      interpretation = 'Performing general search across all categories.';
    }

    const confidence = Math.min(1, appliedFilters.length * 0.2);

    return {
      interpretation,
      confidence,
      appliedFilters
    };
  }

  /**
   * Suggest query refinements
   */
  suggestQueryRefinements(query: string): string[] {
    const lowerQuery = query.toLowerCase();
    const refinements: string[] = [];

    if (!lowerQuery.includes('sector')) {
      refinements.push('Add sector filter (e.g., "banking", "IT")');
    }

    if (!lowerQuery.includes('health') && !lowerQuery.includes('healthy')) {
      refinements.push('Filter by health (e.g., "healthy")');
    }

    if (!lowerQuery.includes('volatility')) {
      refinements.push('Specify volatility preference (e.g., "low volatility")');
    }

    if (!lowerQuery.includes('institutional')) {
      refinements.push('Include institutional participation (e.g., "high institutional")');
    }

    return refinements;
  }

  /**
   * Generate contextual suggestions
   */
  generateContextualSuggestions(query: string): string[] {
    const lowerQuery = query.toLowerCase();
    const suggestions: string[] = [];

    if (lowerQuery.includes('banking')) {
      suggestions.push('healthy banking stocks');
      suggestions.push('banking with high institutional participation');
      suggestions.push('low volatility banking stocks');
    }

    if (lowerQuery.includes('ai') || lowerQuery.includes('artificial intelligence')) {
      suggestions.push('companies benefiting from AI');
      suggestions.push('AI infrastructure companies');
      suggestions.push('healthy AI stocks');
    }

    if (lowerQuery.includes('defensive')) {
      suggestions.push('defensive sectors with strong cash flow');
      suggestions.push('low volatility defensive stocks');
    }

    if (lowerQuery.includes('cash flow')) {
      suggestions.push('strong cash flow businesses');
      suggestions.push('companies with consistent cash flow');
    }

    return suggestions;
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
   * Reset to default state
   */
  resetToDefault(): void {
    this.holographicIntensity = 0.5;
  }
}

// Singleton instance
export const aiAssistedContextualSearch = new AIAssistedContextualSearch();
