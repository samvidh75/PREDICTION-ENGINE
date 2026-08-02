/**
 * Adaptive Emphasis Engine
 * Real-time Interface Emphasis Shifts
 * 
 * The UI intelligently prioritises relevant intelligence:
 * - Adaptive module scaling
 * - Dynamic glow elevation
 * - Environmental focus shifts
 * - Contextual brightness weighting
 */

import {
  AdaptiveEmphasisConfig,
  FocusContext
} from './FocusGuidanceTypes';

class AdaptiveEmphasisEngine {
  private currentConfig: AdaptiveEmphasisConfig;
  private emphasisTargets: Map<string, number> = new Map();

  constructor() {
    this.currentConfig = this.getDefaultConfig();
  }

  private getDefaultConfig(): AdaptiveEmphasisConfig {
    return {
      moduleScaling: 0.3,
      dynamicGlowElevation: 0.4,
      environmentalFocusShift: 0.3,
      contextualBrightness: 0.2
    };
  }

  /**
   * Get current emphasis configuration
   */
  getCurrentConfig(): AdaptiveEmphasisConfig {
    return { ...this.currentConfig };
  }

  /**
   * Set emphasis target for a specific element
   */
  setEmphasisTarget(elementId: string, emphasisLevel: number): void {
    this.emphasisTargets.set(elementId, emphasisLevel);
  }

  /**
   * Remove emphasis target
   */
  removeEmphasisTarget(elementId: string): void {
    this.emphasisTargets.delete(elementId);
  }

  /**
   * Get emphasis level for a specific element
   */
  getEmphasisLevel(elementId: string): number {
    return this.emphasisTargets.get(elementId) || 0;
  }

  /**
   * Adapt emphasis based on focus context
   */
  adaptToContext(context: FocusContext): void {
    switch (context) {
      case FocusContext.INSTITUTIONAL_ACTIVITY:
        // Institutional modules subtly expand
        this.currentConfig.moduleScaling = 0.5;
        this.currentConfig.dynamicGlowElevation = 0.5;
        this.currentConfig.environmentalFocusShift = 0.4;
        break;

      case FocusContext.EARNINGS_FOCUS:
        // Earnings intelligence becomes dominant
        this.currentConfig.moduleScaling = 0.6;
        this.currentConfig.dynamicGlowElevation = 0.6;
        this.currentConfig.contextualBrightness = 0.4;
        break;

      case FocusContext.MACRO_INSTABILITY:
        // Global systems gain environmental weight
        this.currentConfig.environmentalFocusShift = 0.6;
        this.currentConfig.moduleScaling = 0.4;
        this.currentConfig.dynamicGlowElevation = 0.5;
        break;

      case FocusContext.VOLATILITY:
        // Volatility systems gain emphasis
        this.currentConfig.moduleScaling = 0.5;
        this.currentConfig.dynamicGlowElevation = 0.6;
        this.currentConfig.contextualBrightness = 0.3;
        break;

      case FocusContext.COMPANY_EXPLORATION:
        // Storytelling sections gain emphasis
        this.currentConfig.moduleScaling = 0.4;
        this.currentConfig.dynamicGlowElevation = 0.4;
        this.currentConfig.environmentalFocusShift = 0.3;
        break;

      default:
        // Balanced default emphasis
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
   * Apply adaptive module scaling
   */
  applyModuleScaling(level: number): void {
    this.currentConfig.moduleScaling = Math.max(0.1, Math.min(0.8, level));
  }

  /**
   * Apply dynamic glow elevation
   */
  applyDynamicGlowElevation(level: number): void {
    this.currentConfig.dynamicGlowElevation = Math.max(0.1, Math.min(0.8, level));
  }

  /**
   * Apply environmental focus shift
   */
  applyEnvironmentalFocusShift(level: number): void {
    this.currentConfig.environmentalFocusShift = Math.max(0.1, Math.min(0.8, level));
  }

  /**
   * Apply contextual brightness weighting
   */
  applyContextualBrightness(level: number): void {
    this.currentConfig.contextualBrightness = Math.max(0.1, Math.min(0.6, level));
  }

  /**
   * Get module scaling for a specific element
   */
  getModuleScaling(elementId: string): number {
    const baseScaling = this.currentConfig.moduleScaling;
    const elementEmphasis = this.emphasisTargets.get(elementId) || 0;
    return Math.min(1.0, baseScaling + elementEmphasis);
  }

  /**
   * Get glow elevation for a specific element
   */
  getGlowElevation(elementId: string): number {
    const baseGlow = this.currentConfig.dynamicGlowElevation;
    const elementEmphasis = this.emphasisTargets.get(elementId) || 0;
    return Math.min(1.0, baseGlow + elementEmphasis);
  }

  /**
   * Get environmental focus shift
   */
  getEnvironmentalFocusShift(): number {
    return this.currentConfig.environmentalFocusShift;
  }

  /**
   * Get contextual brightness for a specific element
   */
  getContextualBrightness(elementId: string): number {
    const baseBrightness = this.currentConfig.contextualBrightness;
    const elementEmphasis = this.emphasisTargets.get(elementId) || 0;
    return Math.min(1.0, baseBrightness + elementEmphasis * 0.5);
  }

  /**
   * Clear all emphasis targets
   */
  clearEmphasisTargets(): void {
    this.emphasisTargets.clear();
  }

  /**
   * Auto-emphasise based on activity
   */
  autoEmphasiseByActivity(activityLevel: number): void {
    // Increase emphasis when activity is high
    if (activityLevel > 0.7) {
      this.currentConfig.moduleScaling = Math.min(0.6, this.currentConfig.moduleScaling + 0.1);
      this.currentConfig.dynamicGlowElevation = Math.min(0.6, this.currentConfig.dynamicGlowElevation + 0.1);
    }
  }
}

// Singleton instance
export const adaptiveEmphasisEngine = new AdaptiveEmphasisEngine();
