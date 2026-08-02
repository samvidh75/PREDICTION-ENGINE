/**
 * Information Breathing System
 * Spacing and Layout Decompression
 * 
 * Prevents information suffocation through:
 * - Adaptive spacing
 * - Modular breathing room
 * - Calm separation zones
 * - Layout decompression
 * - Dynamic whitespace scaling
 */

import {
  InformationBreathingConfig,
  FocusContext
} from './FocusGuidanceTypes';

class InformationBreathingSystem {
  private currentConfig: InformationBreathingConfig;
  private contentDensity: number = 0.5;
  private readingMode: boolean = false;

  constructor() {
    this.currentConfig = this.getDefaultConfig();
  }

  private getDefaultConfig(): InformationBreathingConfig {
    return {
      adaptiveSpacing: 1.0,
      modularBreathingRoom: 0.5,
      calmSeparationZones: 0.4,
      layoutDecompression: 0.3,
      dynamicWhitespace: 0.5
    };
  }

  /**
   * Get current breathing configuration
   */
  getCurrentConfig(): InformationBreathingConfig {
    return { ...this.currentConfig };
  }

  /**
   * Set content density
   * High complexity sections expand spacing automatically
   */
  setContentDensity(density: number): void {
    this.contentDensity = density;
    this.adaptSpacingToDensity();
  }

  /**
   * Adapt spacing based on content density
   */
  private adaptSpacingToDensity(): void {
    // Increase spacing as density increases
    const spacingMultiplier = 1 + (this.contentDensity * 0.5);
    this.currentConfig.adaptiveSpacing = Math.min(1.5, spacingMultiplier);
    
    // Increase breathing room for dense content
    this.currentConfig.modularBreathingRoom = Math.min(0.8, 0.5 + this.contentDensity * 0.3);
    
    // Enhance layout decompression
    this.currentConfig.layoutDecompression = Math.min(0.6, 0.3 + this.contentDensity * 0.3);
  }

  /**
   * Set reading mode
   * Focused reading modes reduce surrounding density
   */
  setReadingMode(enabled: boolean): void {
    this.readingMode = enabled;
    if (enabled) {
      this.enableReadingMode();
    } else {
      this.disableReadingMode();
    }
  }

  /**
   * Enable reading mode breathing
   */
  private enableReadingMode(): void {
    this.currentConfig.adaptiveSpacing = 1.3;
    this.currentConfig.modularBreathingRoom = 0.7;
    this.currentConfig.calmSeparationZones = 0.6;
    this.currentConfig.layoutDecompression = 0.5;
    this.currentConfig.dynamicWhitespace = 0.7;
  }

  /**
   * Disable reading mode breathing
   */
  private disableReadingMode(): void {
    this.currentConfig = this.getDefaultConfig();
    this.adaptSpacingToDensity();
  }

  /**
   * Adapt breathing based on focus context
   */
  adaptToContext(context: FocusContext): void {
    switch (context) {
      case FocusContext.STORY_READING:
        // Maximum breathing for reading
        this.currentConfig.adaptiveSpacing = 1.4;
        this.currentConfig.modularBreathingRoom = 0.8;
        this.currentConfig.calmSeparationZones = 0.7;
        this.currentConfig.layoutDecompression = 0.6;
        this.currentConfig.dynamicWhitespace = 0.8;
        break;

      case FocusContext.COMPANY_EXPLORATION:
        // Generous breathing for exploration
        this.currentConfig.adaptiveSpacing = 1.2;
        this.currentConfig.modularBreathingRoom = 0.6;
        this.currentConfig.calmSeparationZones = 0.5;
        this.currentConfig.layoutDecompression = 0.4;
        break;

      case FocusContext.CHART_ANALYSIS:
        // Focused breathing for charts
        this.currentConfig.adaptiveSpacing = 1.1;
        this.currentConfig.modularBreathingRoom = 0.5;
        this.currentConfig.calmSeparationZones = 0.4;
        break;

      case FocusContext.VOLATILITY:
        // Balanced breathing for volatility
        this.currentConfig.adaptiveSpacing = 1.0;
        this.currentConfig.modularBreathingRoom = 0.5;
        this.currentConfig.calmSeparationZones = 0.4;
        break;

      case FocusContext.SCANNER_USAGE:
        // Compact but breathable for scanner
        this.currentConfig.adaptiveSpacing = 0.95;
        this.currentConfig.modularBreathingRoom = 0.4;
        this.currentConfig.calmSeparationZones = 0.35;
        break;

      default:
        // Balanced default breathing
        this.resetToDefault();
        break;
    }
  }

  /**
   * Reset to default configuration
   */
  resetToDefault(): void {
    this.currentConfig = this.getDefaultConfig();
    this.adaptSpacingToDensity();
  }

  /**
   * Apply holographic isolation spacing
   * Holographic systems gain isolation spacing
   */
  applyHolographicIsolation(): void {
    this.currentConfig.calmSeparationZones = Math.min(0.7, this.currentConfig.calmSeparationZones + 0.2);
    this.currentConfig.modularBreathingRoom = Math.min(0.8, this.currentConfig.modularBreathingRoom + 0.15);
  }

  /**
   * Remove holographic isolation spacing
   */
  removeHolographicIsolation(): void {
    this.currentConfig.calmSeparationZones = Math.max(0.3, this.currentConfig.calmSeparationZones - 0.2);
    this.currentConfig.modularBreathingRoom = Math.max(0.4, this.currentConfig.modularBreathingRoom - 0.15);
  }

  /**
   * Apply adaptive spacing multiplier
   */
  applyAdaptiveSpacing(multiplier: number): void {
    this.currentConfig.adaptiveSpacing = Math.max(0.8, Math.min(1.6, multiplier));
  }

  /**
   * Apply modular breathing room
   */
  applyModularBreathingRoom(level: number): void {
    this.currentConfig.modularBreathingRoom = Math.max(0.2, Math.min(0.9, level));
  }

  /**
   * Apply calm separation zones
   */
  applyCalmSeparationZones(level: number): void {
    this.currentConfig.calmSeparationZones = Math.max(0.2, Math.min(0.8, level));
  }

  /**
   * Apply layout decompression
   */
  applyLayoutDecompression(level: number): void {
    this.currentConfig.layoutDecompression = Math.max(0.1, Math.min(0.7, level));
  }

  /**
   * Apply dynamic whitespace scaling
   */
  applyDynamicWhitespace(level: number): void {
    this.currentConfig.dynamicWhitespace = Math.max(0.2, Math.min(0.9, level));
  }

  /**
   * Get spacing value for a specific element
   * Returns the actual spacing multiplier to apply
   */
  getSpacingValue(baseSpacing: number, elementComplexity: number): number {
    const complexityAdjustment = elementComplexity * 0.2;
    const totalMultiplier = this.currentConfig.adaptiveSpacing + complexityAdjustment;
    return baseSpacing * totalMultiplier;
  }

  /**
   * Get breathing room for a module
   */
  getModuleBreathingRoom(): number {
    return this.currentConfig.modularBreathingRoom;
  }

  /**
   * Get separation zone size
   */
  getSeparationZoneSize(): number {
    return this.currentConfig.calmSeparationZones;
  }

  /**
   * Get layout decompression level
   */
  getLayoutDecompression(): number {
    return this.currentConfig.layoutDecompression;
  }

  /**
   * Get dynamic whitespace level
   */
  getDynamicWhitespace(): number {
    return this.currentConfig.dynamicWhitespace;
  }

  /**
   * Check if interface should feel cramped
   */
  isCramped(): boolean {
    return (
      this.currentConfig.adaptiveSpacing < 0.9 &&
      this.currentConfig.modularBreathingRoom < 0.4 &&
      this.contentDensity > 0.7
    );
  }

  /**
   * Auto-decompress if cramped
   */
  autoDecompress(): void {
    if (this.isCramped()) {
      this.currentConfig.adaptiveSpacing = Math.min(1.2, this.currentConfig.adaptiveSpacing + 0.2);
      this.currentConfig.modularBreathingRoom = Math.min(0.6, this.currentConfig.modularBreathingRoom + 0.15);
      this.currentConfig.layoutDecompression = Math.min(0.5, this.currentConfig.layoutDecompression + 0.15);
    }
  }
}

// Singleton instance
export const informationBreathingSystem = new InformationBreathingSystem();
