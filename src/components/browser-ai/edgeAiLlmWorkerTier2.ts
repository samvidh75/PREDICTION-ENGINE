// src/components/browser-ai/edgeAiLlmWorkerTier2.ts
// WebGPU Workers for 100% On-Device LLM Inference (Tier 2)
//
// Implements the complete WebGPU + Hugging Face Transformers.js pipeline
// for running Qwen2.5-1B-Instruct directly in the browser GPU

// Worker state management
// @ts-expect-error - Variables are isolated within Worker context
let modelInstance: any = null;
// @ts-expect-error - Variables are isolated within Worker context
let tokenizerInstance: any = null;
// @ts-expect-error - Variables are isolated within Worker context
let workerStatus = 'idle';

// Message handler for WebGPU inference
(self as any).onmessage = async (e: { data: any }) => {
  const { type, payload } = e.data;

  if (type === 'INITIALIZE_BROWSER_LLM') {
    try {
      (self as any).postMessage({
        type: 'STATUS_UPDATE',
        message: '🧠 Initializing 1B model with WebGPU...'
      });

      const { AutoTokenizer, AutoModelForCausalLM } = await import('@huggingface/transformers');

      const modelId = 'onnx-community/Qwen2.5-1B-Instruct';

      // Load tokenizer
      tokenizerInstance = await AutoTokenizer.from_pretrained(modelId);

      // Load model to GPU
      modelInstance = await AutoModelForCausalLM.from_pretrained(modelId, {
        device: 'webgpu',
        dtype: 'fp16'
      });

      workerStatus = 'ready';

      (self as any).postMessage({
        type: 'INITIALIZED_SUCCESS',
        modelInfo: { modelId, device: 'webgpu', ready: true }
      });

    } catch (error) {
      workerStatus = 'failed';
      (self as any).postMessage({
        type: 'INITIALIZATION_FAILED',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return;
  }

  if (type === 'GENERATE_ON_GPU') {
    if (workerStatus !== 'ready') {
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
        message: '🧠 Computing inference with 1B model...'
      });

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      const text = tokenizerInstance.apply_chat_template(messages, {
        tokenize: false,
        add_generation_prompt: true
      });

      const tokenizedInput = tokenizerInstance(text, {
        truncation: true,
        max_length: 2048
      });

      const outputs = await modelInstance.generate({
        input_ids: tokenizedInput.input_ids,
        max_new_tokens: 150,
        temperature: 0.1,
        do_sample: false
      });

      let decodedText = tokenizerInstance.decode(outputs, {
        skip_special_tokens: true
      });

      if (decodedText.includes('assistant\n')) {
        decodedText = decodedText.split('assistant\n').pop() || decodedText;
      }

      (self as any).postMessage({
        type: 'GENERATION_COMPLETE',
        response: decodedText.trim()
      });

    } catch (error) {
      workerStatus = 'failed';
      (self as any).postMessage({
        type: 'GENERATION_FAILED',
        error: error instanceof Error ? error.message : 'WebGPU inference failed'
      });
    }
  }
};
