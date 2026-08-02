/**
 * Smart Worker Manager
 * Manages switching between Tier 1 (0.5B) and Tier 2 (1B) local models
 * Falls back to Groq API for Tier 3 (complex) questions
 */

import { modelRouter, type ModelTier } from '../../utils/modelRouter';

interface ModelWorkerConfig {
  tier: ModelTier;
  worker: Worker;
  modelId: string;
  isReady: boolean;
}

export class SmartWorkerManager {
  private tier1Worker: Worker | null = null;
  private tier2Worker: Worker | null = null;
  private activeWorker: Worker | null = null;
  private activeTier: ModelTier = 'tier1-qwen-05b';
  private statusCallbacks: ((status: string) => void)[] = [];
  private tier1Ready = false;
  private tier2Ready = false;

  constructor() {
    this.initializeTier1();
  }

  /**
   * Initialize Tier 1 (Qwen 0.5B) - always loaded
   */
  private initializeTier1() {
    try {
      this.tier1Worker = new Worker(
        new URL('./edgeAiLlmWorker.ts', import.meta.url),
        { type: 'module' }
      );

      this.tier1Worker.onmessage = (e) => this.handleWorkerMessage(e, 'tier1-qwen-05b');
      this.tier1Worker.onerror = (e) => {
        console.error('[Tier 1 Worker Error]', e);
        this.updateStatus('❌ Tier 1 model failed to load');
      };

      this.activeWorker = this.tier1Worker;
      this.activeTier = 'tier1-qwen-05b';
      this.updateStatus('⚡ Tier 1 (Qwen 0.5B) initializing...');

      // Send initialization message to worker
      this.tier1Worker.postMessage({
        type: 'INITIALIZE_BROWSER_LLM',
      });
    } catch (error) {
      console.error('[Tier 1 Init Error]', error);
      this.updateStatus('❌ Failed to initialize Tier 1 model');
    }
  }

  /**
   * Initialize Tier 2 (Qwen 1B) - load on demand
   */
  private initializeTier2() {
    if (this.tier2Worker || this.tier2Ready) return;

    try {
      this.tier2Worker = new Worker(
        new URL('./edgeAiLlmWorkerTier2.ts', import.meta.url),
        { type: 'module' }
      );

      this.tier2Worker.onmessage = (e) => this.handleWorkerMessage(e, 'tier2-qwen-1b');
      this.tier2Worker.onerror = (e) => {
        console.error('[Tier 2 Worker Error]', e);
        this.updateStatus('⚠️ Tier 2 model failed, using Tier 1');
      };

      this.updateStatus('🧠 Tier 2 (Qwen 1B) initializing...');
    } catch (error) {
      console.error('[Tier 2 Init Error]', error);
      this.updateStatus('⚠️ Tier 2 model unavailable, using Tier 1');
    }
  }

  /**
   * Switch to appropriate model based on complexity
   */
  async switchModel(userQuestion: string): Promise<ModelTier> {
    const complexity = modelRouter.analyzeComplexity(userQuestion);
    const targetTier = complexity.tier;

    // If Tier 3, we'll use Groq API (handled by FloatingAIButton)
    if (targetTier === 'tier3-groq-api') {
      this.updateStatus('🔥 Switching to Groq API for complex analysis...');
      return targetTier;
    }

    // If Tier 2, initialize if not already done
    if (targetTier === 'tier2-qwen-1b' && !this.tier2Worker) {
      this.initializeTier2();
      await this.waitForTier2Ready();
    }

    // Switch active worker
    if (targetTier === 'tier1-qwen-05b' && this.tier1Worker) {
      this.activeWorker = this.tier1Worker;
      this.activeTier = 'tier1-qwen-05b';
      this.updateStatus('⚡ Using Tier 1 (Qwen 0.5B)');
    } else if (targetTier === 'tier2-qwen-1b' && this.tier2Worker) {
      this.activeWorker = this.tier2Worker;
      this.activeTier = 'tier2-qwen-1b';
      this.updateStatus('🧠 Using Tier 2 (Qwen 1B)');
    }

    return this.activeTier;
  }

  /**
   * Send message to active worker
   */
  sendMessage(data: any) {
    if (!this.activeWorker) {
      console.error('No active worker available');
      return;
    }
    this.activeWorker.postMessage(data);
  }

  /**
   * Handle messages from workers
   */
  private handleWorkerMessage(event: MessageEvent, source: ModelTier) {
    const { type, message, response, error, model, modelInfo } = event.data;

    if (type === 'INITIALIZED_SUCCESS') {
      if (source === 'tier1-qwen-05b') {
        this.tier1Ready = true;
        this.updateStatus(`✅ ${modelInfo.modelId} ready`);
      } else if (source === 'tier2-qwen-1b') {
        this.tier2Ready = true;
        this.updateStatus(`✅ ${modelInfo.modelId} ready`);
      }
    } else if (type === 'STATUS_UPDATE') {
      this.updateStatus(message);
    } else {
      // Relay all other messages to listeners
      this.broadcastMessage(event.data);
    }
  }

  /**
   * Wait for Tier 2 to be ready
   */
  private waitForTier2Ready(timeout = 30000): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkReady = () => {
        if (this.tier2Ready) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Tier 2 initialization timeout'));
        } else {
          setTimeout(checkReady, 500);
        }
      };
      checkReady();
    });
  }

  /**
   * Register status callback
   */
  onStatus(callback: (status: string) => void) {
    this.statusCallbacks.push(callback);
  }

  /**
   * Update status for all listeners
   */
  private updateStatus(status: string) {
    this.statusCallbacks.forEach((cb) => cb(status));
  }

  /**
   * Broadcast messages to listeners (for components)
   */
  private listeners: ((data: any) => void)[] = [];

  onMessage(callback: (data: any) => void) {
    this.listeners.push(callback);
  }

  private broadcastMessage(data: any) {
    this.listeners.forEach((cb) => cb(data));
  }

  /**
   * Get current active tier
   */
  getActiveTier(): ModelTier {
    return this.activeTier;
  }

  /**
   * Get model info for UI display
   */
  getModelInfo(tier: ModelTier) {
    return modelRouter.getModelConfig(tier);
  }

  /**
   * Cleanup
   */
  destroy() {
    this.tier1Worker?.terminate();
    this.tier2Worker?.terminate();
    this.statusCallbacks = [];
    this.listeners = [];
  }
}

// Export singleton instance
export const smartWorkerManager = new SmartWorkerManager();
