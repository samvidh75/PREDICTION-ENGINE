/**
 * WebGPU + WebSocket Model Inference Server
 * Runs LLMs locally using transformers.js with WebGPU acceleration
 */

import type { FastifyInstance } from 'fastify';

// Message types for WebSocket communication
interface InferenceRequest {
  id: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

interface InferenceResponse {
  id: string;
  status: 'start' | 'streaming' | 'complete' | 'error';
  content?: string;
  token?: string;
  error?: string;
  totalTokens?: number;
}

// Model cache (loaded once)
const modelCache = new Map<string, any>();
let transformersModule: any = null;

async function loadTransformersModule() {
  if (transformersModule) return transformersModule;

  try {
    transformersModule = await import('@xenova/transformers');
    console.log('[Model] Transformers.js loaded with WebGPU support');
    return transformersModule;
  } catch (error) {
    console.error('[Model] Failed to load transformers.js:', error);
    throw error;
  }
}

/**
 * Load or get cached model
 */
async function getModel(modelName: string) {
  if (modelCache.has(modelName)) {
    return modelCache.get(modelName);
  }

  try {
    const transformers = await loadTransformersModule();
    const { pipeline } = transformers;

    console.log(`[Model] Loading ${modelName}...`);
    const model = await pipeline('text-generation', modelName, {
      device: 'webgpu', // Use WebGPU if available, fallback to WebAssembly
    });

    modelCache.set(modelName, model);
    console.log(`[Model] ${modelName} loaded successfully`);
    return model;
  } catch (error) {
    console.error(`[Model] Failed to load ${modelName}:`, error);
    throw error;
  }
}

/**
 * Run inference on a prompt
 */
async function runInference(
  modelName: string,
  prompt: string,
  systemPrompt?: string,
  maxTokens = 256,
  temperature = 0.7
): Promise<string> {
  try {
    const model = await getModel(modelName);

    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

    const result = await model(fullPrompt, {
      max_new_tokens: maxTokens,
      temperature: temperature,
      do_sample: true,
      top_k: 50,
      top_p: 0.95,
    });

    if (Array.isArray(result) && result.length > 0) {
      return result[0].generated_text || '';
    }

    return '';
  } catch (error) {
    console.error('[Model] Inference error:', error);
    throw error;
  }
}

/**
 * Register WebSocket routes for model inference
 */
export function registerModelInferenceRoutes(server: FastifyInstance) {
  // WebSocket endpoint for real-time model inference
  server.register(async (fastify) => {
    fastify.get('/ws/ai', { websocket: true }, (socket) => {
      console.log('[WebSocket] AI inference connection established');

      socket.on('message', async (message: string) => {
        try {
          const request: InferenceRequest = JSON.parse(message);
          console.log(`[Inference] Request ID: ${request.id}, Prompt: ${request.prompt.substring(0, 50)}...`);

          // Send start signal
          socket.send(JSON.stringify({
            id: request.id,
            status: 'start',
          } as InferenceResponse));

          // Determine model based on complexity
          let model = 'Xenova/distilgpt2'; // Fast, lightweight default

          if (request.prompt.length > 100) {
            model = 'Xenova/gpt2'; // Medium
          }

          if (request.prompt.includes('analyze') || request.prompt.includes('compare')) {
            model = 'Xenova/gpt2'; // Use slightly larger model for analysis
          }

          // Run inference
          const result = await runInference(
            model,
            request.prompt,
            request.systemPrompt,
            request.maxTokens || 256,
            request.temperature || 0.7
          );

          // Stream tokens (simulated for compatibility)
          const tokens = result.split(' ');
          for (const token of tokens) {
            socket.send(JSON.stringify({
              id: request.id,
              status: 'streaming',
              token: token + ' ',
            } as InferenceResponse));
          }

          // Send completion
          socket.send(JSON.stringify({
            id: request.id,
            status: 'complete',
            content: result,
            totalTokens: tokens.length,
          } as InferenceResponse));

        } catch (error) {
          console.error('[Inference] Error:', error);
          const request: Partial<InferenceRequest> = {};
          try {
            Object.assign(request, JSON.parse(message));
          } catch (parseError) {
            // Ignore parse errors
          }

          socket.send(JSON.stringify({
            id: request.id || 'unknown',
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          } as InferenceResponse));
        }
      });

      socket.on('close', () => {
        console.log('[WebSocket] AI inference connection closed');
      });

      socket.on('error', (error) => {
        console.error('[WebSocket] Error:', error);
      });
    });
  });

  // Health check endpoint
  server.get('/api/ai/models', async () => {
    return {
      status: 'ready',
      models: Array.from(modelCache.keys()),
      webgpuSupported: typeof navigator !== 'undefined' && 'gpu' in navigator,
      timestamp: new Date().toISOString(),
    };
  });

  console.log('[Model] Inference routes registered');
}

export { runInference, getModel };
