// Enhanced WebGPU Worker supporting Qwen0.5B and Qwen7B models
// Auto-switches based on device capability with fallback chain

interface WorkerState {
  modelInstance: any;
  tokenizerInstance: any;
  workerStatus: 'idle' | 'loading' | 'ready' | 'failed';
  adapterLoaded: boolean;
  currentModel: 'qwen-0.5b' | 'qwen-7b';
  isQuantized: boolean;
}

const state: WorkerState = {
  modelInstance: null,
  tokenizerInstance: null,
  workerStatus: 'idle',
  adapterLoaded: false,
  currentModel: 'qwen-0.5b',
  isQuantized: true,
};

const AUDIT_MAP: Record<string, string> = {
  '{audit_clean_no_misstate}': 'Clean audit with no material misstatements',
  '{audit_clean}': 'Clean audit opinion',
  '{audit_qualified}': 'Qualified opinion on contingent liabilities',
  '{audit_unmodified}': 'Unmodified opinion',
  '{audit_unmodified_emphasis}': 'Unmodified opinion with emphasis of matter',
};

const EXCHANGE_MAP: Record<string, string> = {
  '{exchange_nse}': 'PSE Mainboard/SME',
  '{exchange_bse}': 'PSE',
};

function resolvePlaceholders(template: string, data: Record<string, any>): string {
  let result = template
    .replace('{ticker}', data.ticker ?? '{ticker}')
    .replace(
      '{market_cap}',
      `Rs${Number(data.marketCapCr ?? 0).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    )
    .replace('{pe_ratio}', String(data.peRatio ?? ''))
    .replace('{de_ratio}', String(data.debtToEquity ?? ''))
    .replace('{pledge_pct}', String(data.pledgePct ?? ''));
  for (const [ph, val] of Object.entries(EXCHANGE_MAP)) result = result.replaceAll(ph, val);
  for (const [ph, val] of Object.entries(AUDIT_MAP)) result = result.replaceAll(ph, val);
  return result;
}

/**
 * Load model with automatic fallback chain
 */
async function loadModelWithFallback(
  targetModel: 'qwen-0.5b' | 'qwen-7b',
  AutoModelForCausalLM: any,
  AutoTokenizer: any,
): Promise<string> {
  const models = {
    'qwen-7b': {
      repo: 'Qwen/Qwen2.5-7B-Instruct',
      desc: 'powerful',
    },
    'qwen-0.5b': {
      repo: 'samvidhh/Qwen2.5-0.5B-stockmarket-encyclopedia',
      desc: 'fast',
    },
  };

  const modelConfig = models[targetModel];

  (self as any).postMessage({
    type: 'STATUS_UPDATE',
    message: `Loading ${modelConfig.desc} model (${targetModel})...`,
  });

  try {
    // Check device memory for 7B
    if (targetModel === 'qwen-7b') {
      const deviceMemory = (navigator as any).deviceMemory || 8;
      if (deviceMemory < 6) {
        throw new Error(`Need 6GB RAM for Qwen7B, device has ${deviceMemory}GB. Falling back to 0.5B`);
      }
    }

    // Load tokenizer
    state.tokenizerInstance = await AutoTokenizer.from_pretrained(modelConfig.repo);

    // Load model with progress
    const startTime = Date.now();
    state.modelInstance = await AutoModelForCausalLM.from_pretrained(modelConfig.repo, {
      device: 'webgpu',
      dtype: 'q4',
      progress_callback: (progress: { loaded: number; total: number }) => {
        const pct = Math.round((progress.loaded / progress.total) * 100);
        (self as any).postMessage({
          type: 'STATUS_UPDATE',
          message: `Loading... ${pct}% (${Math.round(progress.loaded / 1024 / 1024)}MB)`,
        });
      },
    });

    const loadTime = Date.now() - startTime;
    state.currentModel = targetModel;
    state.workerStatus = 'ready';

    (self as any).postMessage({
      type: 'STATUS_UPDATE',
      message: `✅ ${modelConfig.desc} model ready (${Math.round(loadTime / 1000)}s)`,
    });

    return modelConfig.repo;
  } catch (error) {
    (self as any).postMessage({
      type: 'STATUS_UPDATE',
      message: `⚠️ ${targetModel} failed. Trying fallback...`,
    });

    if (targetModel === 'qwen-7b') {
      return loadModelWithFallback('qwen-0.5b', AutoModelForCausalLM, AutoTokenizer);
    }

    throw error;
  }
}

(self as any).onmessage = async (e: { data: any }) => {
  const { type, payload } = e.data;

  if (type === 'INITIALIZE_BROWSER_LLM') {
    try {
      state.workerStatus = 'loading';
      (self as any).postMessage({ type: 'STATUS_UPDATE', message: 'Initializing WebGPU engine...' });

      const { AutoTokenizer, AutoModelForCausalLM } = await import('@huggingface/transformers');

      // Auto-detect best model for device
      let targetModel: 'qwen-0.5b' | 'qwen-7b' = 'qwen-0.5b';
      if (payload?.preferLarge) {
        targetModel = 'qwen-7b';
      } else {
        const deviceMemory = (navigator as any).deviceMemory || 8;
        if (deviceMemory >= 8) {
          targetModel = 'qwen-7b';
          (self as any).postMessage({
            type: 'STATUS_UPDATE',
            message: '💡 High-memory device detected. Attempting Qwen7B (powerful model)...',
          });
        }
      }

      await loadModelWithFallback(targetModel, AutoModelForCausalLM, AutoTokenizer);

      (self as any).postMessage({
        type: 'INITIALIZED_SUCCESS',
        modelInfo: {
          modelId: state.currentModel,
          device: 'webgpu',
          ready: true,
          adapterLoaded: state.adapterLoaded,
          quantized: state.isQuantized,
        },
      });
    } catch (error) {
      state.workerStatus = 'failed';
      (self as any).postMessage({
        type: 'INITIALIZATION_FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    return;
  }

  if (type === 'SWITCH_MODEL') {
    try {
      const { targetModel } = payload;
      state.workerStatus = 'loading';

      const { AutoTokenizer, AutoModelForCausalLM } = await import('@huggingface/transformers');
      await loadModelWithFallback(targetModel, AutoModelForCausalLM, AutoTokenizer);

      (self as any).postMessage({
        type: 'MODEL_SWITCHED',
        model: state.currentModel,
      });
    } catch (error) {
      state.workerStatus = 'failed';
      (self as any).postMessage({
        type: 'SWITCH_FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    return;
  }

  if (type === 'GENERATE_ON_GPU' || type === 'GENERATE_ENCYCLOPEDIA') {
    if (state.workerStatus !== 'ready') {
      (self as any).postMessage({ type: 'GENERATION_FAILED', error: 'WebGPU engine not ready' });
      return;
    }

    try {
      const { systemPrompt, userPrompt } = payload;
      const isEncyclopedia = type === 'GENERATE_ENCYCLOPEDIA';

      (self as any).postMessage({
        type: 'STATUS_UPDATE',
        message: isEncyclopedia ? 'Generating encyclopedia entry...' : 'Computing inference...',
      });

      const messages = [
        {
          role: 'system',
          content:
            systemPrompt ||
            'You are StockEX, a helpful, friendly, and knowledgeable AI assistant specialised in PSX stock market research. You speak naturally and conversationally. You provide accurate financial information but NEVER give personalised investment advice. You always include SEC disclaimers when discussing investments. You are not a PSE-listed advisor.',
        },
        { role: 'user', content: userPrompt },
      ];

      const text = state.tokenizerInstance.apply_chat_template(messages, {
        tokenize: false,
        add_generation_prompt: true,
      });
      const tokenizedInput = state.tokenizerInstance(text, { truncation: true, max_length: 2048 });

      const outputs = await state.modelInstance.generate({
        input_ids: tokenizedInput.input_ids,
        max_new_tokens: 200,
        temperature: 0.1,
        do_sample: false,
      });

      let decodedText = state.tokenizerInstance.decode(outputs, { skip_special_tokens: true });
      if (decodedText.includes('assistant\n'))
        decodedText = decodedText.split('assistant\n').pop() || decodedText;
      decodedText = decodedText.trim();

      let resolved = decodedText;
      if (isEncyclopedia && payload.encyclopediaData) {
        resolved = resolvePlaceholders(decodedText, payload.encyclopediaData);
      }

      (self as any).postMessage({
        type: 'GENERATION_COMPLETE',
        response: resolved,
        raw: isEncyclopedia ? decodedText : undefined,
      });
    } catch (error) {
      state.workerStatus = 'failed';
      (self as any).postMessage({
        type: 'GENERATION_FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
};
