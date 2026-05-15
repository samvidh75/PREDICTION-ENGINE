/**
 * Search Atmosphere & Interaction Engine
 * Emotional Feel of Navigation
 * 
 * Makes search interactions feel alive and premium:
 * - adaptive glow diffusion
 * - neural interaction pulse
 * - cinematic transitions
 * - holographic hover propagation
 * - volumetric focus rendering
 */

import {
  SearchAtmosphereConfig
} from '../../types/SearchTypes';

class SearchAtmosphereInteractionEngine {
  private atmosphereConfig: SearchAtmosphereConfig;
  private holographicIntensity: number = 0.5;

  constructor() {
    this.atmosphereConfig = this.getDefaultConfig();
  }

  private getDefaultConfig(): SearchAtmosphereConfig {
    return {
      glowIntensity: 0.5,
      pulseBreathing: true,
      pulseSpeed: 0.5,
      holographicIntensity: 0.5,
      neuralPropagation: true
    };
  }

  /**
   * Set atmosphere configuration
   */
  setAtmosphereConfig(config: Partial<SearchAtmosphereConfig>): void {
    this.atmosphereConfig = { ...this.atmosphereConfig, ...config };
  }

  /**
   * Get atmosphere configuration
   */
  getAtmosphereConfig(): SearchAtmosphereConfig {
    return { ...this.atmosphereConfig };
  }

  /**
   * Set holographic intensity
   */
  setHolographicIntensity(intensity: number): void {
    this.holographicIntensity = Math.max(0, Math.min(1, intensity));
    this.atmosphereConfig.holographicIntensity = intensity;
  }

  /**
   * Get holographic intensity
   */
  getHolographicIntensity(): number {
    return this.holographicIntensity;
  }

  /**
   * Calculate adaptive glow diffusion
   */
  calculateAdaptiveGlowDiffusion(timestamp: number): {
    glowRadius: number;
    glowIntensity: number;
    glowColor: string;
  } {
    const intensity = this.holographicIntensity;
    const pulse = this.atmosphereConfig.pulseBreathing 
      ? Math.sin(timestamp / 1000 * this.atmosphereConfig.pulseSpeed) * 0.2 
      : 0;

    return {
      glowRadius: 20 + (0.5 + pulse) * 30 * intensity,
      glowIntensity: (0.3 + pulse) * intensity,
      glowColor: `rgba(0, 170, 255, ${0.2 + (0.3 + pulse) * intensity})`
    };
  }

  /**
   * Calculate neural interaction pulse
   */
  calculateNeuralInteractionPulse(timestamp: number): {
    pulseRadius: number;
    pulseIntensity: number;
    pulseSpeed: number;
  } {
    if (!this.atmosphereConfig.neuralPropagation) {
      return { pulseRadius: 0, pulseIntensity: 0, pulseSpeed: 0 };
    }

    const intensity = this.holographicIntensity;
    const pulseSpeed = this.atmosphereConfig.pulseSpeed * 2;
    const pulseRadius = (timestamp / 1000 * pulseSpeed) % 100;
    const pulseIntensity = Math.max(0, 1 - pulseRadius / 100) * intensity;

    return {
      pulseRadius,
      pulseIntensity,
      pulseSpeed
    };
  }

  /**
   * Calculate cinematic transition
   */
  calculateCinematicTransition(progress: number): {
    opacity: number;
    scale: number;
    blur: number;
    rotation: number;
  } {
    const intensity = this.holographicIntensity;
    
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);

    return {
      opacity: eased,
      scale: 0.95 + eased * 0.05,
      blur: (1 - eased) * 5 * intensity,
      rotation: (1 - eased) * 2 * intensity
    };
  }

  /**
   * Calculate holographic hover propagation
   */
  calculateHolographicHoverPropagation(x: number, y: number): Array<{
    x: number;
    y: number;
    intensity: number;
    radius: number;
  }> {
    if (!this.atmosphereConfig.neuralPropagation) {
      return [];
    }

    const propagation: Array<{
      x: number;
      y: number;
      intensity: number;
      radius: number;
    }> = [];

    const propagationCount = 5 + Math.floor(this.holographicIntensity * 10);

    for (let i = 0; i < propagationCount; i++) {
      const angle = (i / propagationCount) * Math.PI * 2;
      const distance = i * 20;
      const intensity = Math.max(0, 1 - distance / 100) * this.holographicIntensity;

      propagation.push({
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        intensity,
        radius: 5 + intensity * 10
      });
    }

    return propagation;
  }

  /**
   * Calculate volumetric focus rendering
   */
  calculateVolumetricFocusRendering(focusX: number, focusY: number): {
    focusIntensity: number;
    focusRadius: number;
    focusDepth: number;
    focusGlow: number;
  } {
    const intensity = this.holographicIntensity;

    return {
      focusIntensity: intensity * 0.8,
      focusRadius: 50 + intensity * 30,
      focusDepth: intensity * 0.5,
      focusGlow: 10 + intensity * 15
    };
  }

  /**
   * Set pulse breathing
   */
  setPulseBreathing(enabled: boolean, speed: number): void {
    this.atmosphereConfig.pulseBreathing = enabled;
    this.atmosphereConfig.pulseSpeed = Math.max(0.1, Math.min(2, speed));
  }

  /**
   * Set neural propagation
   */
  setNeuralPropagation(enabled: boolean): void {
    this.atmosphereConfig.neuralPropagation = enabled;
  }

  /**
   * Set glow intensity
   */
  setGlowIntensity(intensity: number): void {
    this.atmosphereConfig.glowIntensity = Math.max(0, Math.min(1, intensity));
  }

  /**
   * Reset to default state
   */
  resetToDefault(): void {
    this.atmosphereConfig = this.getDefaultConfig();
    this.holographicIntensity = 0.5;
  }
}

// Singleton instance
export const searchAtmosphereInteractionEngine = new SearchAtmosphereInteractionEngine();
