/**
 * Laser-Guided Chart Interaction System
 * Futuristic Interaction Layer
 * 
 * Makes chart exploration feel precision-engineered:
 * - Holographic crosshairs
 * - Adaptive telemetry focus
 * - Volumetric hover systems
 * - Cinematic zoom transitions
 * - Neural interaction propagation
 */

import {
  ChartInteractionState
} from '../../types/ChartingTypes';

class LaserGuidedChartInteraction {
  private interactionState: ChartInteractionState;
  private holographicIntensity: number = 0.5;
  private hoverDebounce: number | null = null;
  private zoomLevel: number = 1;
  private panOffset: { x: number; y: number } = { x: 0, y: 0 };

  constructor() {
    this.interactionState = this.getDefaultInteractionState();
  }

  private getDefaultInteractionState(): ChartInteractionState {
    return {
      isHovering: false,
      hoverX: null,
      hoverY: null,
      isZooming: false,
      isPanning: false,
      selectedRange: null,
      crosshairEnabled: true
    };
  }

  /**
   * Get current interaction state
   */
  getInteractionState(): ChartInteractionState {
    return { ...this.interactionState };
  }

  /**
   * Set hover position
   */
  setHoverPosition(x: number, y: number): void {
    this.interactionState.isHovering = true;
    this.interactionState.hoverX = x;
    this.interactionState.hoverY = y;
  }

  /**
   * Clear hover
   */
  clearHover(): void {
    this.interactionState.isHovering = false;
    this.interactionState.hoverX = null;
    this.interactionState.hoverY = null;
  }

  /**
   * Enable/disable crosshair
   */
  setCrosshairEnabled(enabled: boolean): void {
    this.interactionState.crosshairEnabled = enabled;
  }

  /**
   * Start zoom
   */
  startZoom(): void {
    this.interactionState.isZooming = true;
  }

  /**
   * End zoom
   */
  endZoom(): void {
    this.interactionState.isZooming = false;
  }

  /**
   * Set zoom level
   */
  setZoomLevel(level: number): void {
    this.zoomLevel = Math.max(0.5, Math.min(5, level));
  }

  /**
   * Get zoom level
   */
  getZoomLevel(): number {
    return this.zoomLevel;
  }

  /**
   * Start pan
   */
  startPan(): void {
    this.interactionState.isPanning = true;
  }

  /**
   * End pan
   */
  endPan(): void {
    this.interactionState.isPanning = false;
  }

  /**
   * Set pan offset
   */
  setPanOffset(x: number, y: number): void {
    this.panOffset = { x, y };
  }

  /**
   * Get pan offset
   */
  getPanOffset(): { x: number; y: number } {
    return { ...this.panOffset };
  }

  /**
   * Set selected range
   */
  setSelectedRange(start: number, end: number): void {
    this.interactionState.selectedRange = { start, end };
  }

  /**
   * Clear selected range
   */
  clearSelectedRange(): void {
    this.interactionState.selectedRange = null;
  }

  /**
   * Set holographic intensity
   */
  setHolographicIntensity(intensity: number): void {
    this.holographicIntensity = Math.max(0, Math.min(1, intensity));
  }

  /**
   * Get holographic intensity
   */
  getHolographicIntensity(): number {
    return this.holographicIntensity;
  }

  /**
   * Calculate holographic crosshair
   */
  calculateHolographicCrosshair(): {
    horizontalLine: { x1: number; y1: number; x2: number; y2: number; color: string; width: number; glow: number };
    verticalLine: { x1: number; y1: number; x2: number; y2: number; color: string; width: number; glow: number };
  } | null {
    if (!this.interactionState.crosshairEnabled || !this.interactionState.hoverX || !this.interactionState.hoverY) {
      return null;
    }

    const x = this.interactionState.hoverX;
    const y = this.interactionState.hoverY;
    const intensity = this.holographicIntensity;

    return {
      horizontalLine: {
        x1: 0,
        y1: y,
        x2: 10000, // Will be clipped to canvas width
        y2: y,
        color: `rgba(0, 170, 255, ${0.5 + intensity * 0.3})`,
        width: 1,
        glow: 5 + intensity * 10
      },
      verticalLine: {
        x1: x,
        y1: 0,
        x2: x,
        y2: 10000, // Will be clipped to canvas height
        color: `rgba(0, 170, 255, ${0.5 + intensity * 0.3})`,
        width: 1,
        glow: 5 + intensity * 10
      }
    };
  }

  /**
   * Calculate adaptive telemetry focus
   */
  calculateAdaptiveTelemetryFocus(): {
    focusRadius: number;
    focusIntensity: number;
    focusColor: string;
  } | null {
    if (!this.interactionState.isHovering) {
      return null;
    }

    const intensity = this.holographicIntensity;

    return {
      focusRadius: 50 + intensity * 100,
      focusIntensity: intensity * 0.6,
      focusColor: `rgba(0, 170, 255, ${0.2 + intensity * 0.3})`
    };
  }

  /**
   * Calculate volumetric hover system
   */
  calculateVolumetricHoverSystem(): {
    particleCount: number;
    particleSize: number;
    particleSpeed: number;
    particleColor: string;
  } | null {
    if (!this.interactionState.isHovering) {
      return null;
    }

    const intensity = this.holographicIntensity;

    return {
      particleCount: Math.floor(10 + intensity * 40),
      particleSize: 2 + intensity * 4,
      particleSpeed: 1 + intensity * 2,
      particleColor: `rgba(0, 170, 255, ${0.5 + intensity * 0.3})`
    };
  }

  /**
   * Calculate cinematic zoom transition
   */
  calculateCinematicZoomTransition(fromLevel: number, toLevel: number): {
    duration: number;
    easing: string;
    intermediateSteps: number[];
  } {
    const steps = 20;
    const intermediateSteps: number[] = [];
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Ease out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      intermediateSteps.push(fromLevel + (toLevel - fromLevel) * eased);
    }

    return {
      duration: 400,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      intermediateSteps
    };
  }

  /**
   * Calculate neural interaction propagation
   */
  calculateNeuralInteractionPropagation(): {
    propagationRadius: number;
    propagationSpeed: number;
    propagationIntensity: number;
    connectionCount: number;
  } | null {
    if (!this.interactionState.isHovering) {
      return null;
    }

    const intensity = this.holographicIntensity;

    return {
      propagationRadius: 100 + intensity * 200,
      propagationSpeed: 2 + intensity * 3,
      propagationIntensity: intensity * 0.5,
      connectionCount: Math.floor(5 + intensity * 15)
    };
  }

  /**
   * Calculate edge sharpening on hover
   */
  calculateEdgeSharpening(): {
    sharpeningIntensity: number;
    sharpeningRadius: number;
  } | null {
    if (!this.interactionState.isHovering) {
      return null;
    }

    const intensity = this.holographicIntensity;

    return {
      sharpeningIntensity: intensity * 0.4,
      sharpeningRadius: 20 + intensity * 30
    };
  }

  /**
   * Calculate glow diffusion on hover
   */
  calculateGlowDiffusion(): {
    glowRadius: number;
    glowIntensity: number;
    glowColor: string;
  } | null {
    if (!this.interactionState.isHovering) {
      return null;
    }

    const intensity = this.holographicIntensity;

    return {
      glowRadius: 15 + intensity * 25,
      glowIntensity: intensity * 0.5,
      glowColor: `rgba(0, 170, 255, ${0.3 + intensity * 0.4})`
    };
  }

  /**
   * Calculate environmental shadow adjustment
   */
  calculateEnvironmentalShadowAdjustment(): {
    shadowIntensity: number;
    shadowBlur: number;
    shadowColor: string;
  } | null {
    if (!this.interactionState.isHovering) {
      return null;
    }

    const intensity = this.holographicIntensity;

    return {
      shadowIntensity: intensity * 0.3,
      shadowBlur: 10 + intensity * 20,
      shadowColor: `rgba(0, 0, 0, ${0.2 + intensity * 0.3})`
    };
  }

  /**
   * Calculate typography clarity enhancement
   */
  calculateTypographyClarity(): {
    clarityBoost: number;
    contrastEnhancement: number;
  } | null {
    if (!this.interactionState.isHovering) {
      return null;
    }

    const intensity = this.holographicIntensity;

    return {
      clarityBoost: intensity * 0.2,
      contrastEnhancement: intensity * 0.15
    };
  }

  /**
   * Reset to default state
   */
  resetToDefault(): void {
    this.interactionState = this.getDefaultInteractionState();
    this.holographicIntensity = 0.5;
    this.zoomLevel = 1;
    this.panOffset = { x: 0, y: 0 };
  }
}

// Singleton instance
export const laserGuidedChartInteraction = new LaserGuidedChartInteraction();
