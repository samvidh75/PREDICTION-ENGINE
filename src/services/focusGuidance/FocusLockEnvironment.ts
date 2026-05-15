/**
 * Focus Lock Environment
 * Deep Immersive Clarity
 * 
 * When users interact deeply, the environment subtly assists focus:
 * - Surrounding layers soften slightly
 * - Background telemetry reduces emphasis
 * - Unrelated motion slows subtly
 * - Focus locking should feel elegant and invisible
 */

import {
  FocusLockConfig,
  FocusContext
} from './FocusGuidanceTypes';

class FocusLockEnvironment {
  private currentConfig: FocusLockConfig;
  private lockedElement: string | null = null;
  private isLocked: boolean = false;

  constructor() {
    this.currentConfig = this.getDefaultConfig();
  }

  private getDefaultConfig(): FocusLockConfig {
    return {
      surroundingSoftening: 0.3,
      backgroundReduction: 0.2,
      unrelatedMotionSlowdown: 0.25,
      depthOfField: 0.4
    };
  }

  /**
   * Get current focus lock configuration
   */
  getCurrentConfig(): FocusLockConfig {
    return { ...this.currentConfig };
  }

  /**
   * Lock focus on a specific element
   */
  lockFocus(elementId: string): void {
    this.lockedElement = elementId;
    this.isLocked = true;
    this.enhanceFocusLock();
  }

  /**
   * Unlock focus
   */
  unlockFocus(): void {
    this.lockedElement = null;
    this.isLocked = false;
    this.resetToDefault();
  }

  /**
   * Check if focus is locked
   */
  isFocusLocked(): boolean {
    return this.isLocked;
  }

  /**
   * Get currently locked element
   */
  getLockedElement(): string | null {
    return this.lockedElement;
  }

  /**
   * Enhance focus lock when an element is locked
   */
  private enhanceFocusLock(): void {
    this.currentConfig.surroundingSoftening = 0.5;
    this.currentConfig.backgroundReduction = 0.4;
    this.currentConfig.unrelatedMotionSlowdown = 0.4;
    this.currentConfig.depthOfField = 0.6;
  }

  /**
   * Adapt focus lock based on context
   */
  adaptToContext(context: FocusContext): void {
    if (!this.isLocked) return;

    switch (context) {
      case FocusContext.CHART_ANALYSIS:
        // Deep focus for chart analysis
        this.currentConfig.surroundingSoftening = 0.6;
        this.currentConfig.backgroundReduction = 0.5;
        this.currentConfig.depthOfField = 0.7;
        break;

      case FocusContext.STORY_READING:
        // Calm focus for reading
        this.currentConfig.surroundingSoftening = 0.5;
        this.currentConfig.backgroundReduction = 0.4;
        this.currentConfig.unrelatedMotionSlowdown = 0.5;
        break;

      case FocusContext.SCANNER_USAGE:
        // Active focus for scanner
        this.currentConfig.surroundingSoftening = 0.4;
        this.currentConfig.backgroundReduction = 0.3;
        this.currentConfig.unrelatedMotionSlowdown = 0.3;
        break;

      default:
        // Balanced focus lock
        this.enhanceFocusLock();
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
   * Apply surrounding softening
   */
  applySurroundingSoftening(level: number): void {
    this.currentConfig.surroundingSoftening = Math.max(0.1, Math.min(0.8, level));
  }

  /**
   * Apply background reduction
   */
  applyBackgroundReduction(level: number): void {
    this.currentConfig.backgroundReduction = Math.max(0.1, Math.min(0.7, level));
  }

  /**
   * Apply unrelated motion slowdown
   */
  applyUnrelatedMotionSlowdown(level: number): void {
    this.currentConfig.unrelatedMotionSlowdown = Math.max(0.1, Math.min(0.6, level));
  }

  /**
   * Apply depth of field
   */
  applyDepthOfField(level: number): void {
    this.currentConfig.depthOfField = Math.max(0.2, Math.min(0.8, level));
  }

  /**
   * Get surrounding softening level
   */
  getSurroundingSoftening(): number {
    return this.currentConfig.surroundingSoftening;
  }

  /**
   * Get background reduction level
   */
  getBackgroundReduction(): number {
    return this.currentConfig.backgroundReduction;
  }

  /**
   * Get unrelated motion slowdown level
   */
  getUnrelatedMotionSlowdown(): number {
    return this.currentConfig.unrelatedMotionSlowdown;
  }

  /**
   * Get depth of field level
   */
  getDepthOfField(): number {
    return this.currentConfig.depthOfField;
  }

  /**
   * Calculate opacity for an element based on focus lock
   */
  getElementOpacity(isLockedElement: boolean, isRelated: boolean): number {
    if (isLockedElement) return 1.0;
    if (isRelated) return 1.0 - (this.currentConfig.surroundingSoftening * 0.3);
    return 1.0 - this.currentConfig.backgroundReduction;
  }

  /**
   * Calculate motion speed for an element based on focus lock
   */
  getElementMotionSpeed(isLockedElement: boolean, isRelated: boolean): number {
    if (isLockedElement) return 1.0;
    if (isRelated) return 1.0 - (this.currentConfig.unrelatedMotionSlowdown * 0.3);
    return 1.0 - this.currentConfig.unrelatedMotionSlowdown;
  }
}

// Singleton instance
export const focusLockEnvironment = new FocusLockEnvironment();
