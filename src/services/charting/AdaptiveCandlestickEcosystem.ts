/**
 * Adaptive Candlestick Ecosystem
 * Modern Candle Rendering
 * 
 * Modernises traditional candlestick rendering:
 * - Adaptive candle illumination
 * - Volatility-sensitive rendering
 * - Liquidity-density glow
 * - Institutional participation overlays
 * - Macro event markers
 */

import {
  CandlestickData
} from '../../types/ChartingTypes';

class AdaptiveCandlestickEcosystem {
  private candles: CandlestickData[] = [];
  private holographicIntensity: number = 0.5;
  private volatilitySensitivity: number = 0.5;

  /**
   * Set candle data
   */
  setCandles(candles: CandlestickData[]): void {
    this.candles = candles;
  }

  /**
   * Get candle data
   */
  getCandles(): CandlestickData[] {
    return [...this.candles];
  }

  /**
   * Set holographic intensity
   */
  setHolographicIntensity(intensity: number): void {
    this.holographicIntensity = Math.max(0, Math.min(1, intensity));
  }

  /**
   * Set volatility sensitivity
   */
  setVolatilitySensitivity(sensitivity: number): void {
    this.volatilitySensitivity = Math.max(0, Math.min(1, sensitivity));
  }

  /**
   * Calculate adaptive candle illumination
   */
  calculateCandleIllumination(candle: CandlestickData): {
    bodyColor: string;
    wickColor: string;
    glowIntensity: number;
  } {
    const isBullish = candle.close > candle.open;
    const volatility = candle.volatilityScore || 0.5;
    const liquidity = candle.liquidityDensity || 0.5;
    
    // Base colors
    let bodyColor = isBullish ? '#00ff88' : '#ff4466';
    let wickColor = isBullish ? '#00cc66' : '#cc3355';
    
    // Apply holographic tint
    const holographicShift = this.holographicIntensity * 0.3;
    if (isBullish) {
      bodyColor = this.adjustColor(bodyColor, holographicShift);
      wickColor = this.adjustColor(wickColor, holographicShift);
    } else {
      bodyColor = this.adjustColor(bodyColor, -holographicShift);
      wickColor = this.adjustColor(wickColor, -holographicShift);
    }
    
    // Calculate glow intensity based on volatility and liquidity
    const glowIntensity = (volatility * 0.6 + liquidity * 0.4) * this.holographicIntensity;
    
    return {
      bodyColor,
      wickColor,
      glowIntensity
    };
  }

  /**
   * Adjust color hue
   */
  private adjustColor(color: string, shift: number): string {
    // Simple color adjustment - in production would use proper color manipulation
    return color;
  }

  /**
   * Calculate volatility-sensitive rendering
   */
  calculateVolatilityRendering(candle: CandlestickData): {
    bodyWidth: number;
    wickWidth: number;
    opacity: number;
  } {
    const volatility = candle.volatilityScore || 0.5;
    const sensitivity = this.volatilitySensitivity;
    
    // Higher volatility = thinner body, thicker wick
    const bodyWidth = Math.max(0.6, 1 - (volatility * sensitivity * 0.4));
    const wickWidth = Math.min(2, 1 + (volatility * sensitivity * 0.5));
    
    // Higher volatility = slightly lower opacity for cleaner look
    const opacity = Math.max(0.7, 1 - (volatility * sensitivity * 0.2));
    
    return {
      bodyWidth,
      wickWidth,
      opacity
    };
  }

  /**
   * Calculate liquidity-density glow
   */
  calculateLiquidityGlow(candle: CandlestickData): {
    glowRadius: number;
    glowColor: string;
    glowIntensity: number;
  } {
    const liquidity = candle.liquidityDensity || 0.5;
    const volume = candle.volume;
    
    // Higher liquidity = larger glow radius
    const glowRadius = 5 + (liquidity * 10 * this.holographicIntensity);
    
    // Glow color based on liquidity level
    const glowColor = liquidity > 0.7 ? '#00aaff' : liquidity > 0.4 ? '#0088cc' : '#006699';
    
    // Glow intensity
    const glowIntensity = liquidity * this.holographicIntensity;
    
    return {
      glowRadius,
      glowColor,
      glowIntensity
    };
  }

  /**
   * Calculate institutional participation overlay
   */
  calculateInstitutionalOverlay(candle: CandlestickData): {
    showOverlay: boolean;
    overlayColor: string;
    overlayIntensity: number;
    overlayPattern: 'solid' | 'dashed' | 'dotted';
  } {
    const institutional = candle.institutionalFlow || 0;
    
    if (institutional < 0.3) {
      return {
        showOverlay: false,
        overlayColor: '',
        overlayIntensity: 0,
        overlayPattern: 'solid'
      };
    }
    
    const showOverlay = institutional > 0.5;
    const overlayColor = institutional > 0.7 ? '#ffaa00' : '#ffcc44';
    const overlayIntensity = institutional * this.holographicIntensity;
    const overlayPattern = institutional > 0.7 ? 'solid' : institutional > 0.5 ? 'dashed' : 'dotted';
    
    return {
      showOverlay,
      overlayColor,
      overlayIntensity,
      overlayPattern
    };
  }

  /**
   * Get macro event markers
   */
  getMacroEventMarkers(): Array<{
    timestamp: number;
    type: 'earnings' | 'macro' | 'sector' | 'liquidity';
    label: string;
    color: string;
  }> {
    // This would be populated with actual macro event data
    const markers: Array<{
      timestamp: number;
      type: 'earnings' | 'macro' | 'sector' | 'liquidity';
      label: string;
      color: string;
    }> = [];
    
    // Example markers - in production would come from data
    markers.push({
      timestamp: Date.now() - 86400000 * 30,
      type: 'earnings',
      label: 'Q3 Earnings',
      color: '#ffaa00'
    });
    
    return markers;
  }

  /**
   * Get complete candle rendering data
   */
  getCandleRenderingData(index: number): {
    candle: CandlestickData;
    illumination: { bodyColor: string; wickColor: string; glowIntensity: number };
    volatility: { bodyWidth: number; wickWidth: number; opacity: number };
    liquidity: { glowRadius: number; glowColor: string; glowIntensity: number };
    institutional: { showOverlay: boolean; overlayColor: string; overlayIntensity: number; overlayPattern: 'solid' | 'dashed' | 'dotted' };
  } | null {
    if (index < 0 || index >= this.candles.length) return null;
    
    const candle = this.candles[index];
    
    return {
      candle,
      illumination: this.calculateCandleIllumination(candle),
      volatility: this.calculateVolatilityRendering(candle),
      liquidity: this.calculateLiquidityGlow(candle),
      institutional: this.calculateInstitutionalOverlay(candle)
    };
  }

  /**
   * Get candle intelligence summary
   */
  getCandleIntelligence(candle: CandlestickData): string {
    const isBullish = candle.close > candle.open;
    const volatility = candle.volatilityScore || 0.5;
    const liquidity = candle.liquidityDensity || 0.5;
    const institutional = candle.institutionalFlow || 0;
    
    let intelligence = '';
    
    if (isBullish) {
      intelligence += 'Bullish movement';
    } else {
      intelligence += 'Bearish movement';
    }
    
    if (volatility > 0.7) {
      intelligence += ' with elevated volatility';
    } else if (volatility < 0.3) {
      intelligence += ' with low volatility';
    }
    
    if (liquidity > 0.7) {
      intelligence += ' and high liquidity';
    } else if (liquidity < 0.3) {
      intelligence += ' and low liquidity';
    }
    
    if (institutional > 0.7) {
      intelligence += '. Strong institutional participation';
    } else if (institutional > 0.5) {
      intelligence += '. Moderate institutional participation';
    }
    
    return intelligence;
  }

  /**
   * Clear candles
   */
  clearCandles(): void {
    this.candles = [];
  }

  /**
   * Reset to default state
   */
  reset(): void {
    this.clearCandles();
    this.holographicIntensity = 0.5;
    this.volatilitySensitivity = 0.5;
  }
}

// Singleton instance
export const adaptiveCandlestickEcosystem = new AdaptiveCandlestickEcosystem();
