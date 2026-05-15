/**
 * 52-Week Range Visual System
 * Cinematic Horizontal Telemetry Bar
 * 
 * Creates a cinematic horizontal telemetry bar:
 * - 52-week low
 * - Current price
 * - 52-week high
 * - Relative positioning
 * - Volatility atmosphere
 */

import {
  Week52RangeData
} from '../../types/ChartingTypes';

class Week52RangeSystem {
  private rangeData: Week52RangeData | null = null;
  private holographicIntensity: number = 0.5;
  private animationProgress: number = 0;
  private isAnimating: boolean = false;

  /**
   * Set 52-week range data
   */
  setRangeData(data: Week52RangeData): void {
    this.rangeData = data;
    this.startAnimation();
  }

  /**
   * Get 52-week range data
   */
  getRangeData(): Week52RangeData | null {
    return this.rangeData;
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
   * Calculate glowing telemetry corridor
   */
  calculateGlowingTelemetryCorridor(): {
    corridorColor: string;
    corridorGlow: number;
    corridorWidth: number;
  } | null {
    if (!this.rangeData) return null;

    const intensity = this.holographicIntensity;
    const position = this.rangeData.relativePosition;

    // Color based on position
    let corridorColor = '#00ff88';
    if (position < 0.3) {
      corridorColor = '#ff4466';
    } else if (position < 0.7) {
      corridorColor = '#ffaa00';
    }

    return {
      corridorColor,
      corridorGlow: 10 + intensity * 20,
      corridorWidth: 2 + intensity * 4
    };
  }

  /**
   * Calculate adaptive confidence rendering
   */
  calculateAdaptiveConfidenceRendering(): {
    confidenceLevel: number;
    confidenceColor: string;
    confidenceGlow: number;
  } | null {
    if (!this.rangeData) return null;

    const intensity = this.holographicIntensity;
    const volatility = this.rangeData.volatilityAtmosphere;
    const position = this.rangeData.relativePosition;

    // Confidence based on position and volatility
    const confidenceLevel = position > 0.5 ? 1 - volatility : volatility;
    const confidenceColor = confidenceLevel > 0.7 ? '#00ff88' : confidenceLevel > 0.4 ? '#ffaa00' : '#ff4466';

    return {
      confidenceLevel,
      confidenceColor,
      confidenceGlow: confidenceLevel * intensity * 15
    };
  }

  /**
   * Calculate volumetric position markers
   */
  calculateVolumetricPositionMarkers(): {
    lowMarker: { x: number; color: string; glow: number; size: number };
    currentMarker: { x: number; color: string; glow: number; size: number };
    highMarker: { x: number; color: string; glow: number; size: number };
  } | null {
    if (!this.rangeData) return null;

    const intensity = this.holographicIntensity;
    const position = this.rangeData.relativePosition;

    return {
      lowMarker: {
        x: 0,
        color: '#ff4466',
        glow: 5 + intensity * 10,
        size: 6 + intensity * 4
      },
      currentMarker: {
        x: position,
        color: position > 0.5 ? '#00ff88' : '#ff4466',
        glow: 10 + intensity * 20,
        size: 8 + intensity * 6
      },
      highMarker: {
        x: 1,
        color: '#00ff88',
        glow: 5 + intensity * 10,
        size: 6 + intensity * 4
      }
    };
  }

  /**
   * Calculate volatility atmosphere
   */
  calculateVolatilityAtmosphere(): {
    atmosphereColor: string;
    atmosphereIntensity: number;
    atmosphereGlow: number;
  } | null {
    if (!this.rangeData) return null;

    const volatility = this.rangeData.volatilityAtmosphere;
    const intensity = this.holographicIntensity;

    let atmosphereColor = '#00ff88';
    if (volatility > 0.7) {
      atmosphereColor = '#ff4466';
    } else if (volatility > 0.4) {
      atmosphereColor = '#ffaa00';
    }

    return {
      atmosphereColor,
      atmosphereIntensity: volatility * intensity,
      atmosphereGlow: volatility * intensity * 15
    };
  }

  /**
   * Calculate relative positioning visual
   */
  calculateRelativePositioningVisual(): {
    position: number;
    positionColor: string;
    positionGradient: string;
  } | null {
    if (!this.rangeData) return null;

    const position = this.rangeData.relativePosition;
    const intensity = this.holographicIntensity;

    let positionColor = '#00ff88';
    if (position < 0.3) {
      positionColor = '#ff4466';
    } else if (position < 0.7) {
      positionColor = '#ffaa00';
    }

    // Create gradient based on position
    const positionGradient = `linear-gradient(90deg, #ff4466 0%, #ffaa00 ${position * 100}%, #00ff88 100%)`;

    return {
      position,
      positionColor,
      positionGradient
    };
  }

  /**
   * Get range interpretation
   */
  getRangeInterpretation(): string | null {
    if (!this.rangeData) return null;

    const position = this.rangeData.relativePosition;
    const volatility = this.rangeData.volatilityAtmosphere;

    if (position > 0.8) {
      return volatility > 0.6 
        ? 'Trading near 52-week high with elevated volatility'
        : 'Trading near 52-week high with stable conditions';
    } else if (position > 0.6) {
      return 'Trading in upper portion of 52-week range';
    } else if (position > 0.4) {
      return 'Trading near middle of 52-week range';
    } else if (position > 0.2) {
      return 'Trading in lower portion of 52-week range';
    } else {
      return volatility > 0.6
        ? 'Trading near 52-week low with elevated volatility'
        : 'Trading near 52-week low with stable conditions';
    }
  }

  /**
   * Calculate range percentage from low
   */
  calculateRangePercentageFromLow(): number | null {
    if (!this.rangeData) return null;

    const range = this.rangeData.high - this.rangeData.low;
    const currentFromLow = this.rangeData.current - this.rangeData.low;
    
    return (currentFromLow / range) * 100;
  }

  /**
   * Calculate range percentage from high
   */
  calculateRangePercentageFromHigh(): number | null {
    if (!this.rangeData) return null;

    const range = this.rangeData.high - this.rangeData.low;
    const currentFromHigh = this.rangeData.high - this.rangeData.current;
    
    return (currentFromHigh / range) * 100;
  }

  /**
   * Reset to default state
   */
  resetToDefault(): void {
    this.rangeData = null;
    this.holographicIntensity = 0.5;
    this.animationProgress = 0;
    this.isAnimating = false;
  }
}

// Singleton instance
export const week52RangeSystem = new Week52RangeSystem();
