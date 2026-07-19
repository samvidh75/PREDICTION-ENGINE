/**
 * Local Browser LLM Service
 * - Runs entirely in browser using Transformers.js
 * - No server required, fully offline capable
 * - Stock market specialized models
 * - Free and lightweight
 */

// Note: Transformers.js loads on demand
// Install: npm install @xenova/transformers

type TransformersType = typeof import('@xenova/transformers');
let transformers: TransformersType | null = null;

interface GenerationOptions {
  maxNewTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
}

interface GenerationResult {
  text: string;
  tokensGenerated: number;
  timeMs: number;
}

class LocalLLMService {
  private isLoading = false;
  private isLoaded = false;
  private modelCache: Map<string, any> = new Map();
  private currentModel: string = 'gpt2'; // Small, fast model
  private webgpuAvailable: boolean | null = null;

  /** Detect once and cache; used to pick the WebGPU vs WASM execution backend. */
  private async getDevice(): Promise<'webgpu' | 'wasm'> {
    if (this.webgpuAvailable === null) {
      try {
        this.webgpuAvailable =
          typeof navigator !== 'undefined' &&
          'gpu' in navigator &&
          Boolean(await (navigator as any).gpu.requestAdapter());
      } catch {
        this.webgpuAvailable = false;
      }
    }
    return this.webgpuAvailable ? 'webgpu' : 'wasm';
  }

  /**
   * Initialize the LLM service (lazy load)
   */
  async initialize(): Promise<void> {
    if (this.isLoaded) return;
    if (this.isLoading) {
      // Wait for current load to complete
      while (this.isLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    this.isLoading = true;

    try {
      // Dynamically import Transformers.js
      transformers = await import('@xenova/transformers');
      console.log('[LocalLLM] Transformers.js loaded successfully');
      this.isLoaded = true;
    } catch (error) {
      console.error('[LocalLLM] Failed to load Transformers.js:', error);
      this.isLoaded = false;
    } finally {
      this.isLoading = false;
    }
  }

  /** Whether the last (or next) generation will run on the WebGPU backend. */
  async isUsingWebGPU(): Promise<boolean> {
    return (await this.getDevice()) === 'webgpu';
  }

  /**
   * Generate stock market analysis using local LLM
   */
  async generateStockAnalysis(
    symbol: string,
    metrics: Record<string, any>,
    query: string,
    options?: GenerationOptions
  ): Promise<GenerationResult> {
    await this.initialize();

    if (!transformers) {
      throw new Error('Transformers.js not available');
    }

    const startTime = Date.now();

    try {
      const prompt = this.buildAnalysisPrompt(symbol, metrics, query);

      // Use text generation pipeline, preferring the WebGPU backend when the
      // browser/device supports it (falls back to WASM otherwise).
      const device = await this.getDevice();
      const pipeline = (transformers as any).pipeline;
      const generator = await pipeline('text-generation', this.currentModel, { device });

      const result = await generator(prompt, {
        max_new_tokens: options?.maxNewTokens || 200,
        temperature: options?.temperature || 0.7,
        top_p: options?.topP || 0.9
      });

      const resultText = result[0]?.generated_text || result.generated_text || '';
      const text = typeof resultText === 'string' ? resultText : String(resultText);

      const tokensGenerated = text.split(/\s+/).length - prompt.split(/\s+/).length;
      const timeMs = Date.now() - startTime;

      return {
        text: text.trim(),
        tokensGenerated,
        timeMs
      };
    } catch (error) {
      console.error('[LocalLLM] Generation failed:', error);
      throw error;
    }
  }

  /**
   * Sentiment analysis for news
   */
  async analyzeNewsSentiment(newsText: string): Promise<{ label: string; score: number }> {
    await this.initialize();

    if (!transformers) {
      throw new Error('Transformers.js not available');
    }

    try {
      const pipeline = (transformers as any).pipeline;
      const classifier = await pipeline('sentiment-analysis');

      const result = await classifier(newsText.substring(0, 512)); // Limit to 512 chars

      return {
        label: (result[0] || result)?.label || 'NEUTRAL',
        score: (result[0] || result)?.score || 0.5
      };
    } catch (error) {
      console.error('[LocalLLM] Sentiment analysis failed:', error);
      return { label: 'NEUTRAL', score: 0.5 };
    }
  }

  /**
   * Financial question answering
   */
  async answerFinancialQuestion(question: string, context: string): Promise<string> {
    await this.initialize();

    if (!transformers) {
      throw new Error('Transformers.js not available');
    }

    try {
      const pipeline = (transformers as any).pipeline;
      const qa = await pipeline('question-answering');

      const result = await qa(
        question,
        context.substring(0, 1024) // Limit context
      );

      return (result[0] || result)?.answer || 'Unable to answer question with current context.';
    } catch (error) {
      console.error('[LocalLLM] QA failed:', error);
      return 'Unable to answer question with current context.';
    }
  }

  /**
   * Extract financial entities from text
   */
  async extractFinancialEntities(text: string): Promise<Array<{ entity: string; score: number }>> {
    await this.initialize();

    if (!transformers) {
      throw new Error('Transformers.js not available');
    }

    try {
      const { pipeline } = transformers;
      const ner = await pipeline('token-classification');

      const results = await ner(text.substring(0, 512));

      // Filter for financial entities
      return results
        .filter((r: any) => ['MONEY', 'QUANTITY', 'ORG', 'PRODUCT'].includes(r.entity_group))
        .map((r: any) => ({
          entity: r.word,
          score: r.score
        }));
    } catch (error) {
      console.error('[LocalLLM] Entity extraction failed:', error);
      return [];
    }
  }

  /**
   * Summarize long financial text
   */
  async summarizeText(text: string, maxLength: number = 150): Promise<string> {
    await this.initialize();

    if (!transformers) {
      throw new Error('Transformers.js not available');
    }

    try {
      const pipeline = (transformers as any).pipeline;
      const summarizer = await pipeline('summarization');

      const result = await summarizer(text.substring(0, 1024), {
        max_length: maxLength,
        min_length: Math.floor(maxLength / 2)
      });

      return (result[0] || result)?.summary_text || text.substring(0, maxLength);
    } catch (error) {
      console.error('[LocalLLM] Summarization failed:', error);
      return text.substring(0, maxLength);
    }
  }

  /**
   * Build analysis prompt for stock
   */
  private buildAnalysisPrompt(symbol: string, metrics: Record<string, any>, query: string): string {
    return `
You are a financial analyst expert in Philippine stocks.

Stock: ${symbol}
Metrics: ${JSON.stringify(metrics, null, 2)}

Query: ${query}

Provide a concise, professional analysis based on the metrics above. Focus on:
- Valuation assessment
- Quality indicators
- Growth prospects
- Risk factors
- Recommendation (BUY/HOLD/SELL)

Analysis:
`;
  }

  /**
   * Get model info
   */
  getModelInfo(): {
    name: string;
    size: string;
    isLoaded: boolean;
    isLoading: boolean;
  } {
    return {
      name: this.currentModel,
      size: this.currentModel === 'gpt2' ? '125M parameters' : 'unknown',
      isLoaded: this.isLoaded,
      isLoading: this.isLoading
    };
  }

  /**
   * Load a different model
   */
  async switchModel(modelName: string): Promise<void> {
    await this.initialize();

    // Supported lightweight models
    const supportedModels = [
      'gpt2',
      'distilgpt2',
      'distilbert-base-uncased',
      'cross-encoder/ms-marco-MiniLM-L-6-v2'
    ];

    if (!supportedModels.includes(modelName)) {
      throw new Error(`Model ${modelName} not supported. Use one of: ${supportedModels.join(', ')}`);
    }

    this.currentModel = modelName;
    this.modelCache.delete(modelName); // Clear cache to reload
    console.log(`[LocalLLM] Switched to model: ${modelName}`);
  }

  /**
   * Clear model cache
   */
  clearCache(): void {
    this.modelCache.clear();
    console.log('[LocalLLM] Model cache cleared');
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { cacheSize: number; models: string[] } {
    return {
      cacheSize: this.modelCache.size,
      models: Array.from(this.modelCache.keys())
    };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.modelCache.clear();
    this.isLoaded = false;
  }
}

export const localLLMService = new LocalLLMService();

/**
 * Installation guide:
 *
 * 1. Install Transformers.js:
 *    npm install @xenova/transformers
 *
 * 2. Update .env:
 *    VITE_LOCAL_LLM_ENABLED=true
 *
 * 3. Use in components:
 *    import { localLLMService } from '@/services/ai/LocalLLMService'
 *
 *    const analysis = await localLLMService.generateStockAnalysis(
 *      'INFY',
 *      { pe: 20, roe: 15 },
 *      'Should I buy this stock?'
 *    )
 *
 * 4. First load will download ~500MB of models
 *    Subsequent loads will use browser cache
 *
 * Models available:
 * - GPT2 (125M params) - Fast, good for basic analysis
 * - DistilGPT2 (82M params) - Faster, smaller
 * - DistilBERT - Excellent for classification
 * - Cross-Encoder - Best for ranking/similarity
 *
 * Performance:
 * - First request: 30-60s (download + initialize)
 * - Subsequent requests: 2-5s per query
 * - Fully offline after first load
 * - GPU acceleration available with WebGPU (experimental)
 */
