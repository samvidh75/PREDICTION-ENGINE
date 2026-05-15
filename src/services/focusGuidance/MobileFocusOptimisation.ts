/**
 * Mobile Focus Optimisation
 * 
 * Mobile focus guidance is EVEN MORE important:
 * - Adaptive simplification
 * - Compressed motion systems
 * - Focus-first hierarchy
 * - Contextual module isolation
 */

import {
  MobileFocusConfig,
  VisualPriority,
  MotionPriority
} from './FocusGuidanceTypes';
import {
  visualPriorityEngine
} from './VisualPriorityEngine';
import {
  hierarchicalMotionPriority
} from './HierarchicalMotionPriority';
import {
  informationBreathingSystem
} from './InformationBreathingSystem';
import {
  adaptiveContrastIntelligence
} from './AdaptiveContrastIntelligence';

class MobileFocusOptimisation {
  private config: MobileFocusConfig;
  private isMobile: boolean = false;

  constructor() {
    this.config = this.getDefaultConfig();
    this.detectMobile();
  }

  private getDefaultConfig(): MobileFocusConfig {
    return {
      adaptiveSimplification: 0.4,
      compressedMotion: 0.5,
      focusFirstHierarchy: true,
      contextualModuleIsolation: 0.6
    };
  }

  /**
   * Detect if running on mobile device
   */
  private detectMobile(): void {
    this.isMobile = window.innerWidth < 768;
  }

  /**
   * Get current mobile focus configuration
   */
  getConfig(): MobileFocusConfig {
    return { ...this.config };
  }

  /**
   * Check if running on mobile
   */
  isMobileDevice(): boolean {
    return this.isMobile;
  }

  /**
   * Set adaptive simplification level
   */
  setAdaptiveSimplification(level: number): void {
    this.config.adaptiveSimplification = Math.max(0.2, Math.min(0.8, level));
  }

  /**
   * Set compressed motion level
   */
  setCompressedMotion(level: number): void {
    this.config.compressedMotion = Math.max(0.3, Math.min(0.8, level));
  }

  /**
   * Enable/disable focus-first hierarchy
   */
  setFocusFirstHierarchy(enabled: boolean): void {
    this.config.focusFirstHierarchy = enabled;
  }

  /**
   * Set contextual module isolation level
   */
  setContextualModuleIsolation(level: number): void {
    this.config.contextualModuleIsolation = Math.max(0.4, Math.min(0.8, level));
  }

  /**
   * Apply mobile optimisations
   */
  applyMobileOptimisations(): void {
    if (!this.isMobile) return;

    // Apply adaptive simplification
    this.applySimplification();

    // Apply compressed motion
    this.applyCompressedMotion();

    // Apply focus-first hierarchy
    if (this.config.focusFirstHierarchy) {
      this.applyFocusFirstHierarchy();
    }

    // Apply contextual module isolation
    this.applyContextualIsolation();
  }

  /**
   * Apply adaptive simplification
   */
  private applySimplification(): void {
    // Reduce visual complexity
    adaptiveContrastIntelligence.applyContentBasedAdjustment(1 - this.config.adaptiveSimplification * 0.5);
    
    // Simplify information breathing
    informationBreathingSystem.applyAdaptiveSpacing(1 - this.config.adaptiveSimplification * 0.3);
    
    // Reduce holographic effects
    adaptiveContrastIntelligence.setHolographicIntensity(0.3);
  }

  /**
   * Apply compressed motion
   */
  private applyCompressedMotion(): void {
    // Reduce global motion intensity
    const motionIntensity = 1 - this.config.compressedMotion * 0.5;
    hierarchicalMotionPriority.setGlobalMotionIntensity(motionIntensity);
    
    // Priorise subtle motion only
    hierarchicalMotionPriority.reduceAnimationIntensity(0.4);
  }

  /**
   * Apply focus-first hierarchy
   */
  private applyFocusFirstHierarchy(): void {
    // Elevate primary elements
    const primaryElements = visualPriorityEngine.getElementsByPriority(VisualPriority.PRIMARY);
    primaryElements.forEach(element => {
      visualPriorityEngine.setElementPriority(element.id, VisualPriority.PRIMARY);
    });

    // Demote tertiary and background elements
    const tertiaryElements = visualPriorityEngine.getElementsByPriority(VisualPriority.TERTIARY);
    tertiaryElements.forEach(element => {
      visualPriorityEngine.setElementPriority(element.id, VisualPriority.BACKGROUND);
    });

    const backgroundElements = visualPriorityEngine.getElementsByPriority(VisualPriority.BACKGROUND);
    backgroundElements.forEach(element => {
      visualPriorityEngine.setElementPriority(element.id, VisualPriority.HIDDEN);
    });
  }

  /**
   * Apply contextual module isolation
   */
  private applyContextualIsolation(): void {
    // Increase separation between modules
    informationBreathingSystem.applyCalmSeparationZones(this.config.contextualModuleIsolation);
    
    // Increase modular breathing room
    informationBreathingSystem.applyModularBreathingRoom(this.config.contextualModuleIsolation);
  }

  /**
   * Remove mobile optimisations
   */
  removeMobileOptimisations(): void {
    // Reset to default configurations
    adaptiveContrastIntelligence.resetToDefault();
    informationBreathingSystem.resetToDefault();
    hierarchicalMotionPriority.resetToDefault();
    visualPriorityEngine.resetToBalancedState();
  }

  /**
   * Handle window resize
   */
  handleResize(): void {
    const wasMobile = this.isMobile;
    this.detectMobile();

    if (wasMobile !== this.isMobile) {
      if (this.isMobile) {
        this.applyMobileOptimisations();
      } else {
        this.removeMobileOptimisations();
      }
    }
  }

  /**
   * Get mobile-specific motion priority
   */
  getMobileMotionPriority(basePriority: MotionPriority): MotionPriority {
    if (!this.isMobile) return basePriority;

    // Compress motion priorities on mobile
    switch (basePriority) {
      case MotionPriority.MODERATE:
        return MotionPriority.GENTLE;
      case MotionPriority.GENTLE:
        return MotionPriority.SUBTLE;
      case MotionPriority.SUBTLE:
        return MotionPriority.MINIMAL;
      default:
        return basePriority;
    }
  }

  /**
   * Get mobile-specific visual priority
   */
  getMobileVisualPriority(basePriority: VisualPriority): VisualPriority {
    if (!this.isMobile) return basePriority;

    // Compress visual priorities on mobile
    switch (basePriority) {
      case VisualPriority.TERTIARY:
        return VisualPriority.BACKGROUND;
      case VisualPriority.BACKGROUND:
        return VisualPriority.HIDDEN;
      default:
        return basePriority;
    }
  }

  /**
   * Reset to default configuration
   */
  resetToDefault(): void {
    this.config = this.getDefaultConfig();
  }

  /**
   * Enable power saving mode
   */
  enablePowerSavingMode(): void {
    this.config.adaptiveSimplification = 0.7;
    this.config.compressedMotion = 0.8;
    this.config.focusFirstHierarchy = true;
    this.applyMobileOptimisations();
  }

  /**
   * Disable power saving mode
   */
  disablePowerSavingMode(): void {
    this.config = this.getDefaultConfig();
    this.applyMobileOptimisations();
  }
}

// Singleton instance
export const mobileFocusOptimisation = new MobileFocusOptimisation();
