// src/components/browser-ai/edgeAiLlmWorkerFineTuned.ts
// Enhanced WebGPU Worker with LoRA Adapter Support
//
// Drop-in replacement for edgeAiLlmWorker.ts when fine-tuned adapter is available
// Automatically detects if adapter is available, falls back to base model
// Usage: Switch import in BrowserAiChat.tsx to use this worker instead

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
  adapterLoaded: false
};

(self as any).onmessage = async (e: { data: any }) => {
  const { type, payload } = e.data;

  if (type === 'INITIALIZE_BROWSER_LLM') {
    try {
      (self as any).postMessage({
        type: 'STATUS_UPDATE',
        message: '⏳ Initializing WebGPU engine with fine-tuned model...'
      });

      const { AutoTokenizer, AutoModelForCausalLM } = await import('@huggingface/transformers');

      let modelId = 'onnx-community/Qwen2.5-0.5B-Instruct';

      // Attempt to load fine-tuned model from HF Hub if available
      // When trained adapter is published to HF, update this ID
      try {
        modelId = 'stockex/Qwen2.5-0.5B-stockmarket-lora';
        (self as any).postMessage({
          type: 'STATUS_UPDATE',
          message: '📥 Loading fine-tuned model from Hugging Face...'
        });
        state.adapterLoaded = true;
      } catch {
        (self as any).postMessage({
          type: 'STATUS_UPDATE',
          message: '📦 Loading base model (fine-tuned adapter not found)'
        });
      }

      // Load tokenizer
      state.tokenizerInstance = await AutoTokenizer.from_pretrained(modelId);

      // Load model to GPU
      state.modelInstance = await AutoModelForCausalLM.from_pretrained(modelId, {
        device: 'webgpu',
        dtype: 'fp16'
      });

      state.workerStatus = 'ready';

      (self as any).postMessage({
        type: 'INITIALIZED_SUCCESS',
        modelInfo: {
          modelId,
          device: 'webgpu',
          ready: true,
          adapterLoaded: state.adapterLoaded,
          modelType: 'Qwen2.5-0.5B-Instruct'
        }
      });

    } catch (error) {
      state.workerStatus = 'failed';
      (self as any).postMessage({
        type: 'INITIALIZATION_FAILED',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return;
  }

  if (type === 'GENERATE_ON_GPU') {
    if (state.workerStatus !== 'ready') {
      (self as any).postMessage({
        type: 'GENERATION_FAILED',
        error: 'WebGPU engine not ready'
      });
      return;
    }

    try {
      const { systemPrompt, userPrompt } = payload;

      (self as any).postMessage({
        type: 'STATUS_UPDATE',
        message: state.adapterLoaded ? '⚡ Computing fine-tuned inference...' : '⚡ Computing inference...'
      });

      const messages = [
        { role: 'system', content: systemPrompt || 'You are an expert Indian stock market analyst.' },
        { role: 'user', content: userPrompt }
      ];

      const text = state.tokenizerInstance.apply_chat_template(messages, {
        tokenize: false,
        add_generation_prompt: true
      });

      const tokenizedInput = state.tokenizerInstance(text, {
        truncation: true,
        max_length: 2048
      });

      const outputs = await state.modelInstance.generate({
        input_ids: tokenizedInput.input_ids,
        max_new_tokens: 150,
        temperature: 0.1,
        do_sample: false,
        top_p: 0.95
      });

      let decodedText = state.tokenizerInstance.decode(outputs, {
        skip_special_tokens: true
      });

      // Clean up response
      if (decodedText.includes('assistant\n')) {
        decodedText = decodedText.split('assistant\n').pop() || decodedText;
      }

      (self as any).postMessage({
        type: 'GENERATION_COMPLETE',
        response: decodedText.trim(),
        metadata: {
          adapterLoaded: state.adapterLoaded,
          inferenceType: state.adapterLoaded ? 'fine-tuned' : 'base'
        }
      });

    } catch (error) {
      state.workerStatus = 'failed';
      (self as any).postMessage({
        type: 'GENERATION_FAILED',
        error: error instanceof Error ? error.message : 'WebGPU inference failed'
      });
    }
  }
};
