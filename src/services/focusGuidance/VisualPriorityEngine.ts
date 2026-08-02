/**
 * Visual Priority Engine
 * Master Attention Orchestrator
 * 
 * Determines what deserves attention first through:
 * - Adaptive brightness hierarchy
 * - Contrast scaling
 * - Glow prioritisation
 * - Motion emphasis weighting
 * - Environmental isolation
 */

import {
  VisualPriority,
  FocusContext,
  VisualPriorityConfig,
  FocusElement,
  FocusState
} from './FocusGuidanceTypes';

class VisualPriorityEngine {
  private registeredElements: Map<string, FocusElement> = new Map();
  private currentContext: FocusContext = FocusContext.GENERAL;
  private priorityConfigs: Map<VisualPriority, VisualPriorityConfig> = new Map();

  constructor() {
    this.initializeDefaultConfigs();
  }

  private initializeDefaultConfigs(): void {
    this.priorityConfigs.set(VisualPriority.PRIMARY, {
      brightness: 1.0,
      contrast: 1.0,
      glowIntensity: 0.8,
      opacity: 1.0,
      motionWeight: 0.7,
      spatialIsolation: 0.6
    });

    this.priorityConfigs.set(VisualPriority.SECONDARY, {
      brightness: 0.85,
      contrast: 0.85,
      glowIntensity: 0.5,
      opacity: 0.9,
      motionWeight: 0.4,
      spatialIsolation: 0.3
    });

    this.priorityConfigs.set(VisualPriority.TERTIARY, {
      brightness: 0.7,
      contrast: 0.7,
      glowIntensity: 0.3,
      opacity: 0.8,
      motionWeight: 0.2,
      spatialIsolation: 0.1
    });

    this.priorityConfigs.set(VisualPriority.BACKGROUND, {
      brightness: 0.5,
      contrast: 0.5,
      glowIntensity: 0.1,
      opacity: 0.6,
      motionWeight: 0.05,
      spatialIsolation: 0.0
    });

    this.priorityConfigs.set(VisualPriority.HIDDEN, {
      brightness: 0.3,
      contrast: 0.3,
      glowIntensity: 0.0,
      opacity: 0.4,
      motionWeight: 0.0,
      spatialIsolation: 0.0
    });
  }

  /**
   * Register an element for priority tracking
   */
  registerElement(element: FocusElement): void {
    this.registeredElements.set(element.id, element);
  }

  /**
   * Unregister an element
   */
  unregisterElement(elementId: string): void {
    this.registeredElements.delete(elementId);
  }

  /**
   * Set the current focus context
   * Context changes trigger adaptive priority shifts
   */
  setFocusContext(context: FocusContext): void {
    this.currentContext = context;
    this.adaptPrioritiesToContext(context);
  }

  /**
   * Adapt priority configurations based on current context
   * Priority changes should feel natural and invisible
   */
  private adaptPrioritiesToContext(context: FocusContext): void {
    const primaryConfig = this.priorityConfigs.get(VisualPriority.PRIMARY)!;
    const secondaryConfig = this.priorityConfigs.get(VisualPriority.SECONDARY)!;
    const backgroundConfig = this.priorityConfigs.get(VisualPriority.BACKGROUND)!;

    switch (context) {
      case FocusContext.VOLATILITY:
        // Volatility systems subtly elevate
        primaryConfig.glowIntensity = 0.9;
        primaryConfig.motionWeight = 0.8;
        backgroundConfig.brightness = 0.4;
        break;

      case FocusContext.COMPANY_EXPLORATION:
        // Storytelling sections gain emphasis
        primaryConfig.spatialIsolation = 0.8;
        secondaryConfig.glowIntensity = 0.6;
        break;

      case FocusContext.MACRO_INSTABILITY:
        // Macro intelligence becomes spatially dominant
        primaryConfig.brightness = 1.0;
        primaryConfig.contrast = 1.0;
        primaryConfig.spatialIsolation = 0.9;
        backgroundConfig.opacity = 0.5;
        break;

      case FocusContext.CHART_ANALYSIS:
        // Chart elements gain focus
        primaryConfig.contrast = 1.0;
        primaryConfig.glowIntensity = 0.7;
        secondaryConfig.opacity = 0.85;
        break;

      case FocusContext.STORY_READING:
        // Typography clarity prioritised
        primaryConfig.contrast = 1.0;
        primaryConfig.brightness = 0.95;
        backgroundConfig.motionWeight = 0.02;
        break;

      case FocusContext.SCANNER_USAGE:
        // Scanner elements elevated
        primaryConfig.glowIntensity = 0.85;
        primaryConfig.motionWeight = 0.6;
        secondaryConfig.motionWeight = 0.2;
        break;

      case FocusContext.EARNINGS_FOCUS:
        // Earnings intelligence dominant
        primaryConfig.spatialIsolation = 0.85;
        primaryConfig.contrast = 1.0;
        break;

      case FocusContext.INSTITUTIONAL_ACTIVITY:
        // Institutional modules elevated
        primaryConfig.glowIntensity = 0.85;
        primaryConfig.brightness = 0.95;
        break;

      default:
        // General context - balanced priorities
        this.resetToBalancedState();
        break;
    }
  }

  /**
   * Reset to balanced general state
   */
  public resetToBalancedState(): void {
    this.priorityConfigs.set(VisualPriority.PRIMARY, {
      brightness: 1.0,
      contrast: 1.0,
      glowIntensity: 0.8,
      opacity: 1.0,
      motionWeight: 0.7,
      spatialIsolation: 0.6
    });

    this.priorityConfigs.set(VisualPriority.SECONDARY, {
      brightness: 0.85,
      contrast: 0.85,
      glowIntensity: 0.5,
      opacity: 0.9,
      motionWeight: 0.4,
      spatialIsolation: 0.3
    });

    this.priorityConfigs.set(VisualPriority.BACKGROUND, {
      brightness: 0.5,
      contrast: 0.5,
      glowIntensity: 0.1,
      opacity: 0.6,
      motionWeight: 0.05,
      spatialIsolation: 0.0
    });
  }

  /**
   * Get priority configuration for a specific element
   */
  getElementPriority(elementId: string): VisualPriorityConfig | null {
    const element = this.registeredElements.get(elementId);
    if (!element) return null;

    // Check if element is relevant to current context
    const isContextRelevant = element.context.includes(this.currentContext);
    
    // Elevate priority if context-relevant
    let effectivePriority = element.priority;
    if (isContextRelevant && element.priority === VisualPriority.SECONDARY) {
      effectivePriority = VisualPriority.PRIMARY;
    }

    return this.priorityConfigs.get(effectivePriority) || null;
  }

  /**
   * Manually set element priority
   */
  setElementPriority(elementId: string, priority: VisualPriority): void {
    const element = this.registeredElements.get(elementId);
    if (element) {
      element.priority = priority;
      this.registeredElements.set(elementId, element);
    }
  }

  /**
   * Get all elements by priority level
   */
  getElementsByPriority(priority: VisualPriority): FocusElement[] {
    return Array.from(this.registeredElements.values()).filter(
      element => element.priority === priority
    );
  }

  /**
   * Get current focus state
   */
  getFocusState(): FocusState {
    const primaryElements = this.getElementsByPriority(VisualPriority.PRIMARY);
    const secondaryElements = this.getElementsByPriority(VisualPriority.SECONDARY);
    const backgroundElements = this.getElementsByPriority(VisualPriority.BACKGROUND);

    return {
      currentContext: this.currentContext,
      primaryElement: primaryElements[0]?.id || null,
      secondaryElements: secondaryElements.map(e => e.id),
      backgroundElements: backgroundElements.map(e => e.id),
      cognitiveLoad: 'moderate' as any, // Will be managed by CognitiveLoadOptimiser
      isLocked: false,
      lockedElement: null
    };
  }

  /**
   * Get all priority configurations
   */
  getAllPriorityConfigs(): Map<VisualPriority, VisualPriorityConfig> {
    return new Map(this.priorityConfigs);
  }

  /**
   * Apply adaptive brightness scaling based on content density
   */
  applyAdaptiveBrightness(density: number): void {
    const scalingFactor = 1 - (density * 0.2); // Reduce brightness as density increases
    
    for (const [priority, config] of this.priorityConfigs) {
      if (priority !== VisualPriority.PRIMARY) {
        config.brightness = Math.max(0.3, config.brightness * scalingFactor);
      }
    }
  }

  /**
   * Apply contrast scaling for readability
   */
  applyContrastScaling(readabilityScore: number): void {
    // Increase contrast for low readability scores
    const contrastBoost = readabilityScore < 0.7 ? 1.2 : 1.0;
    
    for (const [priority, config] of this.priorityConfigs) {
      if (priority === VisualPriority.PRIMARY || priority === VisualPriority.SECONDARY) {
        config.contrast = Math.min(1.0, config.contrast * contrastBoost);
      }
    }
  }

  /**
   * Apply glow prioritisation based on attention needs
   */
  applyGlowPrioritisation(attentionScore: number): void {
    // Increase glow for high attention needs
    const glowMultiplier = attentionScore > 0.8 ? 1.3 : 1.0;
    
    const primaryConfig = this.priorityConfigs.get(VisualPriority.PRIMARY)!;
    primaryConfig.glowIntensity = Math.min(1.0, primaryConfig.glowIntensity * glowMultiplier);
  }

  /**
   * Apply motion emphasis weighting
   */
  applyMotionEmphasis(motionImportance: number): void {
    const motionWeight = motionImportance * 0.8;
    
    const primaryConfig = this.priorityConfigs.get(VisualPriority.PRIMARY)!;
    primaryConfig.motionWeight = motionWeight;
    
    const secondaryConfig = this.priorityConfigs.get(VisualPriority.SECONDARY)!;
    secondaryConfig.motionWeight = motionWeight * 0.5;
  }

  /**
   * Apply environmental isolation for focused elements
   */
  applyEnvironmentalIsolation(isolationLevel: number): void {
    const primaryConfig = this.priorityConfigs.get(VisualPriority.PRIMARY)!;
    primaryConfig.spatialIsolation = isolationLevel;
    
    // Reduce background elements when isolation is high
    const backgroundConfig = this.priorityConfigs.get(VisualPriority.BACKGROUND)!;
    backgroundConfig.opacity = Math.max(0.3, 0.6 - (isolationLevel * 0.3));
  }
}

// Singleton instance
export const visualPriorityEngine = new VisualPriorityEngine();
