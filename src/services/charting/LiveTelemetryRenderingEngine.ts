/**
 * Live Telemetry Rendering Engine
 * Real-time Data Visualization
 * 
 * Powers live visual market movement:
 * - Real-time candles
 * - Liquidity flow
 * - Volatility behaviour
 * - Participation density
 * - Institutional flow
 * - Volume expansion
 */

import {
  CandlestickData,
  MarketTelemetry
} from '../../types/ChartingTypes';

class LiveTelemetryRenderingEngine {
  private liveData: CandlestickData[] = [];
  private currentTelemetry: MarketTelemetry | null = null;
  private isStreaming: boolean = false;
  private updateInterval: number = 1000; // 1 second
  private animationFrame: number | null = null;
  private lastUpdateTime: number = 0;

  /**
   * Start live streaming
   */
  startStreaming(): void {
    this.isStreaming = true;
    this.startAnimationLoop();
  }

  /**
   * Stop live streaming
   */
  stopStreaming(): void {
    this.isStreaming = false;
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  /**
   * Check if streaming
   */
  isLiveStreaming(): boolean {
    return this.isStreaming;
  }

  /**
   * Update live candle data
   */
  updateLiveData(newData: CandlestickData): void {
    this.liveData.push(newData);
    
    // Keep only last 1000 data points for performance
    if (this.liveData.length > 1000) {
      this.liveData = this.liveData.slice(-1000);
    }
  }

  /**
   * Get live data
   */
  getLiveData(): CandlestickData[] {
    return [...this.liveData];
  }

  /**
   * Update current telemetry
   */
  updateTelemetry(telemetry: MarketTelemetry): void {
    this.currentTelemetry = telemetry;
  }

  /**
   * Get current telemetry
   */
  getCurrentTelemetry(): MarketTelemetry | null {
    return this.currentTelemetry;
  }

  /**
   * Set update interval
   */
  setUpdateInterval(interval: number): void {
    this.updateInterval = interval;
  }

  /**
   * Get update interval
   */
  getUpdateInterval(): number {
    return this.updateInterval;
  }

  /**
   * Start animation loop
   */
  private startAnimationLoop(): void {
    const animate = (timestamp: number) => {
      if (!this.isStreaming) return;

      const deltaTime = timestamp - this.lastUpdateTime;
      
      if (deltaTime >= this.updateInterval) {
        this.renderTelemetry();
        this.lastUpdateTime = timestamp;
      }

      this.animationFrame = requestAnimationFrame(animate);
    };

    this.animationFrame = requestAnimationFrame(animate);
  }

  /**
   * Render telemetry data
   */
  private renderTelemetry(): void {
    // This would trigger the actual rendering of live data
    // The rendering would be handled by the CinematicChartUniverse
    // This method would emit events or call render functions
  }

  /**
   * Calculate liquidity flow visualization
   */
  calculateLiquidityFlow(): number {
    if (!this.currentTelemetry) return 0;
    return this.currentTelemetry.liquidityScore;
  }

  /**
   * Calculate volatility behaviour
   */
  calculateVolatilityBehaviour(): number {
    if (!this.currentTelemetry) return 0;
    return this.currentTelemetry.volatility;
  }

  /**
   * Calculate participation density
   */
  calculateParticipationDensity(): number {
    if (!this.currentTelemetry) return 0;
    return this.currentTelemetry.institutionalActivity;
  }

  /**
   * Calculate institutional flow
   */
  calculateInstitutionalFlow(): number {
    if (!this.currentTelemetry) return 0;
    return this.currentTelemetry.institutionalActivity;
  }

  /**
   * Calculate volume expansion
   */
  calculateVolumeExpansion(): number {
    if (!this.currentTelemetry) return 0;
    
    const recentVolume = this.liveData.slice(-10).reduce((sum, candle) => sum + candle.volume, 0);
    const averageVolume = this.liveData.reduce((sum, candle) => sum + candle.volume, 0) / this.liveData.length;
    
    return recentVolume / (averageVolume * 10);
  }

  /**
   * Get holographic telemetry line data
   */
  getHolographicTelemetryLines(): Array<{ x: number; y: number; intensity: number }> {
    const lines: Array<{ x: number; y: number; intensity: number }> = [];
    
    for (let i = 0; i < this.liveData.length; i++) {
      const candle = this.liveData[i];
      const intensity = this.calculateTelemetryIntensity(candle);
      
      lines.push({
        x: i,
        y: candle.close,
        intensity
      });
    }
    
    return lines;
  }

  /**
   * Calculate telemetry intensity for visualization
   */
  private calculateTelemetryIntensity(candle: CandlestickData): number {
    const volatility = candle.volatilityScore || 0;
    const liquidity = candle.liquidityDensity || 0;
    const institutional = candle.institutionalFlow || 0;
    
    return (volatility * 0.4 + liquidity * 0.3 + institutional * 0.3);
  }

  /**
   * Get adaptive market pulse data
   */
  getAdaptiveMarketPulse(): Array<{ timestamp: number; pulse: number }> {
    const pulse: Array<{ timestamp: number; pulse: number }> = [];
    
    for (let i = 1; i < this.liveData.length; i++) {
      const current = this.liveData[i];
      const previous = this.liveData[i - 1];
      
      const priceChange = Math.abs(current.close - previous.close);
      const volumeChange = Math.abs(current.volume - previous.volume);
      
      const pulseValue = (priceChange / previous.close) * 100 + (volumeChange / previous.volume) * 10;
      
      pulse.push({
        timestamp: current.timestamp,
        pulse: Math.min(1, pulseValue)
      });
    }
    
    return pulse;
  }

  /**
   * Get volumetric liquidity streams
   */
  getVolumetricLiquidityStreams(): Array<{ timestamp: number; stream: number; depth: number }> {
    const streams: Array<{ timestamp: number; stream: number; depth: number }> = [];
    
    for (let i = 0; i < this.liveData.length; i++) {
      const candle = this.liveData[i];
      const liquidity = candle.liquidityDensity || 0.5;
      const volume = candle.volume;
      
      streams.push({
        timestamp: candle.timestamp,
        stream: liquidity,
        depth: volume / 1000000 // Normalize to millions
      });
    }
    
    return streams;
  }

  /**
   * Get neural rendering overlay data
   */
  getNeuralRenderingOverlay(): Array<{ x: number; y: number; connections: number[] }> {
    const overlay: Array<{ x: number; y: number; connections: number[] }> = [];
    
    for (let i = 0; i < this.liveData.length; i++) {
      const candle = this.liveData[i];
      const connections: number[] = [];
      
      // Connect to nearby candles with similar characteristics
      for (let j = i - 5; j <= i + 5; j++) {
        if (j >= 0 && j < this.liveData.length && j !== i) {
          const other = this.liveData[j];
          const similarity = this.calculateCandleSimilarity(candle, other);
          
          if (similarity > 0.8) {
            connections.push(j);
          }
        }
      }
      
      overlay.push({
        x: i,
        y: candle.close,
        connections
      });
    }
    
    return overlay;
  }

  /**
   * Calculate similarity between two candles
   */
  private calculateCandleSimilarity(candle1: CandlestickData, candle2: CandlestickData): number {
    const priceSimilarity = 1 - Math.abs(candle1.close - candle2.close) / candle1.close;
    const volumeSimilarity = 1 - Math.abs(candle1.volume - candle2.volume) / candle1.volume;
    
    return (priceSimilarity * 0.7 + volumeSimilarity * 0.3);
  }

  /**
   * Clear live data
   */
  clearLiveData(): void {
    this.liveData = [];
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.stopStreaming();
    this.clearLiveData();
    this.currentTelemetry = null;
    this.lastUpdateTime = 0;
  }
}

// Singleton instance
export const liveTelemetryRenderingEngine = new LiveTelemetryRenderingEngine();
