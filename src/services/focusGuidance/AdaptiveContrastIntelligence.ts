/**
 * Adaptive Contrast Intelligence
 * Dynamic Readability Control
 * 
 * Maintains perfect readability at all times through:
 * - Panel opacity control
 * - Typography brightness adjustment
 * - Environmental shadows
 * - Holographic glow intensity
 * - Neon diffusion
 * - Section separation
 */

import {
  AdaptiveContrastConfig,
  FocusContext
} from './FocusGuidanceTypes';

class AdaptiveContrastIntelligence {
  private currentConfig: AdaptiveContrastConfig;
  private holographicIntensity: number = 0.5;
  private telemetryDensity: number = 0.5;
  private infographicDensity: number = 0.5;

  constructor() {
    this.currentConfig = this.getDefaultConfig();
  }

  private getDefaultConfig(): AdaptiveContrastConfig {
    return {
      panelOpacity: 0.95,
      typographyBrightness: 1.0,
      environmentalShadow: 0.3,
      holographicGlow: 0.4,
      neonDiffusion: 0.3,
      sectionSeparation: 0.4
    };
  }

  /**
   * Get current contrast configuration
   */
  getCurrentConfig(): AdaptiveContrastConfig {
    return { ...this.currentConfig };
  }

  /**
   * Set holographic environment intensity
   * Heavy holographic environments reduce background intensity automatically
   */
  setHolographicIntensity(intensity: number): void {
    this.holographicIntensity = intensity;
    this.adaptToHolographicEnvironment();
  }

  /**
   * Adapt contrast for holographic environments
   */
  private adaptToHolographicEnvironment(): void {
    // Reduce background intensity when holographic effects are heavy
    const backgroundReduction = this.holographicIntensity * 0.3;
    this.currentConfig.panelOpacity = Math.max(0.7, 0.95 - backgroundReduction);
    this.currentConfig.environmentalShadow = Math.min(0.5, 0.3 + backgroundReduction);
    
    // Increase typography contrast to maintain readability
    this.currentConfig.typographyBrightness = Math.min(1.0, 1.0 + backgroundReduction * 0.5);
  }

  /**
   * Set telemetry cluster density
   * Bright telemetry clusters soften surrounding visuals
   */
  setTelemetryDensity(density: number): void {
    this.telemetryDensity = density;
    this.adaptToTelemetryDensity();
  }

  /**
   * Adapt contrast for telemetry density
   */
  private adaptToTelemetryDensity(): void {
    // Soften surrounding visuals when telemetry is dense
    const surroundingSoftening = this.telemetryDensity * 0.2;
    this.currentConfig.holographicGlow = Math.max(0.2, 0.4 - surroundingSoftening);
    this.currentConfig.neonDiffusion = Math.max(0.2, 0.3 - surroundingSoftening);
    
    // Increase panel separation for clarity
    this.currentConfig.sectionSeparation = Math.min(0.6, 0.4 + surroundingSoftening);
  }

  /**
   * Set infographic area density
   * Dense infographic areas increase typography contrast
   */
  setInfographicDensity(density: number): void {
    this.infographicDensity = density;
    this.adaptToInfographicDensity();
  }

  /**
   * Adapt contrast for infographic density
   */
  private adaptToInfographicDensity(): void {
    // Increase typography contrast in dense infographic areas
    const contrastBoost = this.infographicDensity * 0.3;
    this.currentConfig.typographyBrightness = Math.min(1.0, 1.0 + contrastBoost);
    this.currentConfig.panelOpacity = Math.max(0.85, 0.95 - contrastBoost * 0.3);
    
    // Enhance section separation
    this.currentConfig.sectionSeparation = Math.min(0.7, 0.4 + contrastBoost);
  }

  /**
   * Adapt contrast based on focus context
   */
  adaptToContext(context: FocusContext): void {
    switch (context) {
      case FocusContext.VOLATILITY:
        // High contrast for volatility data
        this.currentConfig.typographyBrightness = 1.0;
        this.currentConfig.panelOpacity = 0.98;
        this.currentConfig.environmentalShadow = 0.4;
        break;

      case FocusContext.STORY_READING:
        // Maximum readability for reading
        this.currentConfig.typographyBrightness = 1.0;
        this.currentConfig.panelOpacity = 1.0;
        this.currentConfig.holographicGlow = 0.2;
        this.currentConfig.neonDiffusion = 0.2;
        break;

      case FocusContext.CHART_ANALYSIS:
        // Balanced contrast for charts
        this.currentConfig.typographyBrightness = 0.95;
        this.currentConfig.panelOpacity = 0.95;
        this.currentConfig.environmentalShadow = 0.35;
        break;

      case FocusContext.SCANNER_USAGE:
        // Enhanced contrast for scanner
        this.currentConfig.typographyBrightness = 1.0;
        this.currentConfig.panelOpacity = 0.97;
        this.currentConfig.holographicGlow = 0.5;
        break;

      default:
        // Balanced default state
        this.resetToDefault();
        break;
    }
  }

  /**
   * Reset to default configuration
   */
  resetToDefault(): void {
    this.currentConfig = this.getDefaultConfig();
  }

  /**
   * Apply ambient light adaptation
   * Adjust contrast based on perceived ambient lighting
   */
  applyAmbientLightAdaptation(ambientLightLevel: number): void {
    // ambientLightLevel: 0 (dark) to 1 (bright)
    
    if (ambientLightLevel < 0.3) {
      // Dark environment - increase contrast
      this.currentConfig.typographyBrightness = 1.0;
      this.currentConfig.panelOpacity = 0.98;
      this.currentConfig.environmentalShadow = 0.5;
    } else if (ambientLightLevel > 0.7) {
      // Bright environment - reduce glare
      this.currentConfig.typographyBrightness = 0.95;
      this.currentConfig.panelOpacity = 0.92;
      this.currentConfig.environmentalShadow = 0.25;
    }
  }

  /**
   * Apply content-based contrast adjustment
   * Dynamically adjust based on content complexity
   */
  applyContentBasedAdjustment(complexity: number): void {
    // complexity: 0 (simple) to 1 (complex)
    
    if (complexity > 0.7) {
      // High complexity - increase separation and contrast
      this.currentConfig.sectionSeparation = Math.min(0.8, 0.4 + complexity * 0.4);
      this.currentConfig.typographyBrightness = Math.min(1.0, 1.0 + complexity * 0.2);
      this.currentConfig.holographicGlow = Math.max(0.2, 0.4 - complexity * 0.2);
    }
  }

  /**
   * Apply neon balancing
   * Dynamically control neon saturation to prevent dominance
   */
  applyNeonBalancing(neonIntensity: number): void {
    // Reduce neon diffusion if intensity is too high
    if (neonIntensity > 0.7) {
      this.currentConfig.neonDiffusion = Math.max(0.15, 0.3 - (neonIntensity - 0.7) * 0.5);
    } else {
      this.currentConfig.neonDiffusion = 0.3;
    }
  }

  /**
   * Apply holographic readability rules
   * Ensure holographic systems preserve text clarity
   */
  applyHolographicReadabilityRules(): void {
    // Always maintain minimum typography brightness
    this.currentConfig.typographyBrightness = Math.max(0.9, this.currentConfig.typographyBrightness);
    
    // Ensure holographic glow doesn't overwhelm text
    this.currentConfig.holographicGlow = Math.min(0.5, this.currentConfig.holographicGlow);
    
    // Maintain contrast hierarchy
    this.currentConfig.environmentalShadow = Math.max(0.2, Math.min(0.5, this.currentConfig.environmentalShadow));
  }

  /**
   * Get panel opacity for a specific element
   */
  getPanelOpacity(elementPriority: number): number {
    const priorityAdjustment = elementPriority * 0.1;
    return Math.min(1.0, this.currentConfig.panelOpacity + priorityAdjustment);
  }

  /**
   * Get typography brightness for a specific element
   */
  getTypographyBrightness(elementPriority: number): number {
    const priorityAdjustment = elementPriority * 0.05;
    return Math.min(1.0, this.currentConfig.typographyBrightness + priorityAdjustment);
  }

  /**
   * Get environmental shadow intensity
   */
  getEnvironmentalShadow(): number {
    return this.currentConfig.environmentalShadow;
  }

  /**
   * Get holographic glow intensity
   */
  getHolographicGlow(): number {
    return this.currentConfig.holographicGlow;
  }

  /**
   * Get neon diffusion level
   */
  getNeonDiffusion(): number {
    return this.currentConfig.neonDiffusion;
  }

  /**
   * Get section separation level
   */
  getSectionSeparation(): number {
    return this.currentConfig.sectionSeparation;
  }
}

// Singleton instance
export const adaptiveContrastIntelligence = new AdaptiveContrastIntelligence();
