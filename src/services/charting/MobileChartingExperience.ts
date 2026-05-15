/**
 * Mobile Charting Experience
 * Futuristic Institutional Intelligence Device
 * 
 * Mobile charting should feel like a futuristic device:
 * - Gesture-driven navigation
 * - Layered telemetry systems
 * - Cinematic pinch interactions
 * - Adaptive infographic rendering
 */

class MobileChartingExperience {
  private isMobile: boolean = false;
  private gestureEnabled: boolean = true;
  pinchZoomEnabled: boolean = true;
  swipeNavigationEnabled: boolean = true;
  holographicIntensity: number = 0.5;
  adaptiveSimplification: number = 0.4;
  compressedMotion: number = 0.5;

  constructor() {
    this.detectMobile();
  }

  /**
   * Detect if running on mobile device
   */
  private detectMobile(): void {
    this.isMobile = window.innerWidth < 768;
  }

  /**
   * Check if mobile
   */
  isMobileDevice(): boolean {
    return this.isMobile;
  }

  /**
   * Set gesture enabled
   */
  setGestureEnabled(enabled: boolean): void {
    this.gestureEnabled = enabled;
  }

  /**
   * Set pinch zoom enabled
   */
  setPinchZoomEnabled(enabled: boolean): void {
    this.pinchZoomEnabled = enabled;
  }

  /**
   * Set swipe navigation enabled
   */
  setSwipeNavigationEnabled(enabled: boolean): void {
    this.swipeNavigationEnabled = enabled;
  }

  /**
   * Set holographic intensity
   */
  setHolographicIntensity(intensity: number): void {
    this.holographicIntensity = Math.max(0, Math.min(1, intensity));
  }

  /**
   * Set adaptive simplification
   */
  setAdaptiveSimplification(level: number): void {
    this.adaptiveSimplification = Math.max(0.2, Math.min(0.8, level));
  }

  /**
   * Set compressed motion
   */
  setCompressedMotion(level: number): void {
    this.compressedMotion = Math.max(0.3, Math.min(0.8, level));
  }

  /**
   * Calculate gesture-driven navigation
   */
  calculateGestureNavigation(gesture: 'swipe_left' | 'swipe_right' | 'swipe_up' | 'swipe_down' | 'pinch_in' | 'pinch_out'): {
    action: string;
    cinematicEffect: boolean;
    transitionDuration: number;
  } {
    if (!this.isMobile || !this.gestureEnabled) {
      return { action: 'none', cinematicEffect: false, transitionDuration: 0 };
    }

    switch (gesture) {
      case 'swipe_left':
        return {
          action: 'next_timeframe',
          cinematicEffect: true,
          transitionDuration: 300
        };
      case 'swipe_right':
        return {
          action: 'previous_timeframe',
          cinematicEffect: true,
          transitionDuration: 300
        };
      case 'swipe_up':
        return {
          action: 'zoom_in',
          cinematicEffect: true,
          transitionDuration: 250
        };
      case 'swipe_down':
        return {
          action: 'zoom_out',
          cinematicEffect: true,
          transitionDuration: 250
        };
      case 'pinch_in':
        if (!this.pinchZoomEnabled) {
          return { action: 'none', cinematicEffect: false, transitionDuration: 0 };
        }
        return {
          action: 'zoom_in',
          cinematicEffect: true,
          transitionDuration: 200
        };
      case 'pinch_out':
        if (!this.pinchZoomEnabled) {
          return { action: 'none', cinematicEffect: false, transitionDuration: 0 };
        }
        return {
          action: 'zoom_out',
          cinematicEffect: true,
          transitionDuration: 200
        };
      default:
        return { action: 'none', cinematicEffect: false, transitionDuration: 0 };
    }
  }

  /**
   * Calculate layered telemetry systems
   */
  calculateLayeredTelemetrySystems(): {
    layerCount: number;
    layerOpacity: number;
    layerSpacing: number;
    touchTargetSize: number;
  } {
    if (!this.isMobile) {
      return {
        layerCount: 5,
        layerOpacity: 0.8,
        layerSpacing: 20,
        touchTargetSize: 44
      };
    }

    return {
      layerCount: 3,
      layerOpacity: 0.7,
      layerSpacing: 15,
      touchTargetSize: 48 // Larger touch targets for mobile
    };
  }

  /**
   * Calculate cinematic pinch interactions
   */
  calculateCinematicPinchInteraction(pinchScale: number): {
    zoomLevel: number;
    scaleAnimation: number;
    focusPoint: { x: number; y: number };
    cinematicDuration: number;
  } {
    if (!this.isMobile || !this.pinchZoomEnabled) {
      return {
        zoomLevel: 1,
        scaleAnimation: 1,
        focusPoint: { x: 0.5, y: 0.5 },
        cinematicDuration: 0
      };
    }

    const zoomLevel = Math.max(0.5, Math.min(5, pinchScale));
    const scaleAnimation = this.holographicIntensity * 0.3;

    return {
      zoomLevel,
      scaleAnimation,
      focusPoint: { x: 0.5, y: 0.5 },
      cinematicDuration: 200
    };
  }

  /**
   * Calculate adaptive infographic rendering
   */
  calculateAdaptiveInfographicRendering(): {
    showSimplified: boolean;
    hideOverlays: boolean;
    compressIndicators: boolean;
    enlargeTouchTargets: boolean;
    textSize: 'small' | 'medium' | 'large';
  } {
    if (!this.isMobile) {
      return {
        showSimplified: false,
        hideOverlays: false,
        compressIndicators: false,
        enlargeTouchTargets: false,
        textSize: 'medium'
      };
    }

    return {
      showSimplified: this.adaptiveSimplification > 0.5,
      hideOverlays: this.adaptiveSimplification > 0.6,
      compressIndicators: this.adaptiveSimplification > 0.4,
      enlargeTouchTargets: true,
      textSize: this.adaptiveSimplification > 0.6 ? 'large' : 'medium'
    };
  }

  /**
   * Calculate mobile-specific motion
   */
  calculateMobileSpecificMotion(): {
    animationSpeed: number;
    particleCount: number;
    glowIntensity: number;
    transitionEasing: string;
  } {
    const speedMultiplier = 1 - this.compressedMotion * 0.5;
    
    return {
      animationSpeed: 0.5 * speedMultiplier,
      particleCount: Math.floor(10 * (1 - this.compressedMotion * 0.5)),
      glowIntensity: this.holographicIntensity * 0.7,
      transitionEasing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    };
  }

  /**
   * Calculate mobile layout adjustments
   */
  calculateMobileLayoutAdjustments(): {
    bottomNavigation: boolean;
    compactHeader: boolean;
    fullScreenMode: boolean;
    hideNonEssential: boolean;
  } {
    if (!this.isMobile) {
      return {
        bottomNavigation: false,
        compactHeader: false,
        fullScreenMode: false,
        hideNonEssential: false
      };
    }

    return {
      bottomNavigation: true,
      compactHeader: true,
      fullScreenMode: false,
      hideNonEssential: this.adaptiveSimplification > 0.5
    };
  }

  /**
   * Handle window resize
   */
  handleResize(): void {
    const wasMobile = this.isMobile;
    this.detectMobile();

    if (wasMobile !== this.isMobile) {
      // Trigger layout adjustment
      this.applyMobileOptimisations();
    }
  }

  /**
   * Apply mobile optimisations
   */
  private applyMobileOptimisations(): void {
    if (this.isMobile) {
      this.adaptiveSimplification = 0.5;
      this.compressedMotion = 0.6;
      this.holographicIntensity = 0.4;
    } else {
      this.adaptiveSimplification = 0.2;
      this.compressedMotion = 0.3;
      this.holographicIntensity = 0.5;
    }
  }

  /**
   * Enable power saving mode
   */
  enablePowerSavingMode(): void {
    this.adaptiveSimplification = 0.7;
    this.compressedMotion = 0.8;
    this.holographicIntensity = 0.3;
  }

  /**
   * Disable power saving mode
   */
  disablePowerSavingMode(): void {
    this.applyMobileOptimisations();
  }

  /**
   * Reset to default state
   */
  resetToDefault(): void {
    this.detectMobile();
    this.gestureEnabled = true;
    this.pinchZoomEnabled = true;
    this.swipeNavigationEnabled = true;
    this.holographicIntensity = 0.5;
    this.adaptiveSimplification = 0.4;
    this.compressedMotion = 0.5;
  }
}

// Singleton instance
export const mobileChartingExperience = new MobileChartingExperience();
