/**
 * Holographic Indicator Environment
 * Technical Indicators Modernization
 * 
 * Transforms indicators into futuristic intelligence systems:
 * - Moving averages
 * - RSI
 * - MACD
 * - Bollinger Bands
 * - VWAP
 * - Volume profiles
 * - Institutional indicators
 */

import {
  IndicatorType,
  IndicatorConfig,
  IndicatorDataPoint
} from '../../types/ChartingTypes';

class HolographicIndicatorEnvironment {
  private indicators: Map<IndicatorType, IndicatorConfig> = new Map();
  private indicatorData: Map<IndicatorType, IndicatorDataPoint[]> = new Map();
  private holographicIntensity: number = 0.5;

  constructor() {
    this.initializeDefaultIndicators();
  }

  private initializeDefaultIndicators(): void {
    this.indicators.set(IndicatorType.MOVING_AVERAGE, {
      type: IndicatorType.MOVING_AVERAGE,
      enabled: true,
      parameters: { period: 20 },
      color: '#00aaff',
      style: 'line'
    });

    this.indicators.set(IndicatorType.RSI, {
      type: IndicatorType.RSI,
      enabled: false,
      parameters: { period: 14 },
      color: '#ffaa00',
      style: 'line'
    });

    this.indicators.set(IndicatorType.MACD, {
      type: IndicatorType.MACD,
      enabled: false,
      parameters: { fast: 12, slow: 26, signal: 9 },
      color: '#ff4466',
      style: 'line'
    });

    this.indicators.set(IndicatorType.BOLLINGER_BANDS, {
      type: IndicatorType.BOLLINGER_BANDS,
      enabled: false,
      parameters: { period: 20, stdDev: 2 },
      color: '#00ff88',
      style: 'line'
    });

    this.indicators.set(IndicatorType.VWAP, {
      type: IndicatorType.VWAP,
      enabled: false,
      parameters: {},
      color: '#aa88ff',
      style: 'line'
    });

    this.indicators.set(IndicatorType.VOLUME_PROFILE, {
      type: IndicatorType.VOLUME_PROFILE,
      enabled: false,
      parameters: { bins: 24 },
      color: '#ffcc44',
      style: 'bar'
    });

    this.indicators.set(IndicatorType.INSTITUTIONAL_FLOW, {
      type: IndicatorType.INSTITUTIONAL_FLOW,
      enabled: false,
      parameters: {},
      color: '#00ffaa',
      style: 'area'
    });
  }

  /**
   * Set indicator configuration
   */
  setIndicatorConfig(config: IndicatorConfig): void {
    this.indicators.set(config.type, config);
  }

  /**
   * Get indicator configuration
   */
  getIndicatorConfig(type: IndicatorType): IndicatorConfig | undefined {
    return this.indicators.get(type);
  }

  /**
   * Enable indicator
   */
  enableIndicator(type: IndicatorType): void {
    const config = this.indicators.get(type);
    if (config) {
      config.enabled = true;
      this.indicators.set(type, config);
    }
  }

  /**
   * Disable indicator
   */
  disableIndicator(type: IndicatorType): void {
    const config = this.indicators.get(type);
    if (config) {
      config.enabled = false;
      this.indicators.set(type, config);
    }
  }

  /**
   * Set indicator parameter
   */
  setIndicatorParameter(type: IndicatorType, parameter: string, value: number): void {
    const config = this.indicators.get(type);
    if (config) {
      config.parameters[parameter] = value;
      this.indicators.set(type, config);
    }
  }

  /**
   * Set indicator color
   */
  setIndicatorColor(type: IndicatorType, color: string): void {
    const config = this.indicators.get(type);
    if (config) {
      config.color = color;
      this.indicators.set(type, config);
    }
  }

  /**
   * Set indicator style
   */
  setIndicatorStyle(type: IndicatorType, style: 'line' | 'area' | 'bar'): void {
    const config = this.indicators.get(type);
    if (config) {
      config.style = style;
      this.indicators.set(type, config);
    }
  }

  /**
   * Set indicator data
   */
  setIndicatorData(type: IndicatorType, data: IndicatorDataPoint[]): void {
    this.indicatorData.set(type, data);
  }

  /**
   * Get indicator data
   */
  getIndicatorData(type: IndicatorType): IndicatorDataPoint[] {
    return this.indicatorData.get(type) || [];
  }

  /**
   * Get all enabled indicators
   */
  getEnabledIndicators(): IndicatorConfig[] {
    return Array.from(this.indicators.values()).filter(config => config.enabled);
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
   * Calculate holographic line system
   */
  calculateHolographicLineSystem(type: IndicatorType): {
    lineWidth: number;
    glowRadius: number;
    glowColor: string;
    opacity: number;
  } {
    const config = this.indicators.get(type);
    if (!config) {
      return { lineWidth: 2, glowRadius: 0, glowColor: '#ffffff', opacity: 0 };
    }

    const intensity = this.holographicIntensity;
    
    return {
      lineWidth: 2 + intensity * 2,
      glowRadius: 5 + intensity * 15,
      glowColor: config.color,
      opacity: 0.6 + intensity * 0.4
    };
  }

  /**
   * Calculate volumetric indicator glow
   */
  calculateVolumetricIndicatorGlow(type: IndicatorType): {
    innerGlow: number;
    outerGlow: number;
    glowColor: string;
    glowIntensity: number;
  } {
    const config = this.indicators.get(type);
    if (!config) {
      return { innerGlow: 0, outerGlow: 0, glowColor: '#ffffff', glowIntensity: 0 };
    }

    const intensity = this.holographicIntensity;
    
    return {
      innerGlow: 3 + intensity * 7,
      outerGlow: 8 + intensity * 12,
      glowColor: config.color,
      glowIntensity: intensity * 0.8
    };
  }

  /**
   * Calculate adaptive signal diffusion
   */
  calculateAdaptiveSignalDiffusion(data: IndicatorDataPoint[]): {
    diffusionRadius: number;
    diffusionIntensity: number;
    signalStrength: number;
  } {
    if (data.length === 0) {
      return { diffusionRadius: 0, diffusionIntensity: 0, signalStrength: 0 };
    }

    const recentData = data.slice(-10);
    const signalCount = recentData.filter(d => d.signal && d.signal !== 'neutral').length;
    const signalStrength = signalCount / recentData.length;
    
    return {
      diffusionRadius: 10 + signalStrength * 20 * this.holographicIntensity,
      diffusionIntensity: signalStrength * this.holographicIntensity,
      signalStrength
    };
  }

  /**
   * Calculate laser-guided rendering
   */
  calculateLaserGuidedRendering(type: IndicatorType): {
    laserIntensity: number;
    laserWidth: number;
    laserColor: string;
    laserGlow: number;
  } {
    const config = this.indicators.get(type);
    if (!config) {
      return { laserIntensity: 0, laserWidth: 0, laserColor: '#ffffff', laserGlow: 0 };
    }

    const intensity = this.holographicIntensity;
    
    return {
      laserIntensity: intensity * 0.7,
      laserWidth: 1 + intensity * 2,
      laserColor: config.color,
      laserGlow: 5 + intensity * 10
    };
  }

  /**
   * Calculate Moving Average
   */
  calculateMovingAverage(data: number[], period: number): number[] {
    const ma: number[] = [];
    
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      ma.push(sum / period);
    }
    
    return ma;
  }

  /**
   * Calculate RSI
   */
  calculateRSI(data: number[], period: number): number[] {
    const rsi: number[] = [];
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i < data.length; i++) {
      const change = data[i] - data[i - 1];
      
      if (change > 0) {
        gains += change;
      } else {
        losses -= change;
      }
      
      if (i >= period) {
        const avgGain = gains / period;
        const avgLoss = losses / period;
        
        if (avgLoss === 0) {
          rsi.push(100);
        } else {
          const rs = avgGain / avgLoss;
          rsi.push(100 - (100 / (1 + rs)));
        }
        
        // Reset for next period
        gains = 0;
        losses = 0;
      }
    }
    
    return rsi;
  }

  /**
   * Calculate MACD
   */
  calculateMACD(data: number[], fast: number, slow: number, signal: number): {
    macd: number[];
    signal: number[];
    histogram: number[];
  } {
    const emaFast = this.calculateEMA(data, fast);
    const emaSlow = this.calculateEMA(data, slow);
    
    const macd = emaFast.map((fast, i) => fast - emaSlow[i]);
    const signalLine = this.calculateEMA(macd, signal);
    const histogram = macd.map((m, i) => m - signalLine[i]);
    
    return {
      macd,
      signal: signalLine,
      histogram
    };
  }

  /**
   * Calculate Exponential Moving Average
   */
  private calculateEMA(data: number[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);
    
    ema[0] = data[0];
    
    for (let i = 1; i < data.length; i++) {
      ema[i] = (data[i] - ema[i - 1]) * multiplier + ema[i - 1];
    }
    
    return ema;
  }

  /**
   * Calculate Bollinger Bands
   */
  calculateBollingerBands(data: number[], period: number, stdDev: number): {
    upper: number[];
    middle: number[];
    lower: number[];
  } {
    const middle = this.calculateMovingAverage(data, period);
    const upper: number[] = [];
    const lower: number[] = [];
    
    for (let i = period - 1; i < data.length; i++) {
      const slice = data.slice(i - period + 1, i + 1);
      const mean = middle[i - period + 1];
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
      const std = Math.sqrt(variance);
      
      upper.push(mean + std * stdDev);
      lower.push(mean - std * stdDev);
    }
    
    return {
      upper,
      middle,
      lower
    };
  }

  /**
   * Reset to default configuration
   */
  resetToDefault(): void {
    this.initializeDefaultIndicators();
    this.indicatorData.clear();
    this.holographicIntensity = 0.5;
  }
}

// Singleton instance
export const holographicIndicatorEnvironment = new HolographicIndicatorEnvironment();
