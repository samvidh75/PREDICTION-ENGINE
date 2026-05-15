/**
 * Scroll-Based Focus System
 * 
 * As users scroll, the interface should:
 * - Prioritise active sections
 * - Soften distant modules
 * - Enhance current context
 * - Maintain narrative flow
 */

import {
  ScrollFocusConfig,
  VisualPriority
} from './FocusGuidanceTypes';
import {
  visualPriorityEngine
} from './VisualPriorityEngine';
import {
  adaptiveContrastIntelligence
} from './AdaptiveContrastIntelligence';
import {
  informationBreathingSystem
} from './InformationBreathingSystem';

class ScrollFocusSystem {
  private config: ScrollFocusConfig;
  private activeSection: string | null = null;
  private scrollPosition: number = 0;
  private sectionPositions: Map<string, { start: number; end: number }> = new Map();

  constructor() {
    this.config = this.getDefaultConfig();
  }

  private getDefaultConfig(): ScrollFocusConfig {
    return {
      activeSectionPriority: 0.8,
      distantModuleSoftening: 0.4,
      contextEnhancement: 0.6,
      narrativeFlowMaintenance: 0.5
    };
  }

  /**
   * Get current scroll focus configuration
   */
  getConfig(): ScrollFocusConfig {
    return { ...this.config };
  }

  /**
   * Set active section priority
   */
  setActiveSectionPriority(level: number): void {
    this.config.activeSectionPriority = Math.max(0.5, Math.min(1.0, level));
  }

  /**
   * Set distant module softening
   */
  setDistantModuleSoftening(level: number): void {
    this.config.distantModuleSoftening = Math.max(0.2, Math.min(0.7, level));
  }

  /**
   * Set context enhancement
   */
  setContextEnhancement(level: number): void {
    this.config.contextEnhancement = Math.max(0.3, Math.min(0.8, level));
  }

  /**
   * Set narrative flow maintenance
   */
  setNarrativeFlowMaintenance(level: number): void {
    this.config.narrativeFlowMaintenance = Math.max(0.3, Math.min(0.7, level));
  }

  /**
   * Register a section with its position
   */
  registerSection(sectionId: string, startPosition: number, endPosition: number): void {
    this.sectionPositions.set(sectionId, { start: startPosition, end: endPosition });
  }

  /**
   * Unregister a section
   */
  unregisterSection(sectionId: string): void {
    this.sectionPositions.delete(sectionId);
  }

  /**
   * Update scroll position
   */
  updateScrollPosition(position: number): void {
    this.scrollPosition = position;
    this.updateActiveSection();
    this.applyScrollBasedFocus();
  }

  /**
   * Update active section based on scroll position
   */
  private updateActiveSection(): void {
    let newActiveSection: string | null = null;
    let maxIntersection = 0;

    for (const [sectionId, positions] of this.sectionPositions) {
      const intersection = this.calculateIntersection(positions.start, positions.end);
      
      if (intersection > maxIntersection) {
        maxIntersection = intersection;
        newActiveSection = sectionId;
      }
    }

    if (newActiveSection !== this.activeSection) {
      this.activeSection = newActiveSection;
      this.onActiveSectionChange(newActiveSection);
    }
  }

  /**
   * Calculate intersection of viewport with section
   */
  private calculateIntersection(sectionStart: number, sectionEnd: number): number {
    const viewportStart = this.scrollPosition;
    const viewportEnd = this.scrollPosition + window.innerHeight;

    const overlapStart = Math.max(sectionStart, viewportStart);
    const overlapEnd = Math.min(sectionEnd, viewportEnd);
    
    if (overlapEnd <= overlapStart) return 0;
    
    return (overlapEnd - overlapStart) / (sectionEnd - sectionStart);
  }

  /**
   * Apply scroll-based focus adjustments
   */
  private applyScrollBasedFocus(): void {
    for (const [sectionId, positions] of this.sectionPositions) {
      const distance = this.calculateDistanceFromViewport(positions.start, positions.end);
      const isActive = sectionId === this.activeSection;
      
      this.applySectionFocus(sectionId, isActive, distance);
    }
  }

  /**
   * Calculate distance of section from viewport
   */
  private calculateDistanceFromViewport(sectionStart: number, sectionEnd: number): number {
    const viewportCenter = this.scrollPosition + window.innerHeight / 2;
    const sectionCenter = (sectionStart + sectionEnd) / 2;
    
    return Math.abs(viewportCenter - sectionCenter) / window.innerHeight;
  }

  /**
   * Apply focus to a specific section
   */
  private applySectionFocus(sectionId: string, isActive: boolean, distance: number): void {
    if (isActive) {
      // Active section gets priority
      visualPriorityEngine.setElementPriority(sectionId, VisualPriority.PRIMARY);
      adaptiveContrastIntelligence.applyContentBasedAdjustment(this.config.activeSectionPriority);
    } else if (distance > 1) {
      // Distant sections get softened
      const softeningFactor = 1 - (this.config.distantModuleSoftening * Math.min(1, distance - 1));
      visualPriorityEngine.setElementPriority(sectionId, VisualPriority.BACKGROUND);
    } else {
      // Nearby sections get secondary priority
      visualPriorityEngine.setElementPriority(sectionId, VisualPriority.SECONDARY);
    }
  }

  /**
   * Handle active section change
   */
  private onActiveSectionChange(newSection: string | null): void {
    if (newSection) {
      // Enhance context for active section
      informationBreathingSystem.applyAdaptiveSpacing(1 + this.config.contextEnhancement * 0.2);
    }
  }

  /**
   * Get active section
   */
  getActiveSection(): string | null {
    return this.activeSection;
  }

  /**
   * Get scroll position
   */
  getScrollPosition(): number {
    return this.scrollPosition;
  }

  /**
   * Get section positions
   */
  getSectionPositions(): Map<string, { start: number; end: number }> {
    return new Map(this.sectionPositions);
  }

  /**
   * Reset to default configuration
   */
  resetToDefault(): void {
    this.config = this.getDefaultConfig();
    this.activeSection = null;
    this.scrollPosition = 0;
  }

  /**
   * Enable narrative flow mode
   */
  enableNarrativeFlowMode(): void {
    this.config.narrativeFlowMaintenance = 0.7;
    this.config.contextEnhancement = 0.7;
    this.config.activeSectionPriority = 0.9;
  }

  /**
   * Disable narrative flow mode
   */
  disableNarrativeFlowMode(): void {
    this.config = this.getDefaultConfig();
  }

  /**
   * Get focus level for a section
   */
  getSectionFocusLevel(sectionId: string): number {
    if (sectionId === this.activeSection) {
      return 1.0;
    }

    const positions = this.sectionPositions.get(sectionId);
    if (!positions) return 0;

    const distance = this.calculateDistanceFromViewport(positions.start, positions.end);
    return Math.max(0, 1 - distance * this.config.distantModuleSoftening);
  }
}

// Singleton instance
export const scrollFocusSystem = new ScrollFocusSystem();
