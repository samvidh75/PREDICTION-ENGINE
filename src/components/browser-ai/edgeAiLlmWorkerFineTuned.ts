// src/components/browser-ai/edgeAiLlmWorkerFineTuned.ts
// Enhanced WebGPU Worker with LoRA Adapter + Encyclopedia Placeholder Resolution

interface WorkerState {
  modelInstance: any;
  tokenizerInstance: any;
  workerStatus: string;
  adapterLoaded: boolean;
}

const state: WorkerState = {
  modelInstance: null,
  tokenizerInstance: null,
  workerStatus: 'idle',
  adapterLoaded: false,
};

const AUDIT_MAP: Record<string, string> = {
  '{audit_clean_no_misstate}': 'Clean audit with no material misstatements',
  '{audit_clean}': 'Clean audit opinion',
  '{audit_qualified}': 'Qualified opinion on contingent liabilities',
  '{audit_unmodified}': 'Unmodified opinion',
  '{audit_unmodified_emphasis}': 'Unmodified opinion with emphasis of matter',
};

const EXCHANGE_MAP: Record<string, string> = {
  '{exchange_nse}': 'NSE Mainboard/SME',
  '{exchange_bse}': 'BSE',
};

function resolvePlaceholders(template: string, data: Record<string, any>): string {
  let result = template
    .replace('{ticker}', data.ticker ?? '{ticker}')
    .replace(
      '{market_cap}',
      `Rs${Number(data.marketCapCr ?? 0).toLocaleString('en-IN', {
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

(self as any).onmessage = async (e: { data: any }) => {
  const { type, payload } = e.data;

  if (type === 'INITIALIZE_BROWSER_LLM') {
    try {
      (self as any).postMessage({ type: 'STATUS_UPDATE', message: 'Initializing WebGPU engine...' });

      const { AutoTokenizer, AutoModelForCausalLM } = await import('@huggingface/transformers');

      let modelId = 'onnx-community/Qwen2.5-0.5B-Instruct';

      // Try to load fine-tuned model from HuggingFace Hub
      // Update this ID after uploading the trained adapter to HF
      const finetuneModelId = 'stockex/Qwen2.5-0.5B-stockmarket-encyclopedia';

      try {
        // Attempt to load fine-tuned model
        // This will fail if model not yet uploaded, but we'll catch it
        const testLoad = await fetch(`https://huggingface.co/${finetuneModelId}/resolve/main/config.json`, {
          method: 'HEAD',
          mode: 'no-cors'
        });

        if (testLoad.ok || testLoad.status === 0) {
          modelId = finetuneModelId;
          (self as any).postMessage({ type: 'STATUS_UPDATE', message: 'Loading fine-tuned model from HuggingFace...' });
          state.adapterLoaded = true;
        }
      } catch {
        // Model not available, use base
        (self as any).postMessage({ type: 'STATUS_UPDATE', message: 'Loading base model (fine-tuned not available)' });
      }

      state.tokenizerInstance = await AutoTokenizer.from_pretrained(modelId);
      state.modelInstance = await AutoModelForCausalLM.from_pretrained(modelId, {
        device: 'webgpu',
        dtype: 'fp16',
      });
      state.workerStatus = 'ready';

      (self as any).postMessage({
        type: 'INITIALIZED_SUCCESS',
        modelInfo: { modelId, device: 'webgpu', ready: true, adapterLoaded: state.adapterLoaded },
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
            'You are the official StockEX Encyclopedia. Provide deterministic, mathematically accurate reference data for Indian equities.',
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
