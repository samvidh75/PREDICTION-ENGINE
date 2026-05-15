/**
 * Multi-Layer Market Intelligence Overlays
 * Strategic Overlay Ecosystem
 * 
 * Allows users to see deeper market context visually:
 * - Healthometer states
 * - Institutional activity
 * - Macro conditions
 * - Volatility pressure
 * - Liquidity expansion
 * - Sector leadership
 * - Earnings environments
 */

import {
  OverlayType,
  OverlayConfig
} from '../../types/ChartingTypes';

class MultiLayerMarketIntelligenceOverlays {
  private overlays: Map<OverlayType, OverlayConfig> = new Map();
  private overlayData: Map<OverlayType, any> = new Map();
  private holographicIntensity: number = 0.5;

  constructor() {
    this.initializeDefaultOverlays();
  }

  private initializeDefaultOverlays(): void {
    this.overlays.set(OverlayType.HEALTHOMETER, {
      type: OverlayType.HEALTHOMETER,
      enabled: true,
      intensity: 0.6,
      position: 'top'
    });

    this.overlays.set(OverlayType.INSTITUTIONAL_ACTIVITY, {
      type: OverlayType.INSTITUTIONAL_ACTIVITY,
      enabled: true,
      intensity: 0.5,
      position: 'overlay'
    });

    this.overlays.set(OverlayType.MACRO_CONDITIONS, {
      type: OverlayType.MACRO_CONDITIONS,
      enabled: false,
      intensity: 0.4,
      position: 'bottom'
    });

    this.overlays.set(OverlayType.VOLATILITY_PRESSURE, {
      type: OverlayType.VOLATILITY_PRESSURE,
      enabled: true,
      intensity: 0.5,
      position: 'overlay'
    });

    this.overlays.set(OverlayType.LIQUIDITY_EXPANSION, {
      type: OverlayType.LIQUIDITY_EXPANSION,
      enabled: false,
      intensity: 0.4,
      position: 'bottom'
    });

    this.overlays.set(OverlayType.SECTOR_LEADERSHIP, {
      type: OverlayType.SECTOR_LEADERSHIP,
      enabled: false,
      intensity: 0.5,
      position: 'right'
    });

    this.overlays.set(OverlayType.EARNINGS_ENVIRONMENT, {
      type: OverlayType.EARNINGS_ENVIRONMENT,
      enabled: false,
      intensity: 0.4,
      position: 'top'
    });
  }

  /**
   * Set overlay configuration
   */
  setOverlayConfig(config: OverlayConfig): void {
    this.overlays.set(config.type, config);
  }

  /**
   * Get overlay configuration
   */
  getOverlayConfig(type: OverlayType): OverlayConfig | undefined {
    return this.overlays.get(type);
  }

  /**
   * Enable overlay
   */
  enableOverlay(type: OverlayType): void {
    const config = this.overlays.get(type);
    if (config) {
      config.enabled = true;
      this.overlays.set(type, config);
    }
  }

  /**
   * Disable overlay
   */
  disableOverlay(type: OverlayType): void {
    const config = this.overlays.get(type);
    if (config) {
      config.enabled = false;
      this.overlays.set(type, config);
    }
  }

  /**
   * Set overlay intensity
   */
  setOverlayIntensity(type: OverlayType, intensity: number): void {
    const config = this.overlays.get(type);
    if (config) {
      config.intensity = Math.max(0, Math.min(1, intensity));
      this.overlays.set(type, config);
    }
  }

  /**
   * Set overlay position
   */
  setOverlayPosition(type: OverlayType, position: 'top' | 'bottom' | 'left' | 'right' | 'overlay'): void {
    const config = this.overlays.get(type);
    if (config) {
      config.position = position;
      this.overlays.set(type, config);
    }
  }

  /**
   * Set overlay data
   */
  setOverlayData(type: OverlayType, data: any): void {
    this.overlayData.set(type, data);
  }

  /**
   * Get overlay data
   */
  getOverlayData(type: OverlayType): any {
    return this.overlayData.get(type);
  }

  /**
   * Get all enabled overlays
   */
  getEnabledOverlays(): OverlayConfig[] {
    return Array.from(this.overlays.values()).filter(config => config.enabled);
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
   * Calculate layered holographic overlay rendering
   */
  calculateLayeredHolographicOverlay(type: OverlayType): {
    opacity: number;
    blur: number;
    glow: number;
    color: string;
  } {
    const config = this.overlays.get(type);
    if (!config) {
      return { opacity: 0, blur: 0, glow: 0, color: '#ffffff' };
    }

    const intensity = config.intensity * this.holographicIntensity;
    
    // Calculate overlay properties based on type
    switch (type) {
      case OverlayType.HEALTHOMETER:
        return {
          opacity: 0.3 + intensity * 0.4,
          blur: 5 + intensity * 10,
          glow: intensity * 0.8,
          color: config.intensity > 0.7 ? '#00ff88' : config.intensity > 0.4 ? '#ffaa00' : '#ff4466'
        };

      case OverlayType.INSTITUTIONAL_ACTIVITY:
        return {
          opacity: 0.2 + intensity * 0.3,
          blur: 3 + intensity * 8,
          glow: intensity * 0.6,
          color: '#00aaff'
        };

      case OverlayType.MACRO_CONDITIONS:
        return {
          opacity: 0.25 + intensity * 0.35,
          blur: 4 + intensity * 9,
          glow: intensity * 0.5,
          color: '#ffcc44'
        };

      case OverlayType.VOLATILITY_PRESSURE:
        return {
          opacity: 0.3 + intensity * 0.4,
          blur: 6 + intensity * 12,
          glow: intensity * 0.7,
          color: config.intensity > 0.7 ? '#ff4466' : '#ffaa00'
        };

      case OverlayType.LIQUIDITY_EXPANSION:
        return {
          opacity: 0.2 + intensity * 0.3,
          blur: 4 + intensity * 8,
          glow: intensity * 0.6,
          color: '#00ffaa'
        };

      case OverlayType.SECTOR_LEADERSHIP:
        return {
          opacity: 0.25 + intensity * 0.35,
          blur: 5 + intensity * 10,
          glow: intensity * 0.5,
          color: '#aa88ff'
        };

      case OverlayType.EARNINGS_ENVIRONMENT:
        return {
          opacity: 0.3 + intensity * 0.4,
          blur: 5 + intensity * 10,
          glow: intensity * 0.7,
          color: '#ff88cc'
        };

      default:
        return {
          opacity: 0.3,
          blur: 5,
          glow: 0.5,
          color: '#ffffff'
        };
    }
  }

  /**
   * Calculate atmospheric telemetry system
   */
  calculateAtmosphericTelemetry(type: OverlayType): {
    particleCount: number;
    particleSpeed: number;
    particleSize: number;
    particleColor: string;
  } {
    const config = this.overlays.get(type);
    if (!config) {
      return { particleCount: 0, particleSpeed: 0, particleSize: 0, particleColor: '#ffffff' };
    }

    const intensity = config.intensity * this.holographicIntensity;
    
    return {
      particleCount: Math.floor(20 + intensity * 80),
      particleSpeed: 0.5 + intensity * 1.5,
      particleSize: 2 + intensity * 4,
      particleColor: this.calculateLayeredHolographicOverlay(type).color
    };
  }

  /**
   * Calculate neural data propagation
   */
  calculateNeuralDataPropagation(type: OverlayType): {
    propagationSpeed: number;
    propagationRadius: number;
    connectionStrength: number;
  } {
    const config = this.overlays.get(type);
    if (!config) {
      return { propagationSpeed: 0, propagationRadius: 0, connectionStrength: 0 };
    }

    const intensity = config.intensity * this.holographicIntensity;
    
    return {
      propagationSpeed: 1 + intensity * 3,
      propagationRadius: 50 + intensity * 100,
      connectionStrength: intensity * 0.8
    };
  }

  /**
   * Calculate adaptive visual hierarchy
   */
  calculateAdaptiveVisualHierarchy(): OverlayType[] {
    const enabledOverlays = this.getEnabledOverlays();
    
    // Sort by intensity and position priority
    const positionPriority = {
      'overlay': 3,
      'top': 2,
      'bottom': 2,
      'left': 1,
      'right': 1
    };

    return enabledOverlays
      .sort((a, b) => {
        const priorityA = positionPriority[a.position] || 0;
        const priorityB = positionPriority[b.position] || 0;
        const intensityA = a.intensity;
        const intensityB = b.intensity;
        
        return (priorityB * 0.6 + intensityB * 0.4) - (priorityA * 0.6 + intensityA * 0.4);
      })
      .map(config => config.type);
  }

  /**
   * Check if overlays create clutter
   */
  isCluttered(): boolean {
    const enabledCount = this.getEnabledOverlays().length;
    const totalIntensity = Array.from(this.overlays.values())
      .filter(config => config.enabled)
      .reduce((sum, config) => sum + config.intensity, 0);
    
    return enabledCount > 4 || totalIntensity > 2.5;
  }

  /**
   * Auto-reduce clutter
   */
  autoReduceClutter(): void {
    if (this.isCluttered()) {
      const enabledOverlays = this.getEnabledOverlays();
      
      // Disable lowest intensity overlays
      enabledOverlays
        .sort((a, b) => a.intensity - b.intensity)
        .slice(0, enabledOverlays.length - 4)
        .forEach(config => {
          config.enabled = false;
          this.overlays.set(config.type, config);
        });
    }
  }

  /**
   * Reset to default configuration
   */
  resetToDefault(): void {
    this.initializeDefaultOverlays();
    this.overlayData.clear();
    this.holographicIntensity = 0.5;
  }
}

// Singleton instance
export const multiLayerMarketIntelligenceOverlays = new MultiLayerMarketIntelligenceOverlays();
