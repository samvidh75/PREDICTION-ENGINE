/**
 * Comparative Intelligence Mapping
 * Comparative Analysis Environment
 * 
 * Allows visual company comparison:
 * - Sector peers
 * - Healthometer environments
 * - Volatility structures
 * - Profitability evolution
 * - Institutional participation
 * - Macro resilience
 */

import {
  ComparativeData
} from '../../types/ChartingTypes';

class ComparativeIntelligenceMapping {
  private comparativeData: ComparativeData[] = [];
  private holographicIntensity: number = 0.5;
  private selectedComparison: string | null = null;

  /**
   * Set comparative data
   */
  setComparativeData(data: ComparativeData[]): void {
    this.comparativeData = data;
  }

  /**
   * Get comparative data
   */
  getComparativeData(): ComparativeData[] {
    return [...this.comparativeData];
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
   * Set selected comparison
   */
  setSelectedComparison(symbol: string): void {
    this.selectedComparison = symbol;
  }

  /**
   * Get selected comparison
   */
  getSelectedComparison(): string | null {
    return this.selectedComparison;
  }

  /**
   * Calculate split holographic universe
   */
  calculateSplitHolographicUniverse(): {
    leftPanel: { data: ComparativeData; color: string; glow: number };
    rightPanel: { data: ComparativeData; color: string; glow: number };
  } | null {
    if (this.comparativeData.length < 2) return null;

    const leftData = this.comparativeData[0];
    const rightData = this.comparativeData[1];

    return {
      leftPanel: {
        data: leftData,
        color: '#00aaff',
        glow: 10 * this.holographicIntensity
      },
      rightPanel: {
        data: rightData,
        color: '#ffaa00',
        glow: 10 * this.holographicIntensity
      }
    };
  }

  /**
   * Calculate neural comparison rails
   */
  calculateNeuralComparisonRails(): Array<{
    metric: string;
    leftValue: number;
    rightValue: number;
    difference: number;
    color: string;
  }> {
    if (this.comparativeData.length < 2) return [];

    const left = this.comparativeData[0];
    const right = this.comparativeData[1];

    return [
      {
        metric: 'Healthometer',
        leftValue: left.healthometerScore,
        rightValue: right.healthometerScore,
        difference: left.healthometerScore - right.healthometerScore,
        color: left.healthometerScore > right.healthometerScore ? '#00ff88' : '#ff4466'
      },
      {
        metric: 'Volatility',
        leftValue: left.volatility,
        rightValue: right.volatility,
        difference: left.volatility - right.volatility,
        color: left.volatility < right.volatility ? '#00ff88' : '#ff4466'
      },
      {
        metric: 'Profitability',
        leftValue: left.profitability,
        rightValue: right.profitability,
        difference: left.profitability - right.profitability,
        color: left.profitability > right.profitability ? '#00ff88' : '#ff4466'
      },
      {
        metric: 'Institutional Participation',
        leftValue: left.institutionalParticipation,
        rightValue: right.institutionalParticipation,
        difference: left.institutionalParticipation - right.institutionalParticipation,
        color: left.institutionalParticipation > right.institutionalParticipation ? '#00ff88' : '#ff4466'
      },
      {
        metric: 'Macro Resilience',
        leftValue: left.macroResilience,
        rightValue: right.macroResilience,
        difference: left.macroResilience - right.macroResilience,
        color: left.macroResilience > right.macroResilience ? '#00ff88' : '#ff4466'
      }
    ];
  }

  /**
   * Calculate volumetric telemetry comparison system
   */
  calculateVolumetricTelemetryComparison(): Array<{
    symbol: string;
    healthometer: { value: number; color: string; glow: number };
    volatility: { value: number; color: string; glow: number };
    profitability: { value: number; color: string; glow: number };
  }> {
    return this.comparativeData.map(data => ({
      symbol: data.symbol,
      healthometer: {
        value: data.healthometerScore,
        color: data.healthometerScore > 0.7 ? '#00ff88' : data.healthometerScore > 0.4 ? '#ffaa00' : '#ff4466',
        glow: data.healthometerScore * 15 * this.holographicIntensity
      },
      volatility: {
        value: data.volatility,
        color: data.volatility < 0.3 ? '#00ff88' : data.volatility < 0.7 ? '#ffaa00' : '#ff4466',
        glow: data.volatility * 15 * this.holographicIntensity
      },
      profitability: {
        value: data.profitability,
        color: data.profitability > 0.7 ? '#00ff88' : data.profitability > 0.4 ? '#ffaa00' : '#ff4466',
        glow: data.profitability * 15 * this.holographicIntensity
      }
    }));
  }

  /**
   * Calculate comparative interpretation
   */
  calculateComparativeInterpretation(): string | null {
    if (this.comparativeData.length < 2) return null;

    const left = this.comparativeData[0];
    const right = this.comparativeData[1];

    let interpretation = `Comparing ${left.name} (${left.symbol}) with ${right.name} (${right.symbol}). `;

    const healthDiff = left.healthometerScore - right.healthometerScore;
    if (Math.abs(healthDiff) > 0.2) {
      interpretation += healthDiff > 0 
        ? `${left.name} shows stronger overall health. `
        : `${right.name} shows stronger overall health. `;
    }

    const volatilityDiff = left.volatility - right.volatility;
    if (Math.abs(volatilityDiff) > 0.2) {
      interpretation += volatilityDiff > 0
        ? `${left.name} exhibits higher volatility. `
        : `${right.name} exhibits higher volatility. `;
    }

    const profitDiff = left.profitability - right.profitability;
    if (Math.abs(profitDiff) > 0.2) {
      interpretation += profitDiff > 0
        ? `${left.name} demonstrates superior profitability. `
        : `${right.name} demonstrates superior profitability. `;
    }

    return interpretation;
  }

  /**
   * Calculate sector leadership comparison
   */
  calculateSectorLeadershipComparison(): {
    leader: ComparativeData | null;
    leadershipMetric: string;
    leadershipValue: number;
  } | null {
    if (this.comparativeData.length === 0) return null;

    const leader = this.comparativeData.reduce((best, current) => 
      current.healthometerScore > best.healthometerScore ? current : best
    );

    return {
      leader,
      leadershipMetric: 'Healthometer Score',
      leadershipValue: leader.healthometerScore
    };
  }

  /**
   * Calculate macro resilience comparison
   */
  calculateMacroResilienceComparison(): Array<{
    symbol: string;
    resilience: number;
    resilienceLevel: 'high' | 'medium' | 'low';
    color: string;
  }> {
    return this.comparativeData.map(data => ({
      symbol: data.symbol,
      resilience: data.macroResilience,
      resilienceLevel: data.macroResilience > 0.7 ? 'high' : data.macroResilience > 0.4 ? 'medium' : 'low',
      color: data.macroResilience > 0.7 ? '#00ff88' : data.macroResilience > 0.4 ? '#ffaa00' : '#ff4466'
    }));
  }

  /**
   * Add company to comparison
   */
  addCompanyToComparison(data: ComparativeData): void {
    this.comparativeData.push(data);
  }

  /**
   * Remove company from comparison
   */
  removeCompanyFromComparison(symbol: string): void {
    this.comparativeData = this.comparativeData.filter(data => data.symbol !== symbol);
  }

  /**
   * Clear all comparisons
   */
  clearComparisons(): void {
    this.comparativeData = [];
    this.selectedComparison = null;
  }

  /**
   * Reset to default state
   */
  resetToDefault(): void {
    this.clearComparisons();
    this.holographicIntensity = 0.5;
  }
}

// Singleton instance
export const comparativeIntelligenceMapping = new ComparativeIntelligenceMapping();
