/**
 * Spatial Calmness Architecture
 * Emotional Comfort Protection
 * 
 * Even during high information density, the interface remains calm:
 * - Softened transitions
 * - Restrained glow behaviour
 * - Decompressed layouts
 * - Balanced visual weighting
 * - Environmental smoothing
 */

import {
  SpatialCalmnessConfig,
  FocusContext
} from './FocusGuidanceTypes';

class SpatialCalmnessArchitecture {
  private currentConfig: SpatialCalmnessConfig;
  private stressLevel: number = 0;

  constructor() {
    this.currentConfig = this.getDefaultConfig();
  }

  private getDefaultConfig(): SpatialCalmnessConfig {
    return {
      transitionSoftening: 0.5,
      glowRestraint: 0.4,
      layoutDecompression: 0.3,
      visualBalance: 0.5,
      environmentalSmoothing: 0.4
    };
  }

  /**
   * Get current calmness configuration
   */
  getCurrentConfig(): SpatialCalmnessConfig {
    return { ...this.currentConfig };
  }

  /**
   * Set stress level
   * Higher stress levels increase calmness measures
   */
  setStressLevel(level: number): void {
    this.stressLevel = level;
    this.adaptToStress();
  }

  /**
   * Adapt calmness based on stress level
   */
  private adaptToStress(): void {
    const stressMultiplier = this.stressLevel;
    
    // Increase calmness measures as stress increases
    this.currentConfig.transitionSoftening = Math.min(0.8, 0.5 + stressMultiplier * 0.3);
    this.currentConfig.glowRestraint = Math.min(0.7, 0.4 + stressMultiplier * 0.3);
    this.currentConfig.layoutDecompression = Math.min(0.6, 0.3 + stressMultiplier * 0.3);
    this.currentConfig.environmentalSmoothing = Math.min(0.7, 0.4 + stressMultiplier * 0.3);
  }

  /**
   * Adapt calmness based on focus context
   */
  adaptToContext(context: FocusContext): void {
    switch (context) {
      case FocusContext.VOLATILITY:
        // Extra calmness during volatility
        this.currentConfig.transitionSoftening = 0.7;
        this.currentConfig.glowRestraint = 0.5;
        this.currentConfig.layoutDecompression = 0.4;
        this.currentConfig.environmentalSmoothing = 0.6;
        break;

      case FocusContext.MACRO_INSTABILITY:
        // Calmness during macro stress
        this.currentConfig.transitionSoftening = 0.6;
        this.currentConfig.glowRestraint = 0.5;
        this.currentConfig.visualBalance = 0.6;
        this.currentConfig.environmentalSmoothing = 0.5;
        break;

      case FocusContext.STORY_READING:
        // Maximum calmness for reading
        this.currentConfig.transitionSoftening = 0.8;
        this.currentConfig.glowRestraint = 0.6;
        this.currentConfig.layoutDecompression = 0.5;
        this.currentConfig.environmentalSmoothing = 0.7;
        break;

      case FocusContext.CHART_ANALYSIS:
        // Balanced calmness for charts
        this.currentConfig.transitionSoftening = 0.5;
        this.currentConfig.glowRestraint = 0.4;
        this.currentConfig.visualBalance = 0.5;
        break;

      case FocusContext.SCANNER_USAGE:
        // Slightly more active but still calm
        this.currentConfig.transitionSoftening = 0.4;
        this.currentConfig.glowRestraint = 0.3;
        this.currentConfig.visualBalance = 0.4;
        break;

      default:
        // Balanced default calmness
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
   * Apply transition softening
   */
  applyTransitionSoftening(level: number): void {
    this.currentConfig.transitionSoftening = Math.max(0.2, Math.min(0.9, level));
  }

  /**
   * Apply glow restraint
   */
  applyGlowRestraint(level: number): void {
    this.currentConfig.glowRestraint = Math.max(0.2, Math.min(0.8, level));
  }

  /**
   * Apply layout decompression
   */
  applyLayoutDecompression(level: number): void {
    this.currentConfig.layoutDecompression = Math.max(0.1, Math.min(0.7, level));
  }

  /**
   * Apply visual balance
   */
  applyVisualBalance(level: number): void {
    this.currentConfig.visualBalance = Math.max(0.3, Math.min(0.8, level));
  }

  /**
   * Apply environmental smoothing
   */
  applyEnvironmentalSmoothing(level: number): void {
    this.currentConfig.environmentalSmoothing = Math.max(0.2, Math.min(0.8, level));
  }

  /**
   * Get transition softening level
   */
  getTransitionSoftening(): number {
    return this.currentConfig.transitionSoftening;
  }

  /**
   * Get glow restraint level
   */
  getGlowRestraint(): number {
    return this.currentConfig.glowRestraint;
  }

  /**
   * Get layout decompression level
   */
  getLayoutDecompression(): number {
    return this.currentConfig.layoutDecompression;
  }

  /**
   * Get visual balance level
   */
  getVisualBalance(): number {
    return this.currentConfig.visualBalance;
  }

  /**
   * Get environmental smoothing level
   */
  getEnvironmentalSmoothing(): number {
    return this.currentConfig.environmentalSmoothing;
  }

  /**
   * Calculate transition duration based on softening
   */
  getTransitionDuration(baseDuration: number): number {
    const softeningFactor = 1 + (this.currentConfig.transitionSoftening * 0.5);
    return baseDuration * softeningFactor;
  }

  /**
   * Calculate glow intensity based on restraint
   */
  getGlowIntensity(baseIntensity: number): number {
    const restraintFactor = 1 - (this.currentConfig.glowRestraint * 0.4);
    return baseIntensity * restraintFactor;
  }

  /**
   * Check if interface should feel emotionally aggressive
   */
  isEmotionallyAggressive(): boolean {
    return (
      this.currentConfig.transitionSoftening < 0.3 &&
      this.currentConfig.glowRestraint < 0.3 &&
      this.stressLevel > 0.6
    );
  }

  /**
   * Auto-calm if emotionally aggressive
   */
  autoCalm(): void {
    if (this.isEmotionallyAggressive()) {
      this.currentConfig.transitionSoftening = Math.min(0.6, this.currentConfig.transitionSoftening + 0.2);
      this.currentConfig.glowRestraint = Math.min(0.5, this.currentConfig.glowRestraint + 0.2);
      this.currentConfig.environmentalSmoothing = Math.min(0.6, this.currentConfig.environmentalSmoothing + 0.15);
    }
  }
}

// Singleton instance
export const spatialCalmnessArchitecture = new SpatialCalmnessArchitecture();
