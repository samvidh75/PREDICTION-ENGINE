/**
 * Cinematic Chart Universe
 * Visual Core Foundation
 * 
 * Creates the most futuristic financial charting environment:
 * - Volumetric rendering
 * - Cinematic lighting
 * - Holographic atmosphere
 * - Spatially intelligent layout
 * - Institutionally precise visualization
 */

import {
  ChartState,
  ChartRenderConfig,
  ChartAtmosphereConfig,
  ChartTimeframe,
  CandlestickData
} from '../../types/ChartingTypes';

class CinematicChartUniverse {
  private renderConfig: ChartRenderConfig;
  private atmosphereConfig: ChartAtmosphereConfig;
  private currentTimeframe: ChartTimeframe;
  private data: CandlestickData[] = [];
  private canvasContext: CanvasRenderingContext2D | null = null;
  private holographicIntensity: number = 0.5;

  constructor() {
    this.renderConfig = this.getDefaultRenderConfig();
    this.atmosphereConfig = this.getDefaultAtmosphereConfig();
    this.currentTimeframe = ChartTimeframe.ONE_YEAR;
  }

  private getDefaultRenderConfig(): ChartRenderConfig {
    return {
      showGrid: true,
      showVolume: true,
      showIndicators: true,
      showOverlays: true,
      candleStyle: 'standard',
      colorScheme: 'holographic',
      animationEnabled: true,
      holographicIntensity: 0.5
    };
  }

  private getDefaultAtmosphereConfig(): ChartAtmosphereConfig {
    return {
      pulseBreathing: true,
      pulseIntensity: 0.3,
      telemetryDrift: true,
      driftSpeed: 0.5,
      cinematicTransitions: true,
      neuralPropagation: true
    };
  }

  /**
   * Initialize canvas context for rendering
   */
  initializeCanvas(canvas: HTMLCanvasElement): void {
    this.canvasContext = canvas.getContext('2d');
    this.setupHolographicRendering();
  }

  /**
   * Setup holographic rendering effects
   */
  private setupHolographicRendering(): void {
    if (!this.canvasContext) return;

    // Enable advanced rendering features
    this.canvasContext.imageSmoothingEnabled = true;
    this.canvasContext.imageSmoothingQuality = 'high';
  }

  /**
   * Set chart data
   */
  setData(data: CandlestickData[]): void {
    this.data = data;
  }

  /**
   * Get current chart data
   */
  getData(): CandlestickData[] {
    return this.data;
  }

  /**
   * Set timeframe
   */
  setTimeframe(timeframe: ChartTimeframe): void {
    this.currentTimeframe = timeframe;
  }

  /**
   * Get current timeframe
   */
  getTimeframe(): ChartTimeframe {
    return this.currentTimeframe;
  }

  /**
   * Set render configuration
   */
  setRenderConfig(config: Partial<ChartRenderConfig>): void {
    this.renderConfig = { ...this.renderConfig, ...config };
  }

  /**
   * Get render configuration
   */
  getRenderConfig(): ChartRenderConfig {
    return { ...this.renderConfig };
  }

  /**
   * Set atmosphere configuration
   */
  setAtmosphereConfig(config: Partial<ChartAtmosphereConfig>): void {
    this.atmosphereConfig = { ...this.atmosphereConfig, ...config };
  }

  /**
   * Get atmosphere configuration
   */
  getAtmosphereConfig(): ChartAtmosphereConfig {
    return { ...this.atmosphereConfig };
  }

  /**
   * Set holographic intensity
   */
  setHolographicIntensity(intensity: number): void {
    this.holographicIntensity = Math.max(0, Math.min(1, intensity));
    this.renderConfig.holographicIntensity = this.holographicIntensity;
  }

  /**
   * Get holographic intensity
   */
  getHolographicIntensity(): number {
    return this.holographicIntensity;
  }

  /**
   * Apply volumetric depth effect
   */
  applyVolumetricDepth(depth: number): void {
    // Depth affects holographic intensity and glow
    const depthMultiplier = 1 - (depth * 0.3);
    this.holographicIntensity = this.holographicIntensity * depthMultiplier;
  }

  /**
   * Apply cinematic lighting
   */
  applyCinematicLighting(intensity: number): void {
    this.atmosphereConfig.pulseIntensity = intensity;
  }

  /**
   * Apply atmospheric telemetry drift
   */
  applyAtmosphericDrift(enabled: boolean, speed: number): void {
    this.atmosphereConfig.telemetryDrift = enabled;
    this.atmosphereConfig.driftSpeed = speed;
  }

  /**
   * Enable/disable pulse breathing
   */
  setPulseBreathing(enabled: boolean, intensity: number): void {
    this.atmosphereConfig.pulseBreathing = enabled;
    this.atmosphereConfig.pulseIntensity = intensity;
  }

  /**
   * Enable/disable neural propagation
   */
  setNeuralPropagation(enabled: boolean): void {
    this.atmosphereConfig.neuralPropagation = enabled;
  }

  /**
   * Get chart dimensions
   */
  getChartDimensions(): { width: number; height: number } {
    if (!this.canvasContext) return { width: 0, height: 0 };
    
    const canvas = this.canvasContext.canvas;
    return {
      width: canvas.width,
      height: canvas.height
    };
  }

  /**
   * Calculate price range for data
   */
  getPriceRange(): { min: number; max: number } | null {
    if (this.data.length === 0) return null;

    let min = Infinity;
    let max = -Infinity;

    for (const candle of this.data) {
      min = Math.min(min, candle.low);
      max = Math.max(max, candle.high);
    }

    // Add padding
    const padding = (max - min) * 0.05;
    return {
      min: min - padding,
      max: max + padding
    };
  }

  /**
   * Calculate time range for data
   */
  getTimeRange(): { start: number; end: number } | null {
    if (this.data.length === 0) return null;

    return {
      start: this.data[0].timestamp,
      end: this.data[this.data.length - 1].timestamp
    };
  }

  /**
   * Convert price to Y coordinate
   */
  priceToY(price: number, height: number, priceRange: { min: number; max: number }): number {
    const range = priceRange.max - priceRange.min;
    const normalized = (price - priceRange.min) / range;
    return height - (normalized * height);
  }

  /**
   * Convert timestamp to X coordinate
   */
  timestampToX(timestamp: number, width: number, timeRange: { start: number; end: number }): number {
    const range = timeRange.end - timeRange.start;
    const normalized = (timestamp - timeRange.start) / range;
    return normalized * width;
  }

  /**
   * Apply holographic glow effect
   */
  applyHolographicGlow(ctx: CanvasRenderingContext2D, color: string, intensity: number): void {
    ctx.shadowColor = color;
    ctx.shadowBlur = 10 * intensity * this.holographicIntensity;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  /**
   * Apply volumetric lighting
   */
  applyVolumetricLighting(ctx: CanvasRenderingContext2D, intensity: number): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
    gradient.addColorStop(0, `rgba(0, 150, 255, ${0.1 * intensity})`);
    gradient.addColorStop(0.5, `rgba(0, 150, 255, ${0.05 * intensity})`);
    gradient.addColorStop(1, `rgba(0, 150, 255, ${0.1 * intensity})`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  /**
   * Apply atmospheric haze
   */
  applyAtmosphericHaze(ctx: CanvasRenderingContext2D, intensity: number): void {
    const gradient = ctx.createRadialGradient(
      ctx.canvas.width / 2,
      ctx.canvas.height / 2,
      0,
      ctx.canvas.width / 2,
      ctx.canvas.height / 2,
      ctx.canvas.width / 2
    );
    
    gradient.addColorStop(0, `rgba(100, 150, 200, ${0})`);
    gradient.addColorStop(0.7, `rgba(100, 150, 200, ${0.02 * intensity})`);
    gradient.addColorStop(1, `rgba(100, 150, 200, ${0.08 * intensity})`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  /**
   * Render cinematic background
   */
  renderCinematicBackground(): void {
    if (!this.canvasContext) return;

    const ctx = this.canvasContext;
    
    // Clear canvas
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Apply volumetric lighting
    if (this.holographicIntensity > 0.3) {
      this.applyVolumetricLighting(ctx, this.holographicIntensity);
    }
    
    // Apply atmospheric haze
    if (this.holographicIntensity > 0.2) {
      this.applyAtmosphericHaze(ctx, this.holographicIntensity);
    }
  }

  /**
   * Render holographic grid
   */
  renderHolographicGrid(): void {
    if (!this.canvasContext || !this.renderConfig.showGrid) return;

    const ctx = this.canvasContext;
    const { width, height } = this.getChartDimensions();
    const priceRange = this.getPriceRange();
    const timeRange = this.getTimeRange();

    if (!priceRange || !timeRange) return;

    ctx.strokeStyle = `rgba(100, 150, 200, ${0.1 * this.holographicIntensity})`;
    ctx.lineWidth = 1;

    // Horizontal grid lines (price)
    const priceSteps = 10;
    for (let i = 0; i <= priceSteps; i++) {
      const price = priceRange.min + (priceRange.max - priceRange.min) * (i / priceSteps);
      const y = this.priceToY(price, height, priceRange);
      
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Vertical grid lines (time)
    const timeSteps = 12;
    for (let i = 0; i <= timeSteps; i++) {
      const timestamp = timeRange.start + (timeRange.end - timeRange.start) * (i / timeSteps);
      const x = this.timestampToX(timestamp, width, timeRange);
      
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
  }

  /**
   * Reset to default configuration
   */
  resetToDefault(): void {
    this.renderConfig = this.getDefaultRenderConfig();
    this.atmosphereConfig = this.getDefaultAtmosphereConfig();
    this.holographicIntensity = 0.5;
  }

  /**
   * Get complete chart state
   */
  getChartState(): Partial<ChartState> {
    return {
      timeframe: this.currentTimeframe,
      data: this.data,
      renderConfig: this.renderConfig,
      atmosphere: this.atmosphereConfig,
      performance: {
        renderTime: 0,
        dataPoints: this.data.length,
        fps: 60,
        memoryUsage: 0
      }
    };
  }
}

// Singleton instance
export const cinematicChartUniverse = new CinematicChartUniverse();
