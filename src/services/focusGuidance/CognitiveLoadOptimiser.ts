/**
 * Cognitive Load Optimiser
 * Mental Fatigue Reduction
 * 
 * Reduces mental fatigue by detecting and addressing:
 * - Visual overload
 * - Excessive telemetry density
 * - Motion congestion
 * - Contrast conflicts
 * - Infographic saturation
 */

import {
  CognitiveLoadConfig,
  CognitiveLoadLevel,
  FocusContext
} from './FocusGuidanceTypes';

class CognitiveLoadOptimiser {
  private currentConfig: CognitiveLoadConfig;
  private currentLoadLevel: CognitiveLoadLevel = CognitiveLoadLevel.MODERATE;
  private loadMetrics: Map<string, number> = new Map();

  constructor() {
    this.currentConfig = this.getDefaultConfig();
  }

  private getDefaultConfig(): CognitiveLoadConfig {
    return {
      visualSimplification: 0.2,
      animationReduction: 0.3,
      layoutDecompression: 0.3,
      holographicSoftening: 0.2
    };
  }

  /**
   * Get current cognitive load configuration
   */
  getCurrentConfig(): CognitiveLoadConfig {
    return { ...this.currentConfig };
  }

  /**
   * Get current cognitive load level
   */
  getLoadLevel(): CognitiveLoadLevel {
    return this.currentLoadLevel;
  }

  /**
   * Set a load metric
   */
  setLoadMetric(metric: string, value: number): void {
    this.loadMetrics.set(metric, value);
    this.recalculateLoadLevel();
  }

  /**
   * Recalculate cognitive load level based on metrics
   */
  private recalculateLoadLevel(): void {
    const visualOverload = this.loadMetrics.get('visualOverload') || 0;
    const telemetryDensity = this.loadMetrics.get('telemetryDensity') || 0;
    const motionCongestion = this.loadMetrics.get('motionCongestion') || 0;
    const contrastConflict = this.loadMetrics.get('contrastConflict') || 0;
    const infographicSaturation = this.loadMetrics.get('infographicSaturation') || 0;

    const totalLoad = (
      visualOverload * 0.25 +
      telemetryDensity * 0.2 +
      motionCongestion * 0.2 +
      contrastConflict * 0.2 +
      infographicSaturation * 0.15
    );

    if (totalLoad < 0.3) {
      this.currentLoadLevel = CognitiveLoadLevel.LOW;
    } else if (totalLoad < 0.6) {
      this.currentLoadLevel = CognitiveLoadLevel.MODERATE;
    } else if (totalLoad < 0.8) {
      this.currentLoadLevel = CognitiveLoadLevel.HIGH;
    } else {
      this.currentLoadLevel = CognitiveLoadLevel.OVERLOAD;
    }

    this.adaptToLoadLevel();
  }

  /**
   * Adapt configuration based on load level
   */
  private adaptToLoadLevel(): void {
    switch (this.currentLoadLevel) {
      case CognitiveLoadLevel.LOW:
        // Minimal optimisation needed
        this.currentConfig.visualSimplification = 0.1;
        this.currentConfig.animationReduction = 0.1;
        this.currentConfig.layoutDecompression = 0.2;
        this.currentConfig.holographicSoftening = 0.1;
        break;

      case CognitiveLoadLevel.MODERATE:
        // Balanced optimisation
        this.currentConfig.visualSimplification = 0.2;
        this.currentConfig.animationReduction = 0.3;
        this.currentConfig.layoutDecompression = 0.3;
        this.currentConfig.holographicSoftening = 0.2;
        break;

      case CognitiveLoadLevel.HIGH:
        // Significant optimisation
        this.currentConfig.visualSimplification = 0.4;
        this.currentConfig.animationReduction = 0.5;
        this.currentConfig.layoutDecompression = 0.5;
        this.currentConfig.holographicSoftening = 0.4;
        break;

      case CognitiveLoadLevel.OVERLOAD:
        // Maximum optimisation
        this.currentConfig.visualSimplification = 0.6;
        this.currentConfig.animationReduction = 0.7;
        this.currentConfig.layoutDecompression = 0.6;
        this.currentConfig.holographicSoftening = 0.6;
        break;
    }
  }

  /**
   * Adapt cognitive load based on focus context
   */
  adaptToContext(context: FocusContext): void {
    switch (context) {
      case FocusContext.VOLATILITY:
        // Allow higher load during volatility
        this.loadMetrics.set('visualOverload', 0.4);
        break;

      case FocusContext.STORY_READING:
        // Minimise load for reading
        this.loadMetrics.set('visualOverload', 0.2);
        this.loadMetrics.set('motionCongestion', 0.1);
        break;

      case FocusContext.CHART_ANALYSIS:
        // Moderate load for charts
        this.loadMetrics.set('visualOverload', 0.3);
        break;

      case FocusContext.SCANNER_USAGE:
        // Higher load acceptable for scanner
        this.loadMetrics.set('telemetryDensity', 0.5);
        break;

      default:
        // Balanced load
        this.loadMetrics.set('visualOverload', 0.3);
        this.loadMetrics.set('telemetryDensity', 0.3);
        break;
    }

    this.recalculateLoadLevel();
  }

  /**
   * Reset to default configuration
   */
  resetToDefault(): void {
    this.currentConfig = this.getDefaultConfig();
    this.loadMetrics.clear();
    this.currentLoadLevel = CognitiveLoadLevel.MODERATE;
  }

  /**
   * Apply visual simplification
   */
  applyVisualSimplification(level: number): void {
    this.currentConfig.visualSimplification = Math.max(0, Math.min(0.8, level));
  }

  /**
   * Apply animation reduction
   */
  applyAnimationReduction(level: number): void {
    this.currentConfig.animationReduction = Math.max(0, Math.min(0.8, level));
  }

  /**
   * Apply layout decompression
   */
  applyLayoutDecompression(level: number): void {
    this.currentConfig.layoutDecompression = Math.max(0.1, Math.min(0.7, level));
  }

  /**
   * Apply holographic softening
   */
  applyHolographicSoftening(level: number): void {
    this.currentConfig.holographicSoftening = Math.max(0, Math.min(0.8, level));
  }

  /**
   * Get visual simplification level
   */
  getVisualSimplification(): number {
    return this.currentConfig.visualSimplification;
  }

  /**
   * Get animation reduction level
   */
  getAnimationReduction(): number {
    return this.currentConfig.animationReduction;
  }

  /**
   * Get layout decompression level
   */
  getLayoutDecompression(): number {
    return this.currentConfig.layoutDecompression;
  }

  /**
   * Get holographic softening level
   */
  getHolographicSoftening(): number {
    return this.currentConfig.holographicSoftening;
  }

  /**
   * Detect visual overload
   */
  detectVisualOverload(elementCount: number, complexityScore: number): number {
    const overloadScore = (elementCount / 50) * 0.5 + complexityScore * 0.5;
    this.loadMetrics.set('visualOverload', Math.min(1, overloadScore));
    return overloadScore;
  }

  /**
   * Detect telemetry density
   */
  detectTelemetryDensity(telemetryCount: number, areaSize: number): number {
    const density = telemetryCount / Math.max(1, areaSize);
    this.loadMetrics.set('telemetryDensity', Math.min(1, density));
    return density;
  }

  /**
   * Detect motion congestion
   */
  detectMotionCongestion(activeAnimations: number): number {
    const congestion = activeAnimations / 15;
    this.loadMetrics.set('motionCongestion', Math.min(1, congestion));
    return congestion;
  }

  /**
   * Detect contrast conflicts
   */
  detectContrastConflicts(contrastVariance: number): number {
    this.loadMetrics.set('contrastConflict', Math.min(1, contrastVariance));
    return contrastVariance;
  }

  /**
   * Detect infographic saturation
   */
  detectInfographicSaturation(infographicCount: number, totalArea: number): number {
    const saturation = infographicCount / Math.max(1, totalArea / 100);
    this.loadMetrics.set('infographicSaturation', Math.min(1, saturation));
    return saturation;
  }

  /**
   * Auto-optimise when load is high
   */
  autoOptimise(): void {
    if (this.currentLoadLevel === CognitiveLoadLevel.HIGH || 
        this.currentLoadLevel === CognitiveLoadLevel.OVERLOAD) {
      this.currentConfig.visualSimplification = Math.min(0.7, this.currentConfig.visualSimplification + 0.1);
      this.currentConfig.animationReduction = Math.min(0.8, this.currentConfig.animationReduction + 0.1);
      this.currentConfig.layoutDecompression = Math.min(0.7, this.currentConfig.layoutDecompression + 0.1);
    }
  }
}

// Singleton instance
export const cognitiveLoadOptimiser = new CognitiveLoadOptimiser();
