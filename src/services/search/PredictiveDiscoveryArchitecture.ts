/**
 * Predictive Discovery Architecture
 * Anticipation Engine
 * 
 * Predicts what users may want before typing fully:
 * - ticker prediction
 * - company prediction
 * - macro-theme prediction
 * - sector discovery
 * - behavioural suggestions
 * - recent exploration continuity
 */

import {
  PredictionSuggestion,
  SearchResult,
  SearchResultType
} from '../../types/SearchTypes';

class PredictiveDiscoveryArchitecture {
  private predictionCache: Map<string, PredictionSuggestion[]> = new Map();
  private recentSearches: string[] = [];
  private holographicIntensity: number = 0.5;

  /**
   * Generate predictions based on partial input
   */
  generatePredictions(partialInput: string): PredictionSuggestion[] {
    const input = partialInput.toLowerCase().trim();
    
    if (input.length === 0) {
      return this.getRecentExplorationSuggestions();
    }
    
    // Check cache
    if (this.predictionCache.has(input)) {
      return this.predictionCache.get(input)!;
    }
    
    const predictions: PredictionSuggestion[] = [];
    
    // Generate ticker predictions
    predictions.push(...this.generateTickerPredictions(input));
    
    // Generate company predictions
    predictions.push(...this.generateCompanyPredictions(input));
    
    // Generate macro-theme predictions
    predictions.push(...this.generateMacroThemePredictions(input));
    
    // Generate sector discovery
    predictions.push(...this.generateSectorDiscovery(input));
    
    // Generate behavioural suggestions
    predictions.push(...this.generateBehaviouralSuggestions(input));
    
    // Sort by confidence
    predictions.sort((a, b) => b.confidence - a.confidence);
    
    // Limit to top 10
    const topPredictions = predictions.slice(0, 10);
    
    // Cache results
    this.predictionCache.set(input, topPredictions);
    
    return topPredictions;
  }

  /**
   * Generate ticker predictions
   */
  private generateTickerPredictions(input: string): PredictionSuggestion[] {
    const predictions: PredictionSuggestion[] = [];
    
    // Example ticker predictions - in production would come from data
    const tickerExamples = [
      { symbol: 'TCS', name: 'Tata Consultancy Services' },
      { symbol: 'INFY', name: 'Infosys' },
      { symbol: 'RELIANCE', name: 'Reliance Industries' },
      { symbol: 'HDFCBANK', name: 'HDFC Bank' },
      { symbol: 'ICICIBANK', name: 'ICICI Bank' },
      { symbol: 'SBIN', name: 'State Bank of India' },
      { symbol: 'BHARTIARTL', name: 'Bharti Airtel' },
      { symbol: 'ITC', name: 'ITC Limited' },
      { symbol: 'HINDUNILVR', name: 'Hindustan Unilever' },
      { symbol: 'LT', name: 'Larsen & Toubro' }
    ];
    
    for (const ticker of tickerExamples) {
      if (ticker.symbol.toLowerCase().includes(input) || 
          ticker.name.toLowerCase().includes(input)) {
        predictions.push({
          id: ticker.symbol,
          type: SearchResultType.STOCK,
          title: ticker.symbol,
          subtitle: ticker.name,
          confidence: this.calculateConfidence(input, ticker.symbol),
          category: 'ticker'
        });
      }
    }
    
    return predictions;
  }

  /**
   * Generate company predictions
   */
  private generateCompanyPredictions(input: string): PredictionSuggestion[] {
    const predictions: PredictionSuggestion[] = [];
    
    // Example company predictions
    const companyExamples = [
      { name: 'Tata Consultancy Services', sector: 'IT Services' },
      { name: 'Infosys Limited', sector: 'IT Services' },
      { name: 'Reliance Industries Limited', sector: 'Conglomerate' },
      { name: 'HDFC Bank Limited', sector: 'Banking' },
      { name: 'ICICI Bank Limited', sector: 'Banking' },
      { name: 'State Bank of India', sector: 'Banking' },
      { name: 'Bharti Airtel Limited', sector: 'Telecom' },
      { name: 'ITC Limited', sector: 'FMCG' },
      { name: 'Hindustan Unilever Limited', sector: 'FMCG' },
      { name: 'Larsen & Toubro Limited', sector: 'Infrastructure' }
    ];
    
    for (const company of companyExamples) {
      if (company.name.toLowerCase().includes(input)) {
        predictions.push({
          id: company.name,
          type: SearchResultType.COMPANY,
          title: company.name,
          subtitle: company.sector,
          confidence: this.calculateConfidence(input, company.name),
          category: 'company'
        });
      }
    }
    
    return predictions;
  }

  /**
   * Generate macro-theme predictions
   */
  private generateMacroThemePredictions(input: string): PredictionSuggestion[] {
    const predictions: PredictionSuggestion[] = [];
    
    // Example macro themes
    const macroThemes = [
      { theme: 'AI Infrastructure', description: 'Companies benefiting from artificial intelligence adoption' },
      { theme: 'Defence Expansion', description: 'Defence sector growth and modernisation' },
      { theme: 'Semiconductor Ecosystem', description: 'Semiconductor manufacturing and design' },
      { theme: 'Green Energy Transition', description: 'Renewable energy and sustainability' },
      { theme: 'Banking Leadership', description: 'Banking sector leadership and growth' },
      { theme: 'Digital India Growth', description: 'Digital transformation and technology adoption' },
      { theme: 'Manufacturing Evolution', description: 'Manufacturing sector modernisation' },
      { theme: 'Healthcare Innovation', description: 'Healthcare and pharmaceutical innovation' }
    ];
    
    for (const theme of macroThemes) {
      if (theme.theme.toLowerCase().includes(input) || 
          theme.description.toLowerCase().includes(input)) {
        predictions.push({
          id: theme.theme,
          type: SearchResultType.MACRO_THEME,
          title: theme.theme,
          subtitle: theme.description,
          confidence: this.calculateConfidence(input, theme.theme),
          category: 'macro_theme'
        });
      }
    }
    
    return predictions;
  }

  /**
   * Generate sector discovery
   */
  private generateSectorDiscovery(input: string): PredictionSuggestion[] {
    const predictions: PredictionSuggestion[] = [];
    
    // Example sectors
    const sectors = [
      { name: 'Banking', description: 'Banking and financial services' },
      { name: 'IT Services', description: 'Information technology services' },
      { name: 'FMCG', description: 'Fast-moving consumer goods' },
      { name: 'Pharmaceuticals', description: 'Pharmaceutical and healthcare' },
      { name: 'Automobile', description: 'Automobile manufacturing' },
      { name: 'Telecom', description: 'Telecommunications services' },
      { name: 'Infrastructure', description: 'Infrastructure and construction' },
      { name: 'Energy', description: 'Energy and power' }
    ];
    
    for (const sector of sectors) {
      if (sector.name.toLowerCase().includes(input) || 
          sector.description.toLowerCase().includes(input)) {
        predictions.push({
          id: sector.name,
          type: SearchResultType.SECTOR,
          title: sector.name,
          subtitle: sector.description,
          confidence: this.calculateConfidence(input, sector.name),
          category: 'sector'
        });
      }
    }
    
    return predictions;
  }

  /**
   * Generate behavioural suggestions
   */
  private generateBehaviouralSuggestions(input: string): PredictionSuggestion[] {
    const predictions: PredictionSuggestion[] = [];
    
    // Based on recent searches, suggest related items
    for (const recentSearch of this.recentSearches) {
      if (recentSearch.toLowerCase().includes(input) || 
          input.includes(recentSearch.toLowerCase())) {
        predictions.push({
          id: recentSearch,
          type: SearchResultType.STOCK,
          title: recentSearch,
          subtitle: 'Recently explored',
          confidence: 0.6 * this.holographicIntensity,
          category: 'behavioural'
        });
      }
    }
    
    return predictions;
  }

  /**
   * Get recent exploration suggestions
   */
  private getRecentExplorationSuggestions(): PredictionSuggestion[] {
    const suggestions: PredictionSuggestion[] = [];
    
    for (const recentSearch of this.recentSearches.slice(0, 5)) {
      suggestions.push({
        id: recentSearch,
        type: SearchResultType.STOCK,
        title: recentSearch,
        subtitle: 'Recently explored',
        confidence: 0.7 * this.holographicIntensity,
        category: 'behavioural'
      });
    }
    
    return suggestions;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(input: string, target: string): number {
    const targetLower = target.toLowerCase();
    const inputLower = input.toLowerCase();
    
    if (targetLower.startsWith(inputLower)) {
      return 0.9 * this.holographicIntensity;
    }
    
    if (targetLower.includes(inputLower)) {
      return 0.7 * this.holographicIntensity;
    }
    
    // Calculate similarity based on character overlap
    const overlap = this.calculateOverlap(inputLower, targetLower);
    return overlap * this.holographicIntensity;
  }

  /**
   * Calculate character overlap
   */
  private calculateOverlap(str1: string, str2: string): number {
    let overlap = 0;
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter[i])) {
        overlap++;
      }
    }
    
    return overlap / longer.length;
  }

  /**
   * Add to recent searches
   */
  addToRecentSearches(search: string): void {
    // Remove if already exists
    const index = this.recentSearches.indexOf(search);
    if (index !== -1) {
      this.recentSearches.splice(index, 1);
    }
    
    // Add to beginning
    this.recentSearches.unshift(search);
    
    // Keep only last 20
    if (this.recentSearches.length > 20) {
      this.recentSearches = this.recentSearches.slice(0, 20);
    }
  }

  /**
   * Get recent searches
   */
  getRecentSearches(): string[] {
    return [...this.recentSearches];
  }

  /**
   * Clear recent searches
   */
  clearRecentSearches(): void {
    this.recentSearches = [];
  }

  /**
   * Clear prediction cache
   */
  clearPredictionCache(): void {
    this.predictionCache.clear();
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
    this.clearPredictionCache();
    this.clearRecentSearches();
    this.holographicIntensity = 0.5;
  }
}

// Singleton instance
export const predictiveDiscoveryArchitecture = new PredictiveDiscoveryArchitecture();
