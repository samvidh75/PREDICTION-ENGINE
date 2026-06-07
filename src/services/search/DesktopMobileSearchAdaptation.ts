/**
 * Desktop & Mobile Search Adaptation
 * Cross-Device Excellence
 * 
 * Desktop search should feel like a cinematic operating system command centre:
 * - panoramic overlays
 * - side intelligence rails
 * - multi-column search ecosystems
 * - advanced keyboard navigation
 * 
 * Mobile search should feel fluid and futuristic:
 * - fullscreen overlays
 * - gesture-based exploration
 * - swipeable intelligence cards
 * - adaptive result prioritisation
 */

import {
  DeviceAdaptationConfig
} from '../../types/SearchTypes';

class DesktopMobileSearchAdaptation {
  private deviceConfig: DeviceAdaptationConfig;
  private holographicIntensity: number = 0.5;

  constructor() {
    this.deviceConfig = this.detectDevice();
    this.setupResizeListener();
  }

  private detectDevice(): DeviceAdaptationConfig {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const isMobile = screenWidth < 768;
    const isDesktop = !isMobile;

    return {
      isMobile,
      isDesktop,
      screenWidth,
      screenHeight,
      touchEnabled: 'ontouchstart' in window
    };
  }

  private setupResizeListener(): void {
    window.addEventListener('resize', () => {
      this.deviceConfig = this.detectDevice();
    });
  }

  /**
   * Get device configuration
   */
  getDeviceConfig(): DeviceAdaptationConfig {
    return { ...this.deviceConfig };
  }

  /**
   * Check if mobile
   */
  isMobile(): boolean {
    return this.deviceConfig.isMobile;
  }

  /**
   * Check if desktop
   */
  isDesktop(): boolean {
    return this.deviceConfig.isDesktop;
  }

  /**
   * Calculate desktop search layout
   */
  calculateDesktopSearchLayout(): {
    overlayWidth: number;
    overlayHeight: number;
    columnCount: number;
    sideRailEnabled: boolean;
    keyboardNavigationEnabled: boolean;
  } {
    if (!this.deviceConfig.isDesktop) {
      return {
        overlayWidth: 0,
        overlayHeight: 0,
        columnCount: 1,
        sideRailEnabled: false,
        keyboardNavigationEnabled: false
      };
    }

    return {
      overlayWidth: Math.min(800, this.deviceConfig.screenWidth * 0.7),
      overlayHeight: Math.min(600, this.deviceConfig.screenHeight * 0.8),
      columnCount: 3,
      sideRailEnabled: true,
      keyboardNavigationEnabled: true
    };
  }

  /**
   * Calculate mobile search layout
   */
  calculateMobileSearchLayout(): {
    overlayWidth: number;
    overlayHeight: number;
    fullscreen: boolean;
    swipeEnabled: boolean;
    gestureEnabled: boolean;
  } {
    if (!this.deviceConfig.isMobile) {
      return {
        overlayWidth: 0,
        overlayHeight: 0,
        fullscreen: false,
        swipeEnabled: false,
        gestureEnabled: false
      };
    }

    return {
      overlayWidth: this.deviceConfig.screenWidth,
      overlayHeight: this.deviceConfig.screenHeight,
      fullscreen: true,
      swipeEnabled: true,
      gestureEnabled: this.deviceConfig.touchEnabled
    };
  }

  /**
   * Calculate adaptive result prioritisation
   */
  calculateAdaptiveResultPrioritisation(): {
    showPreviews: boolean;
    showTelemetry: boolean;
    showInfographics: boolean;
    resultDensity: 'sparse' | 'medium' | 'dense';
  } {
    if (this.deviceConfig.isMobile) {
      return {
        showPreviews: false,
        showTelemetry: true,
        showInfographics: true,
        resultDensity: 'sparse'
      };
    }

    return {
      showPreviews: true,
      showTelemetry: true,
      showInfographics: true,
      resultDensity: 'medium'
    };
  }

  /**
   * Calculate touch target sizes
   */
  calculateTouchTargetSizes(): {
    minimumSize: number;
    recommendedSize: number;
    spacing: number;
  } {
    if (this.deviceConfig.isMobile) {
      return {
        minimumSize: 44,
        recommendedSize: 48,
        spacing: 16
      };
    }

    return {
      minimumSize: 32,
      recommendedSize: 36,
      spacing: 12
    };
  }

  /**
   * Calculate keyboard shortcuts
   */
  calculateKeyboardShortcuts(): Array<{
    key: string;
    modifiers: string[];
    action: string;
    description: string;
  }> {
    if (!this.deviceConfig.isDesktop) {
      return [];
    }

    return [
      {
        key: 'k',
        modifiers: ['meta'],
        action: 'open_search',
        description: 'Open search overlay'
      },
      {
        key: 'Escape',
        modifiers: [],
        action: 'close_search',
        description: 'Close search overlay'
      },
      {
        key: 'ArrowDown',
        modifiers: [],
        action: 'navigate_down',
        description: 'Navigate to next result'
      },
      {
        key: 'ArrowUp',
        modifiers: [],
        action: 'navigate_up',
        description: 'Navigate to previous result'
      },
      {
        key: 'Enter',
        modifiers: [],
        action: 'select_result',
        description: 'Select current result'
      }
    ];
  }

  /**
   * Calculate gesture configurations
   */
  calculateGestureConfigurations(): {
    swipeThreshold: number;
    swipeVelocity: number;
    pinchThreshold: number;
    longPressDuration: number;
  } {
    if (!this.deviceConfig.isMobile) {
      return {
        swipeThreshold: 0,
        swipeVelocity: 0,
        pinchThreshold: 0,
        longPressDuration: 0
      };
    }

    return {
      swipeThreshold: 50,
      swipeVelocity: 0.3,
      pinchThreshold: 10,
      longPressDuration: 500
    };
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
   * Reset to default state
   */
  resetToDefault(): void {
    this.deviceConfig = this.detectDevice();
    this.holographicIntensity = 0.5;
  }
}

// Singleton instance
export const desktopMobileSearchAdaptation = new DesktopMobileSearchAdaptation();
