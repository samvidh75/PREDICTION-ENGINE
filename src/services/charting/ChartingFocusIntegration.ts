/**
 * Charting Focus Integration
 * Integration with Focus Guidance System
 * 
 * Connects the charting system with the focus guidance system:
 * - Responds to focus context changes
 * - Adapts to visual priority shifts
 * - Integrates with adaptive contrast
 * - Syncs with cinematic lighting
 * - Coordinates with information breathing
 */

import {
  FocusContext,
  VisualPriority
} from '../focusGuidance/FocusGuidanceTypes';
import {
  visualPriorityEngine
} from '../focusGuidance/VisualPriorityEngine';
import {
  adaptiveContrastIntelligence
} from '../focusGuidance/AdaptiveContrastIntelligence';
import {
  cinematicFocusLighting
} from '../focusGuidance/CinematicFocusLighting';
import {
  informationBreathingSystem
} from '../focusGuidance/InformationBreathingSystem';
import {
  hierarchicalMotionPriority
} from '../focusGuidance/HierarchicalMotionPriority';
import {
  focusLockEnvironment
} from '../focusGuidance/FocusLockEnvironment';
import {
  focusTransitionSystem
} from '../focusGuidance/FocusTransitionSystem';
import {
  cognitiveLoadOptimiser
} from '../focusGuidance/CognitiveLoadOptimiser';
import {
  spatialCalmnessArchitecture
} from '../focusGuidance/SpatialCalmnessArchitecture';
import {
  cinematicChartUniverse
} from './CinematicChartUniverse';
import {
  adaptiveCandlestickEcosystem
} from './AdaptiveCandlestickEcosystem';
import {
  multiLayerMarketIntelligenceOverlays
} from './MultiLayerMarketIntelligenceOverlays';
import {
  holographicIndicatorEnvironment
} from './HolographicIndicatorEnvironment';
import {
  motionAtmosphereSystem
} from './MotionAtmosphereSystem';

class ChartingFocusIntegration {
  private isIntegrated: boolean = false;
  private currentFocusContext: FocusContext = FocusContext.GENERAL;

  /**
   * Enable focus guidance integration
   */
  enableIntegration(): void {
    this.isIntegrated = true;
    this.synchronizeHolographicIntensity();
  }

  /**
   * Disable focus guidance integration
   */
  disableIntegration(): void {
    this.isIntegrated = false;
  }

  /**
   * Check if integrated
   */
  isFocusGuidanceIntegrated(): boolean {
    return this.isIntegrated;
  }

  /**
   * Set focus context
   */
  setFocusContext(context: FocusContext): void {
    this.currentFocusContext = context;
    
    if (this.isIntegrated) {
      this.adaptChartingToContext(context);
    }
  }

  /**
   * Get current focus context
   */
  getCurrentFocusContext(): FocusContext {
    return this.currentFocusContext;
  }

  /**
   * Adapt charting to focus context
   */
  private adaptChartingToContext(context: FocusContext): void {
    // Update focus guidance systems
    visualPriorityEngine.setFocusContext(context);
    adaptiveContrastIntelligence.adaptToContext(context);
    cinematicFocusLighting.adaptToContext(context);
    informationBreathingSystem.adaptToContext(context);
    hierarchicalMotionPriority.adaptToContext(context);

    // Adapt charting systems based on context
    switch (context) {
      case FocusContext.VOLATILITY:
        this.adaptForVolatility();
        break;
      case FocusContext.COMPANY_EXPLORATION:
        this.adaptForCompanyExploration();
        break;
      case FocusContext.MACRO_INSTABILITY:
        this.adaptForMacroInstability();
        break;
      case FocusContext.CHART_ANALYSIS:
        this.adaptForChartAnalysis();
        break;
      case FocusContext.STORY_READING:
        this.adaptForStoryReading();
        break;
      case FocusContext.SCANNER_USAGE:
        this.adaptForScannerUsage();
        break;
      case FocusContext.EARNINGS_FOCUS:
        this.adaptForEarningsFocus();
        break;
      case FocusContext.INSTITUTIONAL_ACTIVITY:
        this.adaptForInstitutionalActivity();
        break;
      default:
        this.adaptForGeneral();
        break;
    }
  }

  /**
   * Adapt for volatility context
   */
  private adaptForVolatility(): void {
    cinematicChartUniverse.setHolographicIntensity(0.6);
    adaptiveCandlestickEcosystem.setVolatilitySensitivity(0.7);
    motionAtmosphereSystem.setPulseBreathing(true, 0.4);
    multiLayerMarketIntelligenceOverlays.enableOverlay('volatility_pressure' as any);
  }

  /**
   * Adapt for company exploration context
   */
  private adaptForCompanyExploration(): void {
    cinematicChartUniverse.setHolographicIntensity(0.5);
    informationBreathingSystem.applyHolographicIsolation();
    multiLayerMarketIntelligenceOverlays.enableOverlay('healthometer' as any);
  }

  /**
   * Adapt for macro instability context
   */
  private adaptForMacroInstability(): void {
    cinematicChartUniverse.setHolographicIntensity(0.7);
    multiLayerMarketIntelligenceOverlays.enableOverlay('macro_conditions' as any);
    motionAtmosphereSystem.setPulseBreathing(true, 0.5);
  }

  /**
   * Adapt for chart analysis context
   */
  private adaptForChartAnalysis(): void {
    cinematicChartUniverse.setHolographicIntensity(0.4);
    adaptiveCandlestickEcosystem.setVolatilitySensitivity(0.3);
    holographicIndicatorEnvironment.enableIndicator('moving_average' as any);
  }

  /**
   * Adapt for story reading context
   */
  private adaptForStoryReading(): void {
    cinematicChartUniverse.setHolographicIntensity(0.3);
    informationBreathingSystem.setReadingMode(true);
    motionAtmosphereSystem.setPulseBreathing(false, 0);
    hierarchicalMotionPriority.setGlobalMotionIntensity(0.2);
  }

  /**
   * Adapt for scanner usage context
   */
  private adaptForScannerUsage(): void {
    cinematicChartUniverse.setHolographicIntensity(0.6);
    motionAtmosphereSystem.setPulseBreathing(true, 0.5);
    hierarchicalMotionPriority.setGlobalMotionIntensity(0.7);
  }

  /**
   * Adapt for earnings focus context
   */
  private adaptForEarningsFocus(): void {
    cinematicChartUniverse.setHolographicIntensity(0.5);
    multiLayerMarketIntelligenceOverlays.enableOverlay('earnings_environment' as any);
    informationBreathingSystem.applyHolographicIsolation();
  }

  /**
   * Adapt for institutional activity context
   */
  private adaptForInstitutionalActivity(): void {
    cinematicChartUniverse.setHolographicIntensity(0.6);
    multiLayerMarketIntelligenceOverlays.enableOverlay('institutional_activity' as any);
    adaptiveCandlestickEcosystem.setVolatilitySensitivity(0.4);
  }

  /**
   * Adapt for general context
   */
  private adaptForGeneral(): void {
    cinematicChartUniverse.setHolographicIntensity(0.5);
    adaptiveCandlestickEcosystem.setVolatilitySensitivity(0.5);
    informationBreathingSystem.setReadingMode(false);
    motionAtmosphereSystem.setPulseBreathing(true, 0.3);
    hierarchicalMotionPriority.setGlobalMotionIntensity(0.5);
  }

  /**
   * Synchronize holographic intensity across systems
   */
  private synchronizeHolographicIntensity(): void {
    const intensity = cinematicChartUniverse.getHolographicIntensity();
    
    adaptiveContrastIntelligence.setHolographicIntensity(intensity);
    cinematicFocusLighting.setLightingIntensity(intensity);
    multiLayerMarketIntelligenceOverlays.setHolographicIntensity(intensity);
    holographicIndicatorEnvironment.setHolographicIntensity(intensity);
    motionAtmosphereSystem.setHolographicIntensity(intensity);
  }

  /**
   * Register chart element for focus tracking
   */
  registerChartElement(elementId: string, priority: VisualPriority, contexts: FocusContext[]): void {
    visualPriorityEngine.registerElement({
      id: elementId,
      priority,
      context: contexts,
      motionPriority: 'subtle' as any,
      requiresFocusLock: false,
      cognitiveLoadImpact: 0.5
    });
  }

  /**
   * Unregister chart element
   */
  unregisterChartElement(elementId: string): void {
    visualPriorityEngine.unregisterElement(elementId);
  }

  /**
   * Apply focus lock on chart element
   */
  applyFocusLock(elementId: string): void {
    focusLockEnvironment.lockFocus(elementId);
    
    cinematicChartUniverse.applyVolumetricDepth(0.3);
    informationBreathingSystem.applyHolographicIsolation();
  }

  /**
   * Remove focus lock
   */
  removeFocusLock(): void {
    focusLockEnvironment.unlockFocus();
    
    cinematicChartUniverse.applyVolumetricDepth(0);
    informationBreathingSystem.removeHolographicIsolation();
  }

  /**
   * Apply micro-focus effect
   */
  applyMicroFocus(): void {
    focusTransitionSystem.applyMicroFocus();
    
    cinematicChartUniverse.applyCinematicLighting(0.6);
  }

  /**
   * Remove micro-focus effect
   */
  removeMicroFocus(): void {
    focusTransitionSystem.removeMicroFocus();
    
    cinematicChartUniverse.applyCinematicLighting(0.3);
  }

  /**
   * Apply cognitive load optimisation
   */
  applyCognitiveLoadOptimisation(loadLevel: number): void {
    if (loadLevel > 0.7) {
      cognitiveLoadOptimiser.applyVisualSimplification(0.5);
      cognitiveLoadOptimiser.applyAnimationReduction(0.6);
      cinematicChartUniverse.setHolographicIntensity(0.3);
      motionAtmosphereSystem.setPulseBreathing(false, 0);
    } else if (loadLevel > 0.4) {
      cognitiveLoadOptimiser.applyVisualSimplification(0.3);
      cognitiveLoadOptimiser.applyAnimationReduction(0.4);
      cinematicChartUniverse.setHolographicIntensity(0.4);
      motionAtmosphereSystem.setPulseBreathing(true, 0.2);
    }
  }

  /**
   * Apply spatial calmness
   */
  applySpatialCalmness(stressLevel: number): void {
    spatialCalmnessArchitecture.setStressLevel(stressLevel);
    
    if (stressLevel > 0.6) {
      motionAtmosphereSystem.setPulseBreathing(true, 0.2);
      cinematicChartUniverse.setHolographicIntensity(0.4);
    }
  }

  /**
   * Reset to default state
   */
  resetToDefault(): void {
    this.isIntegrated = false;
    this.currentFocusContext = FocusContext.GENERAL;
    this.adaptForGeneral();
  }
}

// Singleton instance
export const chartingFocusIntegration = new ChartingFocusIntegration();
