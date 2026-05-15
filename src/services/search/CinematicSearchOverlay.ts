/**
 * Cinematic Search Overlay System
 * Visual Identity of Navigation
 * 
 * Makes search feel like entering a futuristic intelligence layer:
 * - floating holographic overlays
 * - blurred atmospheric depth
 * - adaptive search illumination
 * - laser-guided focus systems
 * - cinematic opacity transitions
 */

import {
  SearchOverlayState
} from '../../types/SearchTypes';

class CinematicSearchOverlay {
  private overlayState: SearchOverlayState;
  private holographicIntensity: number = 0.5;
  private animationFrame: number | null = null;
  private isAnimating: boolean = false;

  constructor() {
    this.overlayState = this.getDefaultState();
  }

  private getDefaultState(): SearchOverlayState {
    return {
      isOpen: false,
      opacity: 0,
      blur: 0,
      scale: 1,
      position: { x: 0, y: 0 }
    };
  }

  /**
   * Open overlay with cinematic animation
   */
  async openOverlay(): Promise<void> {
    if (this.overlayState.isOpen) return;

    this.overlayState.isOpen = true;
    await this.animateOpen();
  }

  /**
   * Close overlay with cinematic animation
   */
  async closeOverlay(): Promise<void> {
    if (!this.overlayState.isOpen) return;

    await this.animateClose();
    this.overlayState.isOpen = false;
  }

  /**
   * Check if overlay is open
   */
  isOverlayOpen(): boolean {
    return this.overlayState.isOpen;
  }

  /**
   * Get overlay state
   */
  getOverlayState(): SearchOverlayState {
    return { ...this.overlayState };
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
   * Animate open
   */
  private async animateOpen(): Promise<void> {
    this.isAnimating = true;
    const duration = 300;
    const steps = 20;
    const stepDuration = duration / steps;

    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      
      this.overlayState.opacity = eased;
      this.overlayState.blur = eased * 10 * this.holographicIntensity;
      this.overlayState.scale = 0.95 + eased * 0.05;
      
      await this.delay(stepDuration);
    }

    this.isAnimating = false;
  }

  /**
   * Animate close
   */
  private async animateClose(): Promise<void> {
    this.isAnimating = true;
    const duration = 250;
    const steps = 20;
    const stepDuration = duration / steps;

    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      // Ease in cubic
      const eased = progress * progress * progress;
      
      this.overlayState.opacity = 1 - eased;
      this.overlayState.blur = (1 - eased) * 10 * this.holographicIntensity;
      this.overlayState.scale = 1 - eased * 0.05;
      
      await this.delay(stepDuration);
    }

    this.isAnimating = false;
  }

  /**
   * Calculate floating holographic overlay
   */
  calculateFloatingHolographicOverlay(): {
    floatingOffset: { x: number; y: number };
    floatingIntensity: number;
    floatingGlow: number;
  } {
    if (!this.overlayState.isOpen) {
      return { floatingOffset: { x: 0, y: 0 }, floatingIntensity: 0, floatingGlow: 0 };
    }

    const intensity = this.holographicIntensity;
    const floatingOffset = {
      x: Math.sin(Date.now() / 2000) * 5 * intensity,
      y: Math.cos(Date.now() / 2000) * 5 * intensity
    };

    return {
      floatingOffset,
      floatingIntensity: intensity * 0.3,
      floatingGlow: 10 * intensity
    };
  }

  /**
   * Calculate blurred atmospheric depth
   */
  calculateBlurredAtmosphericDepth(): {
    backgroundBlur: number;
    depthLayers: number;
    atmosphericIntensity: number;
  } {
    if (!this.overlayState.isOpen) {
      return { backgroundBlur: 0, depthLayers: 0, atmosphericIntensity: 0 };
    }

    const intensity = this.holographicIntensity;

    return {
      backgroundBlur: this.overlayState.blur,
      depthLayers: 3,
      atmosphericIntensity: intensity * 0.5
    };
  }

  /**
   * Calculate adaptive search illumination
   */
  calculateAdaptiveSearchIllumination(): {
    illuminationIntensity: number;
    illuminationColor: string;
    illuminationRadius: number;
  } {
    if (!this.overlayState.isOpen) {
      return { illuminationIntensity: 0, illuminationColor: '#ffffff', illuminationRadius: 0 };
    }

    const intensity = this.holographicIntensity;

    return {
      illuminationIntensity: intensity * 0.6,
      illuminationColor: `rgba(0, 170, 255, ${0.3 + intensity * 0.4})`,
      illuminationRadius: 100 + intensity * 50
    };
  }

  /**
   * Calculate laser-guided focus system
   */
  calculateLaserGuidedFocus(): {
    focusIntensity: number;
    focusColor: string;
    focusWidth: number;
    focusGlow: number;
  } {
    if (!this.overlayState.isOpen) {
      return { focusIntensity: 0, focusColor: '#ffffff', focusWidth: 0, focusGlow: 0 };
    }

    const intensity = this.holographicIntensity;

    return {
      focusIntensity: intensity * 0.5,
      focusColor: '#00aaff',
      focusWidth: 1 + intensity * 2,
      focusGlow: 5 + intensity * 10
    };
  }

  /**
   * Calculate cinematic opacity transition
   */
  calculateCinematicOpacityTransition(): {
    currentOpacity: number;
    targetOpacity: number;
    transitionSpeed: number;
    easing: string;
  } {
    const currentOpacity = this.overlayState.opacity;
    const targetOpacity = this.overlayState.isOpen ? 1 : 0;
    
    return {
      currentOpacity,
      targetOpacity,
      transitionSpeed: 0.05,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    };
  }

  /**
   * Set overlay position
   */
  setOverlayPosition(x: number, y: number): void {
    this.overlayState.position = { x, y };
  }

  /**
   * Get overlay position
   */
  getOverlayPosition(): { x: number; y: number } {
    return { ...this.overlayState.position };
  }

  /**
   * Check if animating
   */
  isCurrentlyAnimating(): boolean {
    return this.isAnimating;
  }

  /**
   * Reset to default state
   */
  resetToDefault(): void {
    this.overlayState = this.getDefaultState();
    this.holographicIntensity = 0.5;
    this.isAnimating = false;
  }

  /**
   * Helper delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const cinematicSearchOverlay = new CinematicSearchOverlay();
