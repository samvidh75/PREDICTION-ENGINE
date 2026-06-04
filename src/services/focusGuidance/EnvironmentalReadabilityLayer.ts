/**
 * Environmental Readability Layer
 * Clarity Across the Entire Ecosystem
 * 
 * Guarantees all futuristic visuals remain readable:
 * - Adaptive blur systems
 * - Dynamic shadow calibration
 * - Contrast correction
 * - Typography reinforcement
 * - Neon balancing
 */

import {
  EnvironmentalReadabilityConfig,
  FocusContext
} from './FocusGuidanceTypes';

class EnvironmentalReadabilityLayer {
  private currentConfig: EnvironmentalReadabilityConfig;
  private holographicIntensity: number = 0.5;
  private neonIntensity: number = 0.5;

  constructor() {
    this.currentConfig = this.getDefaultConfig();
  }

  private getDefaultConfig(): EnvironmentalReadabilityConfig {
    return {
      adaptiveBlur: 0.2,
      dynamicShadowCalibration: 0.3,
      contrastCorrection: 0.2,
      typographyReinforcement: 0.3,
      neonBalancing: 0.3
    };
  }

  /**
   * Get current readability configuration
   */
  getCurrentConfig(): EnvironmentalReadabilityConfig {
    return { ...this.currentConfig };
  }

  /**
   * Set holographic intensity
   */
  setHolographicIntensity(intensity: number): void {
    this.holographicIntensity = intensity;
    this.adaptToHolographicIntensity();
  }

  /**
   * Adapt readability to holographic intensity
   */
  private adaptToHolographicIntensity(): void {
    // Increase blur and shadow calibration for heavy holographic effects
    const holographicFactor = this.holographicIntensity;
    
    this.currentConfig.adaptiveBlur = Math.min(0.4, 0.2 + holographicFactor * 0.2);
    this.currentConfig.dynamicShadowCalibration = Math.min(0.5, 0.3 + holographicFactor * 0.2);
    this.currentConfig.contrastCorrection = Math.min(0.4, 0.2 + holographicFactor * 0.2);
    this.currentConfig.typographyReinforcement = Math.min(0.5, 0.3 + holographicFactor * 0.2);
  }

  /**
   * Set neon intensity
   */
  setNeonIntensity(intensity: number): void {
    this.neonIntensity = intensity;
    this.adaptToNeonIntensity();
  }

  /**
   * Adapt readability to neon intensity
   */
  private adaptToNeonIntensity(): void {
    // Increase neon balancing for high neon intensity
    this.currentConfig.neonBalancing = Math.min(0.6, 0.3 + this.neonIntensity * 0.3);
  }

  /**
   * Adapt readability based on focus context
   */
  adaptToContext(context: FocusContext): void {
    switch (context) {
      case FocusContext.STORY_READING:
        // Maximum readability for reading
        this.currentConfig.adaptiveBlur = 0.1;
        this.currentConfig.dynamicShadowCalibration = 0.4;
        this.currentConfig.contrastCorrection = 0.4;
        this.currentConfig.typographyReinforcement = 0.6;
        this.currentConfig.neonBalancing = 0.5;
        break;

      case FocusContext.CHART_ANALYSIS:
        // High readability for charts
        this.currentConfig.adaptiveBlur = 0.15;
        this.currentConfig.dynamicShadowCalibration = 0.35;
        this.currentConfig.contrastCorrection = 0.35;
        this.currentConfig.typographyReinforcement = 0.4;
        break;

      case FocusContext.VOLATILITY:
        // Enhanced readability for volatility
        this.currentConfig.contrastCorrection = 0.4;
        this.currentConfig.typographyReinforcement = 0.5;
        this.currentConfig.dynamicShadowCalibration = 0.4;
        break;

      case FocusContext.SCANNER_USAGE:
        // Balanced readability for scanner
        this.currentConfig.adaptiveBlur = 0.25;
        this.currentConfig.dynamicShadowCalibration = 0.3;
        this.currentConfig.contrastCorrection = 0.3;
        this.currentConfig.typographyReinforcement = 0.3;
        break;

      default:
        // Balanced default readability
        this.resetToDefault();
        break;
    }
  }

  /**
   * Reset to default configuration
   */
  resetToDefault(): void {
    this.currentConfig = this.getDefaultConfig();
    this.adaptToHolographicIntensity();
    this.adaptToNeonIntensity();
  }

  /**
   * Apply adaptive blur
   */
  applyAdaptiveBlur(level: number): void {
    this.currentConfig.adaptiveBlur = Math.max(0, Math.min(0.5, level));
  }

  /**
   * Apply dynamic shadow calibration
   */
  applyDynamicShadowCalibration(level: number): void {
    this.currentConfig.dynamicShadowCalibration = Math.max(0.1, Math.min(0.6, level));
  }

  /**
   * Apply contrast correction
   */
  applyContrastCorrection(level: number): void {
    this.currentConfig.contrastCorrection = Math.max(0.1, Math.min(0.5, level));
  }

  /**
   * Apply typography reinforcement
   */
  applyTypographyReinforcement(level: number): void {
    this.currentConfig.typographyReinforcement = Math.max(0.2, Math.min(0.7, level));
  }

  /**
   * Apply neon balancing
   */
  applyNeonBalancing(level: number): void {
    this.currentConfig.neonBalancing = Math.max(0.2, Math.min(0.7, level));
  }

  /**
   * Get adaptive blur level
   */
  getAdaptiveBlur(): number {
    return this.currentConfig.adaptiveBlur;
  }

  /**
   * Get dynamic shadow calibration level
   */
  getDynamicShadowCalibration(): number {
    return this.currentConfig.dynamicShadowCalibration;
  }

  /**
   * Get contrast correction level
   */
  getContrastCorrection(): number {
    return this.currentConfig.contrastCorrection;
  }

  /**
   * Get typography reinforcement level
   */
  getTypographyReinforcement(): number {
    return this.currentConfig.typographyReinforcement;
  }

  /**
   * Get neon balancing level
   */
  getNeonBalancing(): number {
    return this.currentConfig.neonBalancing;
  }

  /**
   * Apply holographic readability rules
   * Ensure holographic systems preserve text clarity
   */
  applyHolographicReadabilityRules(): void {
    // Always maintain minimum typography reinforcement
    this.currentConfig.typographyReinforcement = Math.max(0.4, this.currentConfig.typographyReinforcement);
    
    // Ensure contrast correction is sufficient
    this.currentConfig.contrastCorrection = Math.max(0.3, this.currentConfig.contrastCorrection);
    
    // Maintain shadow calibration for depth
    this.currentConfig.dynamicShadowCalibration = Math.max(0.3, this.currentConfig.dynamicShadowCalibration);
  }

  /**
   * Calculate blur amount for background elements
   */
  getBackgroundBlur(isBackground: boolean): number {
    if (!isBackground) return 0;
    return this.currentConfig.adaptiveBlur * 10; // Convert to pixels
  }

  /**
   * Calculate shadow intensity for an element
   */
  getShadowIntensity(elementPriority: number): number {
    const baseShadow = this.currentConfig.dynamicShadowCalibration;
    const priorityAdjustment = elementPriority * 0.2;
    return Math.min(1, baseShadow + priorityAdjustment);
  }

  /**
   * Calculate contrast adjustment for text
   */
  getTextContrastAdjustment(): number {
    return this.currentConfig.contrastCorrection;
  }

  /**
   * Calculate typography weight adjustment
   */
  getTypographyWeightAdjustment(): number {
    return this.currentConfig.typographyReinforcement;
  }

  /**
   * Calculate neon saturation reduction
   */
  getNeonSaturationReduction(): number {
    return this.currentConfig.neonBalancing;
  }
}

// Singleton instance
export const environmentalReadabilityLayer = new EnvironmentalReadabilityLayer();
