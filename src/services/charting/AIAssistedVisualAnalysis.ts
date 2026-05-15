/**
 * AI-Assisted Visual Analysis Layer
 * Contextual Interpretation System
 * 
 * Explains visual market behaviour intelligently:
 * - Contextual volatility explanations
 * - Liquidity interpretation
 * - Macro influence overlays
 * - Institutional behaviour summaries
 * - Structural trend analysis
 */

import {
  AIAnalysisInterpretation,
  CandlestickData
} from '../../types/ChartingTypes';

class AIAssistedVisualAnalysis {
  private interpretations: Map<string, AIAnalysisInterpretation> = new Map();
  private holographicIntensity: number = 0.5;

  /**
   * Set interpretation
   */
  setInterpretation(key: string, interpretation: AIAnalysisInterpretation): void {
    this.interpretations.set(key, interpretation);
  }

  /**
   * Get interpretation
   */
  getInterpretation(key: string): AIAnalysisInterpretation | undefined {
    return this.interpretations.get(key);
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
   * Generate volatility interpretation
   */
  generateVolatilityInterpretation(data: CandlestickData[]): AIAnalysisInterpretation {
    if (data.length === 0) {
      return {
        type: 'volatility',
        summary: 'Insufficient data for volatility analysis.',
        confidence: 0,
        educationalNote: 'More data points are needed for accurate volatility assessment.',
        visualCues: []
      };
    }

    const recentVolatility = data.slice(-20).map(d => d.volatilityScore || 0.5);
    const avgVolatility = recentVolatility.reduce((a, b) => a + b, 0) / recentVolatility.length;
    const maxVolatility = Math.max(...recentVolatility);
    const minVolatility = Math.min(...recentVolatility);

    let summary = '';
    let confidence = 0.8;
    const visualCues: string[] = [];

    if (avgVolatility > 0.7) {
      summary = 'Market is experiencing elevated volatility with significant price fluctuations. This suggests heightened uncertainty and potential risk.';
      visualCues.push('Wide price ranges on recent candles');
      visualCues.push('Increased gap between highs and lows');
    } else if (avgVolatility > 0.4) {
      summary = 'Market volatility is at moderate levels with normal price fluctuations. Trading conditions appear balanced.';
      visualCues.push('Moderate price ranges on candles');
      visualCues.push('Consistent trading patterns');
    } else {
      summary = 'Market volatility is low with minimal price fluctuations. Trading conditions appear stable and calm.';
      visualCues.push('Narrow price ranges on candles');
      visualCues.push('Steady price movement');
    }

    if (maxVolatility - minVolatility > 0.4) {
      summary += ' Volatility has been variable recently.';
      visualCues.push('Inconsistent volatility patterns');
    }

    return {
      type: 'volatility',
      summary,
      confidence,
      educationalNote: 'Volatility measures the degree of price variation over time. Higher volatility generally indicates higher risk and potential reward.',
      visualCues
    };
  }

  /**
   * Generate liquidity interpretation
   */
  generateLiquidityInterpretation(data: CandlestickData[]): AIAnalysisInterpretation {
    if (data.length === 0) {
      return {
        type: 'liquidity',
        summary: 'Insufficient data for liquidity analysis.',
        confidence: 0,
        educationalNote: 'More data points are needed for accurate liquidity assessment.',
        visualCues: []
      };
    }

    const recentLiquidity = data.slice(-20).map(d => d.liquidityDensity || 0.5);
    const avgLiquidity = recentLiquidity.reduce((a, b) => a + b, 0) / recentLiquidity.length;
    const recentVolume = data.slice(-10).reduce((sum, d) => sum + d.volume, 0);
    const avgVolume = data.reduce((sum, d) => sum + d.volume, 0) / data.length;

    let summary = '';
    let confidence = 0.75;
    const visualCues: string[] = [];

    if (avgLiquidity > 0.7) {
      summary = 'Market liquidity is high, indicating strong trading activity and easy entry/exit positions.';
      visualCues.push('Consistently high trading volume');
      visualCues.push('Narrow bid-ask spreads (if visible)');
    } else if (avgLiquidity > 0.4) {
      summary = 'Market liquidity is at moderate levels with adequate trading activity.';
      visualCues.push('Moderate trading volume');
      visualCues.push('Balanced buy-sell activity');
    } else {
      summary = 'Market liquidity is low, which may result in wider spreads and difficulty executing large orders.';
      visualCues.push('Low trading volume');
      visualCues.push('Potential price impact on trades');
    }

    const volumeTrend = recentVolume > avgVolume * 10;
    if (volumeTrend) {
      summary += ' Recent trading volume is above average.';
      visualCues.push('Elevated recent volume');
    }

    return {
      type: 'liquidity',
      summary,
      confidence,
      educationalNote: 'Liquidity refers to how easily an asset can be bought or sold without affecting its price. High liquidity means many buyers and sellers are active.',
      visualCues
    };
  }

  /**
   * Generate macro influence interpretation
   */
  generateMacroInfluenceInterpretation(data: CandlestickData[], macroEvents: Array<{ timestamp: number; type: string; impact: number }>): AIAnalysisInterpretation {
    if (data.length === 0) {
      return {
        type: 'macro',
        summary: 'Insufficient data for macro influence analysis.',
        confidence: 0,
        educationalNote: 'More data points are needed for accurate macro assessment.',
        visualCues: []
      };
    }

    const recentData = data.slice(-30);
    const macroImpact = macroEvents.filter(
      event => {
        const eventTime = event.timestamp;
        return recentData.some(candle => Math.abs(candle.timestamp - eventTime) < 86400000 * 7);
      }
    );

    let summary = '';
    let confidence = 0.7;
    const visualCues: string[] = [];

    if (macroImpact.length > 0) {
      const avgImpact = macroImpact.reduce((sum, e) => sum + e.impact, 0) / macroImpact.length;
      
      if (avgImpact > 0.7) {
        summary = 'Recent macro events have had significant influence on market behaviour, causing notable price movements.';
        visualCues.push('Sharp price movements around event dates');
        visualCues.push('Increased volatility following events');
      } else if (avgImpact > 0.4) {
        summary = 'Recent macro events have had moderate influence on market behaviour.';
        visualCues.push('Noticeable price changes around events');
        visualCues.push('Slight volatility increase');
      } else {
        summary = 'Recent macro events have had minimal influence on market behaviour.';
        visualCues.push('Stable price patterns despite events');
      }
    } else {
      summary = 'No significant macro events detected in the recent period. Market behaviour appears driven by company-specific factors.';
      visualCues.push('Consistent trading patterns');
    }

    return {
      type: 'macro',
      summary,
      confidence,
      educationalNote: 'Macro events such as economic announcements, policy changes, or geopolitical developments can significantly impact market behaviour across multiple stocks.',
      visualCues
    };
  }

  /**
   * Generate institutional behaviour summary
   */
  generateInstitutionalBehaviourSummary(data: CandlestickData[]): AIAnalysisInterpretation {
    if (data.length === 0) {
      return {
        type: 'institutional',
        summary: 'Insufficient data for institutional behaviour analysis.',
        confidence: 0,
        educationalNote: 'More data points are needed for accurate institutional assessment.',
        visualCues: []
      };
    }

    const recentInstitutional = data.slice(-20).map(d => d.institutionalFlow || 0);
    const avgInstitutional = recentInstitutional.reduce((a, b) => a + b, 0) / recentInstitutional.length;
    const institutionalTrend = recentInstitutional.slice(-5).reduce((a, b) => a + b, 0) / 5;

    let summary = '';
    let confidence = 0.65;
    const visualCues: string[] = [];

    if (avgInstitutional > 0.7) {
      summary = 'Strong institutional participation is evident, suggesting significant professional investor interest.';
      visualCues.push('High volume on price movements');
      visualCues.push('Sustained price trends');
    } else if (avgInstitutional > 0.4) {
      summary = 'Moderate institutional participation indicates balanced professional and retail investor activity.';
      visualCues.push('Moderate trading volume');
      visualCues.push('Mixed price patterns');
    } else {
      summary = 'Limited institutional participation suggests retail-driven trading activity.';
      visualCues.push('Lower trading volume');
      visualCues.push('More volatile price movements');
    }

    if (institutionalTrend > avgInstitutional * 1.2) {
      summary += ' Institutional activity has been increasing recently.';
      visualCues.push('Rising volume trends');
    } else if (institutionalTrend < avgInstitutional * 0.8) {
      summary += ' Institutional activity has been decreasing recently.';
      visualCues.push('Declining volume trends');
    }

    return {
      type: 'institutional',
      summary,
      confidence,
      educationalNote: 'Institutional investors such as mutual funds, pension funds, and hedge funds typically trade in larger volumes and can significantly influence price movements.',
      visualCues
    };
  }

  /**
   * Generate structural trend analysis
   */
  generateStructuralTrendAnalysis(data: CandlestickData[]): AIAnalysisInterpretation {
    if (data.length < 10) {
      return {
        type: 'structural',
        summary: 'Insufficient data for structural trend analysis.',
        confidence: 0,
        educationalNote: 'More data points are needed for accurate trend assessment.',
        visualCues: []
      };
    }

    const prices = data.map(d => d.close);
    const recentPrices = prices.slice(-20);
    const earlierPrices = prices.slice(-40, -20);

    const recentAvg = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
    const earlierAvg = earlierPrices.reduce((a, b) => a + b, 0) / earlierPrices.length;
    const trendChange = (recentAvg - earlierAvg) / earlierAvg;

    let summary = '';
    let confidence = 0.8;
    const visualCues: string[] = [];

    if (trendChange > 0.05) {
      summary = 'The market structure shows an upward trend, indicating positive momentum and potential buyer confidence.';
      visualCues.push('Higher highs and higher lows pattern');
      visualCues.push('Consistent upward price movement');
    } else if (trendChange < -0.05) {
      summary = 'The market structure shows a downward trend, indicating negative momentum and potential seller pressure.';
      visualCues.push('Lower highs and lower lows pattern');
      visualCues.push('Consistent downward price movement');
    } else {
      summary = 'The market structure shows a sideways trend, indicating consolidation and balanced buying/selling pressure.';
      visualCues.push('Range-bound price movement');
      visualCues.push('Horizontal price channel');
    }

    // Check for trend strength
    const volatility = data.slice(-20).map(d => d.volatilityScore || 0.5);
    const avgVolatility = volatility.reduce((a, b) => a + b, 0) / volatility.length;

    if (avgVolatility < 0.3) {
      summary += ' The trend appears strong with low volatility.';
      visualCues.push('Smooth price progression');
    } else if (avgVolatility > 0.7) {
      summary += ' The trend appears volatile with significant price swings.';
      visualCues.push('Erratic price movement');
    }

    return {
      type: 'structural',
      summary,
      confidence,
      educationalNote: 'Structural trends refer to the overall direction of price movement over time. Understanding trends helps identify potential future price behaviour.',
      visualCues
    };
  }

  /**
   * Calculate visual overlay for interpretation
   */
  calculateVisualOverlay(interpretation: AIAnalysisInterpretation): {
    showOverlay: boolean;
    overlayColor: string;
    overlayIntensity: number;
    overlayPattern: 'solid' | 'dashed' | 'dotted';
  } {
    const intensity = interpretation.confidence * this.holographicIntensity;

    let overlayColor = '#ffffff';
    switch (interpretation.type) {
      case 'volatility':
        overlayColor = '#ffaa00';
        break;
      case 'liquidity':
        overlayColor = '#00aaff';
        break;
      case 'macro':
        overlayColor = '#ff4466';
        break;
      case 'institutional':
        overlayColor = '#00ff88';
        break;
      case 'structural':
        overlayColor = '#aa88ff';
        break;
    }

    return {
      showOverlay: interpretation.confidence > 0.5,
      overlayColor,
      overlayIntensity: intensity,
      overlayPattern: interpretation.confidence > 0.7 ? 'solid' : 'dashed'
    };
  }

  /**
   * Clear all interpretations
   */
  clearInterpretations(): void {
    this.interpretations.clear();
  }

  /**
   * Reset to default state
   */
  resetToDefault(): void {
    this.clearInterpretations();
    this.holographicIntensity = 0.5;
  }
}

// Singleton instance
export const aiAssistedVisualAnalysis = new AIAssistedVisualAnalysis();
