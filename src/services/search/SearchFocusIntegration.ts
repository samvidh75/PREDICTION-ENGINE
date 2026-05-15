/**
 * Search Focus Integration
 * Integration with Focus Guidance System
 * 
 * Connects the search system with the focus guidance system:
 * - Responds to focus context changes
 * - Adapts to visual priority shifts
 * - Integrates with adaptive contrast
 * - Syncs with cinematic lighting
 * - Coordinates with information breathing
 */

import {
  FocusContext
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
  focusLockEnvironment
} from '../focusGuidance/FocusLockEnvironment';
import {
  cognitiveLoadOptimiser
} from '../focusGuidance/CognitiveLoadOptimiser';
import {
  searchAtmosphereInteractionEngine
} from './SearchAtmosphereInteractionEngine';
import {
  cinematicSearchOverlay
} from './CinematicSearchOverlay';
import {
  universalIntelligenceSearchEngine
} from './UniversalIntelligenceSearchEngine';

class SearchFocusIntegration {
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
      this.adaptSearchToContext(context);
    }
  }

  /**
   * Get current focus context
   */
  getCurrentFocusContext(): FocusContext {
    return this.currentFocusContext;
  }

  /**
   * Adapt search to focus context
   */
  private adaptSearchToContext(context: FocusContext): void {
    // Update focus guidance systems
    visualPriorityEngine.setFocusContext(context);
    adaptiveContrastIntelligence.adaptToContext(context);
    cinematicFocusLighting.adaptToContext(context);
    informationBreathingSystem.adaptToContext(context);

    // Adapt search systems based on context
    switch (context) {
      case FocusContext.SCANNER_USAGE:
        this.adaptForScannerUsage();
        break;
      case FocusContext.STORY_READING:
        this.adaptForStoryReading();
        break;
      case FocusContext.COMPANY_EXPLORATION:
        this.adaptForCompanyExploration();
        break;
      default:
        this.adaptForGeneral();
        break;
    }
  }

  /**
   * Adapt for scanner usage context
   */
  private adaptForScannerUsage(): void {
    searchAtmosphereInteractionEngine.setPulseBreathing(true, 0.6);
    searchAtmosphereInteractionEngine.setGlowIntensity(0.6);
    cinematicSearchOverlay.setHolographicIntensity(0.6);
  }

  /**
   * Adapt for story reading context
   */
  private adaptForStoryReading(): void {
    searchAtmosphereInteractionEngine.setPulseBreathing(false, 0);
    searchAtmosphereInteractionEngine.setGlowIntensity(0.3);
    cinematicSearchOverlay.setHolographicIntensity(0.3);
    informationBreathingSystem.setReadingMode(true);
  }

  /**
   * Adapt for company exploration context
   */
  private adaptForCompanyExploration(): void {
    searchAtmosphereInteractionEngine.setPulseBreathing(true, 0.4);
    searchAtmosphereInteractionEngine.setGlowIntensity(0.5);
    cinematicSearchOverlay.setHolographicIntensity(0.5);
    informationBreathingSystem.applyHolographicIsolation();
  }

  /**
   * Adapt for general context
   */
  private adaptForGeneral(): void {
    searchAtmosphereInteractionEngine.setPulseBreathing(true, 0.3);
    searchAtmosphereInteractionEngine.setGlowIntensity(0.5);
    cinematicSearchOverlay.setHolographicIntensity(0.5);
    informationBreathingSystem.setReadingMode(false);
  }

  /**
   * Synchronize holographic intensity across systems
   */
  private synchronizeHolographicIntensity(): void {
    const intensity = cinematicSearchOverlay.getHolographicIntensity();
    
    adaptiveContrastIntelligence.setHolographicIntensity(intensity);
    cinematicFocusLighting.setLightingIntensity(intensity);
    searchAtmosphereInteractionEngine.setHolographicIntensity(intensity);
    universalIntelligenceSearchEngine.setHolographicIntensity(intensity);
  }

  /**
   * Apply focus lock on search
   */
  applyFocusLock(): void {
    focusLockEnvironment.lockFocus('search');
    
    informationBreathingSystem.applyHolographicIsolation();
  }

  /**
   * Remove focus lock
   */
  removeFocusLock(): void {
    focusLockEnvironment.unlockFocus();
    
    informationBreathingSystem.removeHolographicIsolation();
  }

  /**
   * Apply cognitive load optimisation
   */
  applyCognitiveLoadOptimisation(loadLevel: number): void {
    if (loadLevel > 0.7) {
      cognitiveLoadOptimiser.applyVisualSimplification(0.5);
      cognitiveLoadOptimiser.applyAnimationReduction(0.6);
      searchAtmosphereInteractionEngine.setPulseBreathing(false, 0);
      cinematicSearchOverlay.setHolographicIntensity(0.3);
    } else if (loadLevel > 0.4) {
      cognitiveLoadOptimiser.applyVisualSimplification(0.3);
      cognitiveLoadOptimiser.applyAnimationReduction(0.4);
      searchAtmosphereInteractionEngine.setPulseBreathing(true, 0.2);
      cinematicSearchOverlay.setHolographicIntensity(0.4);
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
export const searchFocusIntegration = new SearchFocusIntegration();
