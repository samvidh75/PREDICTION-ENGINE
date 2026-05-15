/**
 * Timeframe System
 * Cinematic Timeframe Transitions
 * 
 * Supports multiple timeframes with cinematic transitions:
 * - Intraday
 * - 1 week
 * - 1 month
 * - 3 months
 * - 6 months
 * - 9 months
 * - 1 year
 * - 3 years
 * - 5 years
 * - Maximum historical
 */

import {
  ChartTimeframe,
  CandlestickData
} from '../../types/ChartingTypes';

class TimeframeSystem {
  private currentTimeframe: ChartTimeframe = ChartTimeframe.ONE_YEAR;
  private previousTimeframe: ChartTimeframe | null = null;
  private isTransitioning: boolean = false;
  private transitionProgress: number = 0;
  private holographicIntensity: number = 0.5;

  /**
   * Get current timeframe
   */
  getCurrentTimeframe(): ChartTimeframe {
    return this.currentTimeframe;
  }

  /**
   * Set timeframe with cinematic transition
   */
  async setTimeframe(timeframe: ChartTimeframe): Promise<void> {
    if (this.isTransitioning || timeframe === this.currentTimeframe) return;

    this.previousTimeframe = this.currentTimeframe;
    this.currentTimeframe = timeframe;
    this.isTransitioning = true;
    this.transitionProgress = 0;

    // Perform cinematic transition
    await this.performCinematicTransition();

    this.isTransitioning = false;
    this.previousTimeframe = null;
  }

  /**
   * Check if currently transitioning
   */
  isCurrentlyTransitioning(): boolean {
    return this.isTransitioning;
  }

  /**
   * Get transition progress
   */
  getTransitionProgress(): number {
    return this.transitionProgress;
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
   * Perform cinematic transition
   */
  private async performCinematicTransition(): Promise<void> {
    const duration = 400; // ms
    const steps = 20;
    const stepDuration = duration / steps;

    for (let i = 0; i <= steps; i++) {
      this.transitionProgress = i / steps;
      await this.delay(stepDuration);
    }
  }

  /**
   * Calculate cinematic transition effects
   */
  calculateCinematicTransitionEffects(): {
    opacity: number;
    blur: number;
    scale: number;
    glow: number;
  } {
    const progress = this.transitionProgress;
    const intensity = this.holographicIntensity;

    // Fade out old timeframe, fade in new timeframe
    const opacity = progress < 0.5 
      ? 1 - (progress * 2) // Fade out
      : (progress - 0.5) * 2; // Fade in

    // Blur during transition
    const blur = Math.sin(progress * Math.PI) * 5 * intensity;

    // Slight scale effect
    const scale = 1 + Math.sin(progress * Math.PI) * 0.02 * intensity;

    // Glow during transition
    const glow = Math.sin(progress * Math.PI) * 0.3 * intensity;

    return {
      opacity,
      blur,
      scale,
      glow
    };
  }

  /**
   * Get timeframe duration in milliseconds
   */
  getTimeframeDuration(timeframe: ChartTimeframe): number {
    const now = Date.now();
    
    switch (timeframe) {
      case ChartTimeframe.INTRADAY:
        return 24 * 60 * 60 * 1000; // 1 day
      case ChartTimeframe.ONE_WEEK:
        return 7 * 24 * 60 * 60 * 1000; // 1 week
      case ChartTimeframe.ONE_MONTH:
        return 30 * 24 * 60 * 60 * 1000; // 1 month
      case ChartTimeframe.THREE_MONTHS:
        return 90 * 24 * 60 * 60 * 1000; // 3 months
      case ChartTimeframe.SIX_MONTHS:
        return 180 * 24 * 60 * 60 * 1000; // 6 months
      case ChartTimeframe.NINE_MONTHS:
        return 270 * 24 * 60 * 60 * 1000; // 9 months
      case ChartTimeframe.ONE_YEAR:
        return 365 * 24 * 60 * 60 * 1000; // 1 year
      case ChartTimeframe.THREE_YEARS:
        return 3 * 365 * 24 * 60 * 60 * 1000; // 3 years
      case ChartTimeframe.FIVE_YEARS:
        return 5 * 365 * 24 * 60 * 60 * 1000; // 5 years
      case ChartTimeframe.MAX:
        return 10 * 365 * 24 * 60 * 60 * 1000; // 10 years (max)
      default:
        return 365 * 24 * 60 * 60 * 1000;
    }
  }

  /**
   * Filter data by timeframe
   */
  filterDataByTimeframe(data: CandlestickData[], timeframe: ChartTimeframe): CandlestickData[] {
    const duration = this.getTimeframeDuration(timeframe);
    const now = Date.now();
    const cutoff = now - duration;

    return data.filter(candle => candle.timestamp >= cutoff);
  }

  /**
   * Get available timeframes
   */
  getAvailableTimeframes(): ChartTimeframe[] {
    return [
      ChartTimeframe.INTRADAY,
      ChartTimeframe.ONE_WEEK,
      ChartTimeframe.ONE_MONTH,
      ChartTimeframe.THREE_MONTHS,
      ChartTimeframe.SIX_MONTHS,
      ChartTimeframe.NINE_MONTHS,
      ChartTimeframe.ONE_YEAR,
      ChartTimeframe.THREE_YEARS,
      ChartTimeframe.FIVE_YEARS,
      ChartTimeframe.MAX
    ];
  }

  /**
   * Get timeframe display name
   */
  getTimeframeDisplayName(timeframe: ChartTimeframe): string {
    switch (timeframe) {
      case ChartTimeframe.INTRADAY:
        return 'Intraday';
      case ChartTimeframe.ONE_WEEK:
        return '1W';
      case ChartTimeframe.ONE_MONTH:
        return '1M';
      case ChartTimeframe.THREE_MONTHS:
        return '3M';
      case ChartTimeframe.SIX_MONTHS:
        return '6M';
      case ChartTimeframe.NINE_MONTHS:
        return '9M';
      case ChartTimeframe.ONE_YEAR:
        return '1Y';
      case ChartTimeframe.THREE_YEARS:
        return '3Y';
      case ChartTimeframe.FIVE_YEARS:
        return '5Y';
      case ChartTimeframe.MAX:
        return 'Max';
      default:
        return '1Y';
    }
  }

  /**
   * Get next timeframe
   */
  getNextTimeframe(): ChartTimeframe | null {
    const timeframes = this.getAvailableTimeframes();
    const currentIndex = timeframes.indexOf(this.currentTimeframe);
    
    if (currentIndex < timeframes.length - 1) {
      return timeframes[currentIndex + 1];
    }
    
    return null;
  }

  /**
   * Get previous timeframe
   */
  getPreviousTimeframe(): ChartTimeframe | null {
    const timeframes = this.getAvailableTimeframes();
    const currentIndex = timeframes.indexOf(this.currentTimeframe);
    
    if (currentIndex > 0) {
      return timeframes[currentIndex - 1];
    }
    
    return null;
  }

  /**
   * Zoom in (shorter timeframe)
   */
  zoomIn(): Promise<void> {
    const previous = this.getPreviousTimeframe();
    if (previous) {
      return this.setTimeframe(previous);
    }
    return Promise.resolve();
  }

  /**
   * Zoom out (longer timeframe)
   */
  zoomOut(): Promise<void> {
    const next = this.getNextTimeframe();
    if (next) {
      return this.setTimeframe(next);
    }
    return Promise.resolve();
  }

  /**
   * Reset to default timeframe
   */
  resetToDefault(): void {
    this.currentTimeframe = ChartTimeframe.ONE_YEAR;
    this.previousTimeframe = null;
    this.isTransitioning = false;
    this.transitionProgress = 0;
  }

  /**
   * Helper delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const timeframeSystem = new TimeframeSystem();
