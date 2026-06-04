/**
 * Beginner-Friendly Interpretation Layer
 * Accessibility Protection
 * 
 * Helps beginners understand charts visually:
 * - Contextual explanations
 * - Simplified chart mode
 * - Guided telemetry overlays
 * - Visual volatility interpretation
 * - Educational holographic explanations
 */

import {
  CandlestickData,
  BeginnerModeConfig
} from '../../types/ChartingTypes';

class BeginnerInterpretationLayer {
  private config: BeginnerModeConfig;
  private explanations: Map<string, string> = new Map();
  private holographicIntensity: number = 0.5;

  constructor() {
    this.config = this.getDefaultConfig();
    this.initializeExplanations();
  }

  private getDefaultConfig(): BeginnerModeConfig {
    return {
      enabled: false,
      simplifiedView: false,
      showExplanations: true,
      guidedOverlays: true,
      educationalHolograms: true
    };
  }

  private initializeExplanations(): void {
    this.explanations.set('candlestick', 'A candlestick shows price movement over a period. The body shows opening and closing prices, while the wicks show the highest and lowest prices.');
    this.explanations.set('volatility', 'Volatility measures how much prices fluctuate. High volatility means prices change rapidly, while low volatility means prices are relatively stable.');
    this.explanations.set('volume', 'Volume shows how many shares were traded. Higher volume often indicates stronger investor interest in the price movement.');
    this.explanations.set('moving_average', 'A moving average smooths out price data to show the trend direction. It helps identify the overall price movement over time.');
    this.explanations.set('support', 'Support is a price level where a stock tends to find buying interest, preventing it from falling further.');
    this.explanations.set('resistance', 'Resistance is a price level where a stock tends to find selling pressure, preventing it from rising further.');
  }

  /**
   * Set beginner mode configuration
   */
  setConfig(config: Partial<BeginnerModeConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get beginner mode configuration
   */
  getConfig(): BeginnerModeConfig {
    return { ...this.config };
  }

  /**
   * Enable beginner mode
   */
  enableBeginnerMode(): void {
    this.config.enabled = true;
    this.config.simplifiedView = true;
    this.config.showExplanations = true;
    this.config.guidedOverlays = true;
    this.config.educationalHolograms = true;
  }

  /**
   * Disable beginner mode
   */
  disableBeginnerMode(): void {
    this.config.enabled = false;
    this.config.simplifiedView = false;
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
   * Get contextual explanation for a concept
   */
  getContextualExplanation(concept: string): string {
    return this.explanations.get(concept) || 'No explanation available for this concept.';
  }

  /**
   * Set custom explanation
   */
  setCustomExplanation(concept: string, explanation: string): void {
    this.explanations.set(concept, explanation);
  }

  /**
   * Generate candlestick interpretation
   */
  generateCandlestickInterpretation(candle: CandlestickData): string {
    const isBullish = candle.close > candle.open;
    const priceRange = candle.high - candle.low;
    const bodySize = Math.abs(candle.close - candle.open);
    const bodyRatio = bodySize / priceRange;

    let interpretation = '';

    if (isBullish) {
      interpretation += 'This candle shows the price moved higher during this period. ';
      if (bodyRatio > 0.7) {
        interpretation += 'The large body indicates strong buying pressure. ';
      } else if (bodyRatio > 0.4) {
        interpretation += 'The moderate body shows steady buying interest. ';
      } else {
        interpretation += 'The small body suggests modest price movement. ';
      }
    } else {
      interpretation += 'This candle shows the price moved lower during this period. ';
      if (bodyRatio > 0.7) {
        interpretation += 'The large body indicates strong selling pressure. ';
      } else if (bodyRatio > 0.4) {
        interpretation += 'The moderate body shows steady selling interest. ';
      } else {
        interpretation += 'The small body suggests modest price movement. ';
      }
    }

    if (candle.volume > 0) {
      interpretation += `Volume was ${this.formatVolume(candle.volume)}. `;
    }

    return interpretation;
  }

  /**
   * Generate volatility interpretation
   */
  generateVolatilityInterpretation(volatilityScore: number): string {
    if (volatilityScore > 0.7) {
      return 'This period reflects elevated market uncertainty and wider price fluctuation behaviour. Prices are changing rapidly, indicating higher risk.';
    } else if (volatilityScore > 0.4) {
      return 'This period shows moderate price movement. The market is experiencing normal fluctuations with balanced buying and selling activity.';
    } else {
      return 'This period reflects stable market conditions with minimal price fluctuation. The market is experiencing calm trading behaviour.';
    }
  }

  /**
   * Generate volume interpretation
   */
  generateVolumeInterpretation(volume: number, averageVolume: number): string {
    const volumeRatio = volume / averageVolume;

    if (volumeRatio > 1.5) {
      return 'Trading volume is significantly higher than usual, indicating strong investor interest and potentially important price movement.';
    } else if (volumeRatio > 1.1) {
      return 'Trading volume is above average, suggesting increased investor participation in this price movement.';
    } else if (volumeRatio < 0.7) {
      return 'Trading volume is below average, indicating limited investor interest in this price movement.';
    } else {
      return 'Trading volume is around normal levels, showing typical investor participation.';
    }
  }

  /**
   * Generate trend interpretation
   */
  generateTrendInterpretation(prices: number[]): string {
    if (prices.length < 3) return 'Insufficient data to determine trend.';

    const recent = prices.slice(-5);
    const earlier = prices.slice(-10, -5);

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;

    const change = (recentAvg - earlierAvg) / earlierAvg;

    if (change > 0.05) {
      return 'Prices are trending upward, indicating positive momentum and potential buyer confidence.';
    } else if (change < -0.05) {
      return 'Prices are trending downward, indicating negative momentum and potential seller pressure.';
    } else {
      return 'Prices are relatively stable, showing a balanced market with no clear directional bias.';
    }
  }

  /**
   * Generate guided telemetry overlay
   */
  generateGuidedTelemetryOverlay(data: CandlestickData[]): Array<{
    x: number;
    y: number;
    label: string;
    explanation: string;
    priority: number;
  }> {
    const overlays: Array<{
      x: number;
      y: number;
      label: string;
      explanation: string;
      priority: number;
    }> = [];

    if (data.length === 0) return overlays;

    // Find significant candles
    for (let i = 1; i < data.length; i++) {
      const candle = data[i];
      const previous = data[i - 1];
      const priceChange = Math.abs(candle.close - previous.close) / previous.close;

      if (priceChange > 0.05) {
        overlays.push({
          x: i,
          y: candle.close,
          label: priceChange > 0 ? 'Significant Rise' : 'Significant Drop',
          explanation: this.generateCandlestickInterpretation(candle),
          priority: 2
        });
      }
    }

    // Sort by priority and limit to top 5
    return overlays.sort((a, b) => b.priority - a.priority).slice(0, 5);
  }

  /**
   * Generate educational holographic explanation
   */
  generateEducationalHologramExplanation(concept: string, context: any): {
    title: string;
    explanation: string;
    visualCues: string[];
    learnMore: string;
  } {
    const baseExplanation = this.getContextualExplanation(concept);

    return {
      title: concept.charAt(0).toUpperCase() + concept.slice(1),
      explanation: baseExplanation,
      visualCues: this.generateVisualCues(concept),
      learnMore: `Learn more about ${concept} in our education section.`
    };
  }

  /**
   * Generate visual cues for a concept
   */
  private generateVisualCues(concept: string): string[] {
    const cues: Record<string, string[]> = {
      candlestick: [
        'Green candle = price went up',
        'Red candle = price went down',
        'Body size = price movement strength',
        'Wicks = highest and lowest prices'
      ],
      volatility: [
        'Wide price range = high volatility',
        'Narrow price range = low volatility',
        'High volatility = higher risk',
        'Low volatility = more stable'
      ],
      volume: [
        'Tall bars = high trading activity',
        'Short bars = low trading activity',
        'High volume = strong interest',
        'Low volume = limited interest'
      ],
      moving_average: [
        'Line above price = resistance',
        'Line below price = support',
        'Slope up = uptrend',
        'Slope down = downtrend'
      ]
    };

    return cues[concept] || ['Visual cues not available'];
  }

  /**
   * Format volume for display
   */
  private formatVolume(volume: number): string {
    if (volume >= 1000000000) {
      return `${(volume / 1000000000).toFixed(2)}B shares`;
    } else if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(2)}M shares`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(2)}K shares`;
    }
    return `${volume} shares`;
  }

  /**
   * Calculate simplified view settings
   */
  calculateSimplifiedViewSettings(): {
    showIndicators: boolean;
    showOverlays: boolean;
    showGrid: boolean;
    showVolume: boolean;
    colorScheme: 'simple' | 'detailed';
  } {
    if (!this.config.simplifiedView) {
      return {
        showIndicators: true,
        showOverlays: true,
        showGrid: true,
        showVolume: true,
        colorScheme: 'detailed'
      };
    }

    return {
      showIndicators: false,
      showOverlays: false,
      showGrid: true,
      showVolume: true,
      colorScheme: 'simple'
    };
  }

  /**
   * Reset to default configuration
   */
  resetToDefault(): void {
    this.config = this.getDefaultConfig();
    this.holographicIntensity = 0.5;
  }
}

// Singleton instance
export const beginnerInterpretationLayer = new BeginnerInterpretationLayer();
