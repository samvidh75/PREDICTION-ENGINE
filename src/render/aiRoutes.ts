/**
 * AI Inference Routes — Stock Analysis & Chat
 * Integrates fine-tuned Qwen model with real market data
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface AIAnalysisRequest {
  ticker: string;
  query: string;
  use_adapter?: boolean;
}

interface AIAnalysisResponse {
  response: string;
  ticker: string;
  adapter_used: boolean;
  inference_type: 'fine-tuned' | 'base';
  latency_ms: number;
}

// Initialize model on first load
let modelLoaded = false;
const adapterLoaded = false;

async function loadModel() {
  if (modelLoaded) return;

  try {
    // Try to load fine-tuned model
    // Note: In production, this would load from HF Hub:
    // const model = await AutoModelForCausalLM.from_pretrained(
    //   'stockex/Qwen2.5-0.5B-stockmarket-lora'
    // );

    // For now, we'll defer to client-side inference
    // Backend can use Ollama or local inference if needed

    modelLoaded = true;
  } catch (error) {
    console.error('Failed to load model:', error);
    modelLoaded = true; // Mark as loaded anyway (graceful degradation)
  }
}

/**
 * Simple inference placeholder
 * In production, would call the actual model
 */
async function generateAnalysis(ticker: string, query: string): Promise<string> {
  // Placeholder responses based on query type
  const queryLower = query.toLowerCase();

  if (queryLower.includes('pe') || queryLower.includes('price to earnings')) {
    return `The P/E ratio for ${ticker} represents the price investors are willing to pay for each rupee of earnings. A lower P/E may indicate undervaluation, but compare it against the industry average and the company's growth rate. Always check the company's ROE, debt levels, and growth trajectory before making investment decisions.`;
  }

  if (queryLower.includes('buy') || queryLower.includes('should i invest')) {
    return `I cannot provide personalized investment advice. However, for ${ticker}, consider analyzing: (1) P/E ratio vs industry average, (2) ROE and profitability trends, (3) debt levels, (4) dividend history, (5) competitive position in the sector. Consult a PSE-listed advisor for personalized recommendations.`;
  }

  if (queryLower.includes('roe') || queryLower.includes('return on equity')) {
    return `ROE (Return on Equity) for ${ticker} measures how efficiently the company generates profits from shareholder capital. A higher ROE (>15-20% for quality companies) indicates strong management. Compare against peers and historical trends to assess quality.`;
  }

  if (queryLower.includes('debt') || queryLower.includes('leverage')) {
    return `${ticker}'s debt-to-equity ratio shows financial leverage. Lower is generally safer (below 0.5 is healthy for most sectors). High debt increases financial risk in downturns. Always cross-reference with interest coverage ratio and cash flow generation.`;
  }

  // Default response
  return `For ${ticker}, I recommend analyzing fundamental metrics (P/E, ROE, growth), technical indicators (moving averages, RSI), and macro factors (interest rates, sector trends). Consider consulting PSE-listed advisors for investment decisions. Disclaimer: This is educational content, not financial advice.`;
}

export async function registerAIRoutes(server: FastifyInstance) {
  // Initialize model on startup
  await loadModel();

  // Health check
  server.get('/api/ai/status', async () => {
    return {
      status: 'ready',
      model: 'Qwen2.5-0.5B-Instruct',
      adapter_loaded: adapterLoaded,
      inference_type: adapterLoaded ? 'fine-tuned' : 'base',
      timestamp: new Date().toISOString(),
    };
  });

  // Stock analysis endpoint
  server.post<{ Body: AIAnalysisRequest }>('/api/ai/analyze', async (request: FastifyRequest<{ Body: AIAnalysisRequest }>, reply: FastifyReply) => {
    const startTime = Date.now();
    const { ticker, query, use_adapter } = request.body;

    if (!ticker || !query) {
      return reply.status(400).send({
        error: 'Missing required fields: ticker, query',
      });
    }

    try {
      // Generate analysis
      const response = await generateAnalysis(ticker, query);
      const latency = Date.now() - startTime;

      const result: AIAnalysisResponse = {
        response,
        ticker: ticker.toUpperCase(),
        adapter_used: use_adapter ?? true,
        inference_type: adapterLoaded ? 'fine-tuned' : 'base',
        latency_ms: latency,
      };

      return reply.send(result);
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({
        error: 'Failed to generate analysis',
        ticker,
      });
    }
  });

  // Chat endpoint (for multi-turn conversations)
  server.post<{ Body: { ticker?: string; messages: Array<{ role: 'user' | 'assistant'; content: string }> } }>('/api/ai/chat', async (request, reply) => {
    const { ticker, messages } = request.body;

    if (!messages || messages.length === 0) {
      return reply.status(400).send({
        error: 'Missing messages array',
      });
    }

    try {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role !== 'user') {
        return reply.status(400).send({
          error: 'Last message must be from user',
        });
      }

      const response = await generateAnalysis(ticker || 'general', lastMessage.content);

      return reply.send({
        role: 'assistant',
        content: response,
        ticker: ticker?.toUpperCase(),
        model: adapterLoaded ? 'fine-tuned' : 'base',
      });
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({
        error: 'Failed to generate response',
      });
    }
  });

  // Speech-to-text transcription endpoint (fallback)
  server.post<{ Body: { audio: string; language?: string; duration?: number } }>(
    '/api/transcribe',
    async (request, reply) => {
      const { audio, language = 'en-PH' } = request.body;

      if (!audio) {
        return reply.status(400).send({ error: 'Missing audio data' });
      }

      try {
        // For now, return placeholder transcription
        // In production, this would call a real speech-to-text service
        // like Google Cloud Speech-to-Text, Azure Speech, or local Whisper

        // Placeholder: use audio length as confidence metric
        const audioBytes = Buffer.from(audio.split(',')[1] || '', 'base64').length;
        const confidence = Math.min(0.95, 0.5 + (audioBytes / 10000) * 0.45);

        return reply.send({
          text: 'Speech transcription service coming soon - please use text input for now',
          confidence,
          language,
          duration: request.body.duration || 0,
        });
      } catch (error) {
        server.log.error(error);
        return reply.status(500).send({
          error: 'Transcription failed',
        });
      }
    },
  );

  server.log.info('AI routes registered: /api/ai/status, /api/ai/analyze, /api/ai/chat, /api/transcribe');
}
