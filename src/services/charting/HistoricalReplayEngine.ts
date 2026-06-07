/**
 * Historical Market Replay Engine
 * Signature Educational Feature
 * 
 * Replays historical market environments cinematically:
 * - COVID crash
 * - 2008 crisis
 * - Sector booms
 * - Liquidity expansions
 * - Earnings cycles
 * - Macro shifts
 */

import {
  HistoricalReplayEvent,
  CandlestickData
} from '../../types/ChartingTypes';

class HistoricalReplayEngine {
  private replayData: CandlestickData[] = [];
  private replayEvents: HistoricalReplayEvent[] = [];
  private isReplaying: boolean = false;
  private currentReplayIndex: number = 0;
  private replaySpeed: number = 1;
  private holographicIntensity: number = 0.5;

  /**
   * Set replay data
   */
  setReplayData(data: CandlestickData[]): void {
    this.replayData = data;
  }

  /**
   * Get replay data
   */
  getReplayData(): CandlestickData[] {
    return [...this.replayData];
  }

  /**
   * Set replay events
   */
  setReplayEvents(events: HistoricalReplayEvent[]): void {
    this.replayEvents = events;
  }

  /**
   * Get replay events
   */
  getReplayEvents(): HistoricalReplayEvent[] {
    return [...this.replayEvents];
  }

  /**
   * Start replay
   */
  async startReplay(): Promise<void> {
    if (this.isReplaying) return;

    this.isReplaying = true;
    this.currentReplayIndex = 0;

    await this.performReplay();

    this.isReplaying = false;
  }

  /**
   * Stop replay
   */
  stopReplay(): void {
    this.isReplaying = false;
  }

  /**
   * Check if replaying
   */
  isCurrentlyReplaying(): boolean {
    return this.isReplaying;
  }

  /**
   * Get current replay index
   */
  getCurrentReplayIndex(): number {
    return this.currentReplayIndex;
  }

  /**
   * Set replay speed
   */
  setReplaySpeed(speed: number): void {
    this.replaySpeed = Math.max(0.5, Math.min(5, speed));
  }

  /**
   * Get replay speed
   */
  getReplaySpeed(): number {
    return this.replaySpeed;
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
   * Perform replay
   */
  private async performReplay(): Promise<void> {
    const stepDelay = 100 / this.replaySpeed;

    for (let i = 0; i < this.replayData.length && this.isReplaying; i++) {
      this.currentReplayIndex = i;
      
      // Check for events at this timestamp
      const currentEvent = this.replayEvents.find(
        event => Math.abs(event.timestamp - this.replayData[i].timestamp) < 86400000
      );

      if (currentEvent) {
        await this.handleReplayEvent(currentEvent);
      }

      await this.delay(stepDelay);
    }
  }

  /**
   * Handle replay event
   */
  private async handleReplayEvent(event: HistoricalReplayEvent): Promise<void> {
    // Pause replay to show event
    await this.delay(500);

    // Event would trigger visual indicators, explanations, etc.
    // This would be handled by the UI layer
  }

  /**
   * Calculate cinematic replay timeline
   */
  calculateCinematicReplayTimeline(): {
    totalDuration: number;
    currentPosition: number;
    progress: number;
    events: Array<{ timestamp: number; type: string; position: number }>;
  } {
    const totalDuration = this.replayData.length;
    const currentPosition = this.currentReplayIndex;
    const progress = totalDuration > 0 ? currentPosition / totalDuration : 0;

    const events = this.replayEvents.map(event => {
      const dataIndex = this.replayData.findIndex(
        candle => Math.abs(candle.timestamp - event.timestamp) < 86400000
      );
      return {
        timestamp: event.timestamp,
        type: event.type,
        position: dataIndex / totalDuration
      };
    });

    return {
      totalDuration,
      currentPosition,
      progress,
      events
    };
  }

  /**
   * Calculate historical pulse rendering
   */
  calculateHistoricalPulseRendering(): {
    pulseIntensity: number;
    pulseColor: string;
    pulseRadius: number;
  } | null {
    if (!this.isReplaying) return null;

    const currentCandle = this.replayData[this.currentReplayIndex];
    if (!currentCandle) return null;

    const volatility = currentCandle.volatilityScore || 0.5;
    const intensity = this.holographicIntensity;

    return {
      pulseIntensity: volatility * intensity,
      pulseColor: volatility > 0.7 ? '#ff4466' : volatility > 0.4 ? '#ffaa00' : '#00ff88',
      pulseRadius: 10 + volatility * 20 * intensity
    };
  }

  /**
   * Calculate macro-event overlay
   */
  calculateMacroEventOverlay(): {
    showOverlay: boolean;
    event: HistoricalReplayEvent | null;
    overlayColor: string;
    overlayIntensity: number;
  } {
    const currentCandle = this.replayData[this.currentReplayIndex];
    if (!currentCandle) {
      return { showOverlay: false, event: null, overlayColor: '#ffffff', overlayIntensity: 0 };
    }

    const event = this.replayEvents.find(
      e => Math.abs(e.timestamp - currentCandle.timestamp) < 86400000 * 3 // Within 3 days
    );

    if (!event) {
      return { showOverlay: false, event: null, overlayColor: '#ffffff', overlayIntensity: 0 };
    }

    const overlayColor = event.impact > 0.7 ? '#ff4466' : event.impact > 0.4 ? '#ffaa00' : '#00ff88';
    const overlayIntensity = event.impact * this.holographicIntensity;

    return {
      showOverlay: true,
      event,
      overlayColor,
      overlayIntensity
    };
  }

  /**
   * Calculate institutional playback system
   */
  calculateInstitutionalPlayback(): {
    showPlayback: boolean;
    playbackIntensity: number;
    playbackColor: string;
  } {
    if (!this.isReplaying) {
      return { showPlayback: false, playbackIntensity: 0, playbackColor: '#ffffff' };
    }

    const currentCandle = this.replayData[this.currentReplayIndex];
    if (!currentCandle) {
      return { showPlayback: false, playbackIntensity: 0, playbackColor: '#ffffff' };
    }

    const institutional = currentCandle.institutionalFlow || 0;
    const showPlayback = institutional > 0.5;
    const playbackIntensity = institutional * this.holographicIntensity;
    const playbackColor = institutional > 0.7 ? '#00aaff' : '#00ff88';

    return {
      showPlayback,
      playbackIntensity,
      playbackColor
    };
  }

  /**
   * Jump to specific index
   */
  jumpToIndex(index: number): void {
    if (index >= 0 && index < this.replayData.length) {
      this.currentReplayIndex = index;
    }
  }

  /**
   * Jump to specific event
   */
  jumpToEvent(eventType: string): void {
    const event = this.replayEvents.find(e => e.type === eventType);
    if (event) {
      const dataIndex = this.replayData.findIndex(
        candle => Math.abs(candle.timestamp - event.timestamp) < 86400000
      );
      if (dataIndex >= 0) {
        this.jumpToIndex(dataIndex);
      }
    }
  }

  /**
   * Get replay interpretation
   */
  getReplayInterpretation(): string | null {
    if (!this.isReplaying) return null;

    const currentCandle = this.replayData[this.currentReplayIndex];
    if (!currentCandle) return null;

    const event = this.replayEvents.find(
      e => Math.abs(e.timestamp - currentCandle.timestamp) < 86400000 * 3
    );

    if (event) {
      return `${event.description}. This event had a significant impact on market behaviour.`;
    }

    const volatility = currentCandle.volatilityScore || 0.5;
    if (volatility > 0.7) {
      return 'This period shows elevated market volatility, indicating significant price uncertainty.';
    } else if (volatility < 0.3) {
      return 'This period shows stable market conditions with minimal price fluctuation.';
    }

    return null;
  }

  /**
   * Reset to default state
   */
  resetToDefault(): void {
    this.stopReplay();
    this.replayData = [];
    this.replayEvents = [];
    this.currentReplayIndex = 0;
    this.replaySpeed = 1;
    this.holographicIntensity = 0.5;
  }

  /**
   * Helper delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const historicalReplayEngine = new HistoricalReplayEngine();
