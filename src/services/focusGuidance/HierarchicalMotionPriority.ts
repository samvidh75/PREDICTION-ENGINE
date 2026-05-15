/**
 * Hierarchical Motion Priority
 * Animation Importance Control
 * 
 * Ensures motion guides attention intelligently:
 * - Primary systems may pulse gently
 * - Secondary systems remain calmer
 * - Background systems move minimally
 * - NOT everything should animate equally
 */

import {
  MotionPriority,
  MotionPriorityConfig,
  FocusContext
} from './FocusGuidanceTypes';

class HierarchicalMotionPriority {
  private priorityConfigs: Map<MotionPriority, MotionPriorityConfig>;
  private globalMotionIntensity: number = 0.5;
  private motionCongestion: number = 0;

  constructor() {
    this.priorityConfigs = this.initializeDefaultConfigs();
  }

  private initializeDefaultConfigs(): Map<MotionPriority, MotionPriorityConfig> {
    const configs = new Map<MotionPriority, MotionPriorityConfig>();

    configs.set(MotionPriority.NONE, {
      pulseIntensity: 0,
      animationSpeed: 0,
      particleActivity: 0,
      transitionDuration: 0
    });

    configs.set(MotionPriority.MINIMAL, {
      pulseIntensity: 0.1,
      animationSpeed: 0.2,
      particleActivity: 0.05,
      transitionDuration: 600
    });

    configs.set(MotionPriority.SUBTLE, {
      pulseIntensity: 0.2,
      animationSpeed: 0.3,
      particleActivity: 0.1,
      transitionDuration: 500
    });

    configs.set(MotionPriority.GENTLE, {
      pulseIntensity: 0.3,
      animationSpeed: 0.5,
      particleActivity: 0.15,
      transitionDuration: 400
    });

    configs.set(MotionPriority.MODERATE, {
      pulseIntensity: 0.4,
      animationSpeed: 0.7,
      particleActivity: 0.2,
      transitionDuration: 300
    });

    return configs;
  }

  /**
   * Get motion configuration for a specific priority
   */
  getMotionConfig(priority: MotionPriority): MotionPriorityConfig {
    const config = this.priorityConfigs.get(priority);
    if (!config) return this.priorityConfigs.get(MotionPriority.MINIMAL)!;

    // Apply global motion intensity
    return {
      pulseIntensity: config.pulseIntensity * this.globalMotionIntensity,
      animationSpeed: config.animationSpeed * this.globalMotionIntensity,
      particleActivity: config.particleActivity * this.globalMotionIntensity,
      transitionDuration: config.transitionDuration
    };
  }

  /**
   * Set global motion intensity
   */
  setGlobalMotionIntensity(intensity: number): void {
    this.globalMotionIntensity = Math.max(0, Math.min(1, intensity));
  }

  /**
   * Adapt motion priority based on focus context
   */
  adaptToContext(context: FocusContext): void {
    switch (context) {
      case FocusContext.VOLATILITY:
        // Subtle motion for volatility
        this.globalMotionIntensity = 0.6;
        this.adjustPriority(MotionPriority.GENTLE, { pulseIntensity: 0.4 });
        break;

      case FocusContext.STORY_READING:
        // Minimal motion for reading
        this.globalMotionIntensity = 0.2;
        this.adjustPriority(MotionPriority.GENTLE, { pulseIntensity: 0.15 });
        break;

      case FocusContext.CHART_ANALYSIS:
        // Gentle motion for charts
        this.globalMotionIntensity = 0.4;
        break;

      case FocusContext.SCANNER_USAGE:
        // Active motion for scanner
        this.globalMotionIntensity = 0.7;
        this.adjustPriority(MotionPriority.MODERATE, { pulseIntensity: 0.5 });
        break;

      case FocusContext.COMPANY_EXPLORATION:
        // Balanced motion for exploration
        this.globalMotionIntensity = 0.5;
        break;

      default:
        // Balanced default motion
        this.globalMotionIntensity = 0.5;
        break;
    }
  }

  /**
   * Adjust specific priority configuration
   */
  private adjustPriority(priority: MotionPriority, adjustments: Partial<MotionPriorityConfig>): void {
    const config = this.priorityConfigs.get(priority);
    if (config) {
      Object.assign(config, adjustments);
    }
  }

  /**
   * Reduce animation intensity based on motion congestion
   */
  reduceAnimationIntensity(congestionLevel: number): void {
    this.motionCongestion = congestionLevel;
    const reductionFactor = 1 - (congestionLevel * 0.5);
    
    for (const [priority, config] of this.priorityConfigs) {
      if (priority !== MotionPriority.NONE) {
        config.pulseIntensity *= reductionFactor;
        config.particleActivity *= reductionFactor;
      }
    }
  }

  /**
   * Detect motion congestion
   */
  detectMotionCongestion(activeAnimations: number): void {
    const congestionThreshold = 10;
    const congestionLevel = Math.min(1, activeAnimations / congestionThreshold);
    
    if (congestionLevel > 0.6) {
      this.reduceAnimationIntensity(congestionLevel);
    }
  }

  /**
   * Get pulse intensity for an element
   */
  getPulseIntensity(priority: MotionPriority): number {
    const config = this.getMotionConfig(priority);
    return config.pulseIntensity;
  }

  /**
   * Get animation speed for an element
   */
  getAnimationSpeed(priority: MotionPriority): number {
    const config = this.getMotionConfig(priority);
    return config.animationSpeed;
  }

  /**
   * Get particle activity for an element
   */
  getParticleActivity(priority: MotionPriority): number {
    const config = this.getMotionConfig(priority);
    return config.particleActivity;
  }

  /**
   * Get transition duration for an element
   */
  getTransitionDuration(priority: MotionPriority): number {
    const config = this.getMotionConfig(priority);
    return config.transitionDuration;
  }

  /**
   * Check if motion should be enabled for a priority
   */
  shouldAnimate(priority: MotionPriority): boolean {
    return priority !== MotionPriority.NONE && this.globalMotionIntensity > 0.1;
  }

  /**
   * Reset to default configurations
   */
  resetToDefault(): void {
    this.priorityConfigs = this.initializeDefaultConfigs();
    this.globalMotionIntensity = 0.5;
    this.motionCongestion = 0;
  }
}

// Singleton instance
export const hierarchicalMotionPriority = new HierarchicalMotionPriority();
