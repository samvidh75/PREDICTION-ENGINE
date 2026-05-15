/**
 * Financial Histogram System
 * Financial Performance Visualisation
 * 
 * Visualises financial performance beautifully:
 * - Revenue evolution
 * - EBITDA progression
 * - Quarterly profits
 * - Cash flow consistency
 * - Margin expansion
 */

import {
  FinancialHistogramData
} from '../../types/ChartingTypes';

class FinancialHistogramSystem {
  private financialData: FinancialHistogramData[] = [];
  private holographicIntensity: number = 0.5;
  private animationProgress: number = 0;
  private isAnimating: boolean = false;

  /**
   * Set financial histogram data
   */
  setFinancialData(data: FinancialHistogramData[]): void {
    this.financialData = data;
    this.startAnimation();
  }

  /**
   * Get financial histogram data
   */
  getFinancialData(): FinancialHistogramData[] {
    return [...this.financialData];
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
   * Start animation
   */
  private startAnimation(): void {
    this.isAnimating = true;
    this.animationProgress = 0;
    this.animate();
  }

  /**
   * Animate
   */
  private animate(): void {
    if (!this.isAnimating) return;

    this.animationProgress += 0.02;

    if (this.animationProgress >= 1) {
      this.animationProgress = 1;
      this.isAnimating = false;
    } else {
      requestAnimationFrame(() => this.animate());
    }
  }

  /**
   * Get animation progress
   */
  getAnimationProgress(): number {
    return this.animationProgress;
  }

  /**
   * Calculate volumetric financial towers
   */
  calculateVolumetricFinancialTowers(): Array<{
    period: string;
    revenue: { height: number; color: string; glow: number };
    ebitda: { height: number; color: string; glow: number };
    profit: { height: number; color: string; glow: number };
    cashFlow: { height: number; color: string; glow: number };
  }> {
    if (this.financialData.length === 0) return [];

    const maxValue = Math.max(
      ...this.financialData.map(d => Math.max(d.revenue, d.ebitda, d.profit, d.cashFlow))
    );

    return this.financialData.map(data => ({
      period: data.period,
      revenue: {
        height: (data.revenue / maxValue) * this.animationProgress,
        color: '#00aaff',
        glow: 10 * this.holographicIntensity
      },
      ebitda: {
        height: (data.ebitda / maxValue) * this.animationProgress,
        color: '#00ff88',
        glow: 10 * this.holographicIntensity
      },
      profit: {
        height: (data.profit / maxValue) * this.animationProgress,
        color: '#ffaa00',
        glow: 10 * this.holographicIntensity
      },
      cashFlow: {
        height: (data.cashFlow / maxValue) * this.animationProgress,
        color: '#ff4466',
        glow: 10 * this.holographicIntensity
      }
    }));
  }

  /**
   * Calculate holographic growth corridors
   */
  calculateHolographicGrowthCorridors(): {
    revenueGrowth: number;
    ebitdaGrowth: number;
    profitGrowth: number;
    cashFlowGrowth: number;
    corridorColor: string;
    corridorIntensity: number;
  } | null {
    if (this.financialData.length < 2) return null;

    const first = this.financialData[0];
    const last = this.financialData[this.financialData.length - 1];

    const revenueGrowth = ((last.revenue - first.revenue) / first.revenue) * 100;
    const ebitdaGrowth = ((last.ebitda - first.ebitda) / first.ebitda) * 100;
    const profitGrowth = ((last.profit - first.profit) / first.profit) * 100;
    const cashFlowGrowth = ((last.cashFlow - first.cashFlow) / first.cashFlow) * 100;

    const averageGrowth = (revenueGrowth + ebitdaGrowth + profitGrowth + cashFlowGrowth) / 4;
    const corridorColor = averageGrowth > 0 ? '#00ff88' : '#ff4466';
    const corridorIntensity = Math.abs(averageGrowth) / 100 * this.holographicIntensity;

    return {
      revenueGrowth,
      ebitdaGrowth,
      profitGrowth,
      cashFlowGrowth,
      corridorColor,
      corridorIntensity
    };
  }

  /**
   * Calculate animated profitability streams
   */
  calculateAnimatedProfitabilityStreams(): Array<{
    period: string;
    margin: number;
    streamColor: string;
    streamIntensity: number;
    streamWidth: number;
  }> {
    if (this.financialData.length === 0) return [];

    const maxMargin = Math.max(...this.financialData.map(d => d.margin));

    return this.financialData.map(data => ({
      period: data.period,
      margin: data.margin * this.animationProgress,
      streamColor: data.margin > 0 ? '#00ff88' : '#ff4466',
      streamIntensity: (data.margin / maxMargin) * this.holographicIntensity,
      streamWidth: 2 + (data.margin / maxMargin) * 4
    }));
  }

  /**
   * Calculate financial trend analysis
   */
  calculateFinancialTrendAnalysis(): {
    revenueTrend: 'growing' | 'stable' | 'declining';
    ebitdaTrend: 'growing' | 'stable' | 'declining';
    profitTrend: 'growing' | 'stable' | 'declining';
    cashFlowTrend: 'growing' | 'stable' | 'declining';
    overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
  } | null {
    if (this.financialData.length < 3) return null;

    const recent = this.financialData.slice(-3);
    const earlier = this.financialData.slice(-6, -3);

    const calculateTrend = (metric: 'revenue' | 'ebitda' | 'profit' | 'cashFlow'): 'growing' | 'stable' | 'declining' => {
      const recentAvg = recent.reduce((sum, d) => sum + d[metric], 0) / recent.length;
      const earlierAvg = earlier.reduce((sum, d) => sum + d[metric], 0) / earlier.length;
      
      const change = (recentAvg - earlierAvg) / earlierAvg;
      
      if (change > 0.05) return 'growing';
      if (change < -0.05) return 'declining';
      return 'stable';
    };

    const revenueTrend = calculateTrend('revenue');
    const ebitdaTrend = calculateTrend('ebitda');
    const profitTrend = calculateTrend('profit');
    const cashFlowTrend = calculateTrend('cashFlow');

    const growingCount = [revenueTrend, ebitdaTrend, profitTrend, cashFlowTrend].filter(t => t === 'growing').length;

    let overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
    if (growingCount >= 3) overallHealth = 'excellent';
    else if (growingCount >= 2) overallHealth = 'good';
    else if (growingCount >= 1) overallHealth = 'fair';
    else overallHealth = 'poor';

    return {
      revenueTrend,
      ebitdaTrend,
      profitTrend,
      cashFlowTrend,
      overallHealth
    };
  }

  /**
   * Get financial interpretation
   */
  getFinancialInterpretation(): string | null {
    const trendAnalysis = this.calculateFinancialTrendAnalysis();
    if (!trendAnalysis) return null;

    const { revenueTrend, profitTrend, overallHealth } = trendAnalysis;

    let interpretation = '';

    switch (overallHealth) {
      case 'excellent':
        interpretation = 'Financial performance shows strong growth across multiple metrics';
        break;
      case 'good':
        interpretation = 'Financial performance indicates healthy growth trajectory';
        break;
      case 'fair':
        interpretation = 'Financial performance shows mixed results with areas for improvement';
        break;
      case 'poor':
        interpretation = 'Financial performance indicates challenges requiring attention';
        break;
    }

    if (revenueTrend === 'growing' && profitTrend === 'declining') {
      interpretation += '. Revenue growth not translating to profit growth';
    }

    return interpretation;
  }

  /**
   * Calculate margin expansion visual
   */
  calculateMarginExpansionVisual(): {
    marginTrend: 'expanding' | 'stable' | 'contracting';
    trendColor: string;
    trendIntensity: number;
  } | null {
    if (this.financialData.length < 2) return null;

    const first = this.financialData[0];
    const last = this.financialData[this.financialData.length - 1];
    const marginChange = last.margin - first.margin;

    let marginTrend: 'expanding' | 'stable' | 'contracting';
    if (marginChange > 2) marginTrend = 'expanding';
    else if (marginChange < -2) marginTrend = 'contracting';
    else marginTrend = 'stable';

    const trendColor = marginTrend === 'expanding' ? '#00ff88' : marginTrend === 'contracting' ? '#ff4466' : '#ffaa00';
    const trendIntensity = Math.abs(marginChange) / 10 * this.holographicIntensity;

    return {
      marginTrend,
      trendColor,
      trendIntensity
    };
  }

  /**
   * Reset to default state
   */
  resetToDefault(): void {
    this.financialData = [];
    this.holographicIntensity = 0.5;
    this.animationProgress = 0;
    this.isAnimating = false;
  }
}

// Singleton instance
export const financialHistogramSystem = new FinancialHistogramSystem();
