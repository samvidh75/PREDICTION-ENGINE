/**
 * Instant Intelligence Preview System
 * Rapid Understanding Layer
 * 
 * Shows important intelligence before entering pages:
 * - live price
 * - Healthometer state
 * - sector positioning
 * - institutional confidence
 * - volatility environment
 * - company story summary
 */

import {
  IntelligencePreview,
  SearchResult,
  SearchResultType
} from '../../types/SearchTypes';

class InstantIntelligencePreviewSystem {
  private previewCache: Map<string, IntelligencePreview> = new Map();
  private holographicIntensity: number = 0.5;

  /**
   * Generate preview for search result
   */
  generatePreview(result: SearchResult): IntelligencePreview {
    const cacheKey = result.id;
    
    if (this.previewCache.has(cacheKey)) {
      return this.previewCache.get(cacheKey)!;
    }

    const preview: IntelligencePreview = {
      id: result.id,
      type: result.type,
      healthometerState: this.calculateHealthometerState(result),
      volatilityEnvironment: this.calculateVolatilityEnvironment(result),
      institutionalConfidence: this.calculateInstitutionalConfidence(result),
      sectorPositioning: this.calculateSectorPositioning(result),
      companyStorySummary: this.generateCompanyStorySummary(result)
    };

    this.previewCache.set(cacheKey, preview);
    return preview;
  }

  /**
   * Calculate healthometer state
   */
  private calculateHealthometerState(result: SearchResult): {
    score: number;
    label: string;
    color: string;
  } {
    const score = result.telemetry.healthometerScore || 0.5;
    
    let label = 'Neutral';
    let color = '#ffaa00';
    
    if (score > 0.8) {
      label = 'Excellent';
      color = '#00ff88';
    } else if (score > 0.6) {
      label = 'Good';
      color = '#00aaff';
    } else if (score < 0.3) {
      label = 'Poor';
      color = '#ff4466';
    }

    return { score, label, color };
  }

  /**
   * Calculate volatility environment
   */
  private calculateVolatilityEnvironment(result: SearchResult): {
    level: 'low' | 'medium' | 'high';
    score: number;
  } {
    const score = result.telemetry.volatility || 0.5;
    
    let level: 'low' | 'medium' | 'high' = 'medium';
    
    if (score < 0.3) {
      level = 'low';
    } else if (score > 0.7) {
      level = 'high';
    }

    return { level, score };
  }

  /**
   * Calculate institutional confidence
   */
  private calculateInstitutionalConfidence(result: SearchResult): {
    level: 'low' | 'medium' | 'high';
    score: number;
  } {
    const score = result.telemetry.institutionalConfidence || 0.5;
    
    let level: 'low' | 'medium' | 'high' = 'medium';
    
    if (score < 0.4) {
      level = 'low';
    } else if (score > 0.7) {
      level = 'high';
    }

    return { level, score };
  }

  /**
   * Calculate sector positioning
   */
  private calculateSectorPositioning(result: SearchResult): {
    rank: number;
    total: number;
    percentile: number;
  } {
    // In production, this would come from actual sector data
    const rank = Math.floor(Math.random() * 50) + 1;
    const total = 100;
    const percentile = ((total - rank) / total) * 100;

    return { rank, total, percentile };
  }

  /**
   * Generate company story summary
   */
  private generateCompanyStorySummary(result: SearchResult): string {
    const healthometer = result.telemetry.healthometerScore || 0.5;
    const volatility = result.telemetry.volatility || 0.5;
    const institutional = result.telemetry.institutionalConfidence || 0.5;

    let summary = `${result.title} `;

    if (healthometer > 0.7) {
      summary += 'shows strong overall health. ';
    } else if (healthometer > 0.5) {
      summary += 'shows moderate health. ';
    } else {
      summary += 'shows mixed health indicators. ';
    }

    if (volatility < 0.3) {
      summary += 'Exhibits low volatility with stable trading. ';
    } else if (volatility > 0.7) {
      summary += 'Exhibits elevated volatility. ';
    }

    if (institutional > 0.7) {
      summary += 'High institutional participation indicates strong investor interest.';
    }

    return summary;
  }

  /**
   * Clear preview cache
   */
  clearPreviewCache(): void {
    this.previewCache.clear();
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
    this.clearPreviewCache();
    this.holographicIntensity = 0.5;
  }
}

// Singleton instance
export const instantIntelligencePreviewSystem = new InstantIntelligencePreviewSystem();
