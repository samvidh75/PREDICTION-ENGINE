/**
 * Model Selection & Management
 * - Fast 0.5B model (instant, 500MB)
 * - Powerful 7B model (2s latency, 3.5GB)
 * - Automatic fallback on memory constraints
 */

export interface ModelConfig {
  id: string;
  name: string;
  size: 'small' | 'large';
  hfRepo: string;
  onnxModel: string;
  downloadSize: string;
  loadTime: string;
  latency: string;
  memoryRequired: string;
  reasoning: 'basic' | 'advanced';
  maxTokens: number;
}

export const AVAILABLE_MODELS: Record<string, ModelConfig> = {
  'qwen-0.5b': {
    id: 'qwen-0.5b',
    name: 'Qwen 0.5B (Fast)',
    size: 'small',
    hfRepo: 'samvidhh/Qwen2.5-0.5B-stockmarket-encyclopedia',
    onnxModel: 'onnx/model.onnx',
    downloadSize: '500MB',
    loadTime: '3-5s',
    latency: '0.5-1s',
    memoryRequired: '1-2GB',
    reasoning: 'basic',
    maxTokens: 200,
  },
  'qwen-7b': {
    id: 'qwen-7b',
    name: 'Qwen 7B (Powerful)',
    size: 'large',
    hfRepo: 'Qwen/Qwen2.5-7B-Instruct',
    onnxModel: 'onnx-q4/model.onnx',
    downloadSize: '3.5GB',
    loadTime: '20-30s',
    latency: '2-4s',
    memoryRequired: '6-8GB',
    reasoning: 'advanced',
    maxTokens: 512,
  },
};

interface StoredPreference {
  model: string;
  timestamp: number;
}

class ModelSelector {
  private currentModel = 'qwen-0.5b';
  private modelLoaded = new Map<string, boolean>();
  private localStorage = typeof window !== 'undefined' ? window.localStorage : null;
  private PREF_KEY = 'stockex-preferred-model';

  constructor() {
    this.loadPreference();
  }

  /**
   * Get current selected model
   */
  getCurrentModel(): ModelConfig {
    return AVAILABLE_MODELS[this.currentModel] || AVAILABLE_MODELS['qwen-0.5b'];
  }

  /**
   * Select a model (persists preference)
   */
  selectModel(modelId: string): boolean {
    if (!AVAILABLE_MODELS[modelId]) {
      console.error(`Model ${modelId} not found`);
      return false;
    }

    this.currentModel = modelId;
    this.savePreference();
    return true;
  }

  /**
   * Get all available models
   */
  getAvailableModels(): ModelConfig[] {
    return Object.values(AVAILABLE_MODELS);
  }

  /**
   * Check if model has been loaded
   */
  isModelLoaded(modelId: string): boolean {
    return this.modelLoaded.get(modelId) ?? false;
  }

  /**
   * Mark model as loaded
   */
  markModelLoaded(modelId: string): void {
    this.modelLoaded.set(modelId, true);
  }

  /**
   * Check device capability for model
   */
  canRunModel(modelId: string): 'yes' | 'maybe' | 'no' {
    const model = AVAILABLE_MODELS[modelId];
    if (!model) return 'no';

    if (typeof navigator === 'undefined') return 'maybe';

    const deviceMemory = (navigator as any).deviceMemory || 8;
    const requiredGb = model.id === 'qwen-7b' ? 6 : 2;

    if (deviceMemory < requiredGb) {
      return 'no'; // Not enough RAM
    }
    if (deviceMemory < requiredGb + 2) {
      return 'maybe'; // Borderline
    }
    return 'yes'; // Plenty of memory
  }

  /**
   * Get recommended model for device
   */
  getRecommendedModel(): string {
    // If device can handle 7B, recommend it
    if (this.canRunModel('qwen-7b') === 'yes') {
      return 'qwen-7b';
    }
    // Otherwise fall back to 0.5B
    return 'qwen-0.5b';
  }

  /**
   * Save preference to localStorage
   */
  private savePreference(): void {
    if (!this.localStorage) return;

    const pref: StoredPreference = {
      model: this.currentModel,
      timestamp: Date.now(),
    };

    this.localStorage.setItem(this.PREF_KEY, JSON.stringify(pref));
  }

  /**
   * Load preference from localStorage
   */
  private loadPreference(): void {
    if (!this.localStorage) return;

    try {
      const stored = this.localStorage.getItem(this.PREF_KEY);
      if (stored) {
        const pref: StoredPreference = JSON.parse(stored);
        if (AVAILABLE_MODELS[pref.model]) {
          this.currentModel = pref.model;
        }
      }
    } catch (error) {
      console.warn('Failed to load model preference:', error);
    }
  }

  /**
   * Get model comparison for UI
   */
  getComparison(): {
    small: ModelConfig;
    large: ModelConfig;
  } {
    return {
      small: AVAILABLE_MODELS['qwen-0.5b'],
      large: AVAILABLE_MODELS['qwen-7b'],
    };
  }
}

export const modelSelector = new ModelSelector();
