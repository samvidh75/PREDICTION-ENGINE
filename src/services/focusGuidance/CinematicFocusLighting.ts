/**
 * Cinematic Focus Lighting
 * Environmental Lighting Guidance
 * 
 * Guides attention through environmental lighting:
 * - Adaptive glow diffusion
 * - Volumetric focus illumination
 * - Cinematic section isolation
 * - Subtle spatial spotlighting
 * - Laser edge emphasis
 */

import {
  CinematicLightingConfig,
  FocusContext,
  VisualPriority
} from './FocusGuidanceTypes';

class CinematicFocusLighting {
  private currentConfig: CinematicLightingConfig;
  private focusTarget: string | null = null;
  private lightingIntensity: number = 0.5;

  constructor() {
    this.currentConfig = this.getDefaultConfig();
  }

  private getDefaultConfig(): CinematicLightingConfig {
    return {
      glowDiffusion: 0.4,
      volumetricFocus: 0.3,
      sectionIsolation: 0.3,
      spatialSpotlight: 0.2,
      laserEdgeEmphasis: 0.3
    };
  }

  /**
   * Get current lighting configuration
   */
  getCurrentConfig(): CinematicLightingConfig {
    return { ...this.currentConfig };
  }

  /**
   * Set focus target for lighting
   */
  setFocusTarget(elementId: string | null): void {
    this.focusTarget = elementId;
    if (elementId) {
      this.enhanceFocusLighting();
    } else {
      this.resetToDefault();
    }
  }

  /**
   * Enhance lighting for focused element
   */
  private enhanceFocusLighting(): void {
    this.currentConfig.volumetricFocus = 0.6;
    this.currentConfig.spatialSpotlight = 0.5;
    this.currentConfig.laserEdgeEmphasis = 0.5;
    this.currentConfig.sectionIsolation = 0.5;
  }

  /**
   * Set overall lighting intensity
   */
  setLightingIntensity(intensity: number): void {
    this.lightingIntensity = intensity;
    this.adaptLightingToIntensity();
  }

  /**
   * Adapt lighting to intensity level
   */
  private adaptLightingToIntensity(): void {
    const multiplier = this.lightingIntensity;
    
    this.currentConfig.glowDiffusion = 0.4 * multiplier;
    this.currentConfig.volumetricFocus = 0.3 * multiplier;
    this.currentConfig.sectionIsolation = 0.3 * multiplier;
    this.currentConfig.spatialSpotlight = 0.2 * multiplier;
    this.currentConfig.laserEdgeEmphasis = 0.3 * multiplier;
  }

  /**
   * Adapt lighting based on focus context
   */
  adaptToContext(context: FocusContext): void {
    switch (context) {
      case FocusContext.VOLATILITY:
        // Subtle dramatic lighting for volatility
        this.currentConfig.glowDiffusion = 0.5;
        this.currentConfig.volumetricFocus = 0.4;
        this.currentConfig.spatialSpotlight = 0.3;
        break;

      case FocusContext.COMPANY_EXPLORATION:
        // Cinematic storytelling lighting
        this.currentConfig.sectionIsolation = 0.5;
        this.currentConfig.volumetricFocus = 0.4;
        this.currentConfig.glowDiffusion = 0.3;
        break;

      case FocusContext.MACRO_INSTABILITY:
        // Environmental weight for macro
        this.currentConfig.volumetricFocus = 0.5;
        this.currentConfig.sectionIsolation = 0.6;
        this.currentConfig.spatialSpotlight = 0.4;
        break;

      case FocusContext.CHART_ANALYSIS:
        // Precise lighting for charts
        this.currentConfig.laserEdgeEmphasis = 0.5;
        this.currentConfig.volumetricFocus = 0.3;
        this.currentConfig.glowDiffusion = 0.2;
        break;

      case FocusContext.STORY_READING:
        // Calm, atmospheric lighting
        this.currentConfig.glowDiffusion = 0.3;
        this.currentConfig.volumetricFocus = 0.2;
        this.currentConfig.spatialSpotlight = 0.15;
        break;

      case FocusContext.SCANNER_USAGE:
        // Active scanner lighting
        this.currentConfig.laserEdgeEmphasis = 0.6;
        this.currentConfig.spatialSpotlight = 0.4;
        this.currentConfig.glowDiffusion = 0.4;
        break;

      case FocusContext.EARNINGS_FOCUS:
        // Focused earnings lighting
        this.currentConfig.sectionIsolation = 0.5;
        this.currentConfig.volumetricFocus = 0.4;
        this.currentConfig.laserEdgeEmphasis = 0.4;
        break;

      case FocusContext.INSTITUTIONAL_ACTIVITY:
        // Institutional flow lighting
        this.currentConfig.glowDiffusion = 0.5;
        this.currentConfig.volumetricFocus = 0.4;
        this.currentConfig.spatialSpotlight = 0.3;
        break;

      default:
        // Balanced default lighting
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
   * Apply adaptive glow diffusion
   * Dynamically adjust glow based on content needs
   */
  applyAdaptiveGlowDiffusion(diffusionLevel: number): void {
    this.currentConfig.glowDiffusion = Math.max(0.1, Math.min(0.8, diffusionLevel));
  }

  /**
   * Apply volumetric focus illumination
   * Create depth-based focus effects
   */
  applyVolumetricFocus(focusLevel: number): void {
    this.currentConfig.volumetricFocus = Math.max(0.1, Math.min(0.8, focusLevel));
  }

  /**
   * Apply cinematic section isolation
   * Isolate sections with lighting
   */
  applySectionIsolation(isolationLevel: number): void {
    this.currentConfig.sectionIsolation = Math.max(0.1, Math.min(0.8, isolationLevel));
  }

  /**
   * Apply subtle spatial spotlighting
   * Create spotlight effects without being dramatic
   */
  applySpatialSpotlight(spotlightIntensity: number): void {
    this.currentConfig.spatialSpotlight = Math.max(0.05, Math.min(0.6, spotlightIntensity));
  }

  /**
   * Apply laser edge emphasis
   * Add subtle laser edge highlighting
   */
  applyLaserEdgeEmphasis(emphasisLevel: number): void {
    this.currentConfig.laserEdgeEmphasis = Math.max(0.1, Math.min(0.8, emphasisLevel));
  }

  /**
   * Get lighting configuration for a specific priority
   */
  getLightingForPriority(priority: VisualPriority): CinematicLightingConfig {
    const config = { ...this.currentConfig };
    
    switch (priority) {
      case VisualPriority.PRIMARY:
        config.volumetricFocus *= 1.3;
        config.spatialSpotlight *= 1.5;
        config.laserEdgeEmphasis *= 1.4;
        break;
      
      case VisualPriority.SECONDARY:
        config.volumetricFocus *= 1.0;
        config.spatialSpotlight *= 0.8;
        config.laserEdgeEmphasis *= 0.7;
        break;
      
      case VisualPriority.TERTIARY:
        config.volumetricFocus *= 0.6;
        config.spatialSpotlight *= 0.4;
        config.laserEdgeEmphasis *= 0.3;
        break;
      
      case VisualPriority.BACKGROUND:
        config.volumetricFocus *= 0.2;
        config.spatialSpotlight *= 0.1;
        config.laserEdgeEmphasis *= 0.1;
        break;
      
      case VisualPriority.HIDDEN:
        config.volumetricFocus = 0;
        config.spatialSpotlight = 0;
        config.laserEdgeEmphasis = 0;
        break;
    }
    
    return config;
  }

  /**
   * Apply micro-focus lighting
   * Subtle lighting changes on hover/selection
   */
  applyMicroFocusLighting(): void {
    this.currentConfig.glowDiffusion = Math.min(0.6, this.currentConfig.glowDiffusion + 0.1);
    this.currentConfig.laserEdgeEmphasis = Math.min(0.6, this.currentConfig.laserEdgeEmphasis + 0.15);
  }

  /**
   * Remove micro-focus lighting
   */
  removeMicroFocusLighting(): void {
    this.currentConfig.glowDiffusion = Math.max(0.2, this.currentConfig.glowDiffusion - 0.1);
    this.currentConfig.laserEdgeEmphasis = Math.max(0.2, this.currentConfig.laserEdgeEmphasis - 0.15);
  }

  /**
   * Get glow diffusion level
   */
  getGlowDiffusion(): number {
    return this.currentConfig.glowDiffusion;
  }

  /**
   * Get volumetric focus level
   */
  getVolumetricFocus(): number {
    return this.currentConfig.volumetricFocus;
  }

  /**
   * Get section isolation level
   */
  getSectionIsolation(): number {
    return this.currentConfig.sectionIsolation;
  }

  /**
   * Get spatial spotlight intensity
   */
  getSpatialSpotlight(): number {
    return this.currentConfig.spatialSpotlight;
  }

  /**
   * Get laser edge emphasis level
   */
  getLaserEdgeEmphasis(): number {
    return this.currentConfig.laserEdgeEmphasis;
  }
}

// Singleton instance
export const cinematicFocusLighting = new CinematicFocusLighting();
