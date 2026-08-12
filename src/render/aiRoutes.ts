/**
 * AI Inference Routes — Stock Analysis & Chat
 * Proxies to the fine-tuned StockEX LoRA model server (Python backend v3)
 * Featuress: 50+ factor predictions, user-as-data-source, web scraping, WebSocket streaming
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface AIAnalysisRequest {
  ticker: string;
  query: string;
  use_adapter?: boolean;
  session_id?: string;
}

interface AIAnalysisResponse {
  response: string;
  ticker: string;
  adapter_used: boolean;
  inference_type: 'fine-tuned' | 'base';
  latency_ms: number;
}

interface LivePriceSubmission {
  ticker: string;
  price: number;
  user_id: string;
  source?: string;
  volume?: number;
  bid?: number;
  ask?: number;
}

const LORA_SERVER_URL = process.env.LORA_SERVER_URL || 'http://127.0.0.1:3001';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'stockex';

async function queryLoraServer(ticker: string, query: string): Promise<{ response: string; adapter_used: boolean } | null> {
  try {
    const res = await fetch(`${LORA_SERVER_URL}/api/ai/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker, query, use_adapter: true }),
      signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { response: data.response, adapter_used: data.adapter_used ?? true };
  } catch {
    return null;
  }
}

async function queryLoraServerChat(messages: Array<{ role: string; content: string }>, ticker?: string): Promise<{ response: string; adapter_used: boolean } | null> {
  try {
    const res = await fetch(`${LORA_SERVER_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, ticker }),
      signal: AbortSignal.timeout(180000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { response: data.response, adapter_used: data.adapter_used ?? true };
  } catch {
    return null;
  }
}

async function queryOllama(ticker: string, query: string): Promise<string | null> {
  try {
    const prompt = `You are an expert Philippine stock market analyst. Analyze ${ticker} based on: ${query}. Focus on P/E ratio, ROE, growth rate, debt levels, dividend yield. Keep responses under 150 words.`;
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        options: { temperature: 0.1, top_p: 0.95 },
        stream: false,
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.response || null;
  } catch {
    return null;
  }
}

async function proxyLoraPost(urlPath: string, body: unknown, timeout = 10000): Promise<unknown> {
  const res = await fetch(`${LORA_SERVER_URL}${urlPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeout),
  });
  if (!res.ok) throw new Error(`LoRA proxy error: ${res.status} ${res.statusText}`);
  return res.json();
}

async function proxyLoraGet(urlPath: string, timeout = 10000): Promise<unknown> {
  const res = await fetch(`${LORA_SERVER_URL}${urlPath}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(timeout),
  });
  if (!res.ok) throw new Error(`LoRA proxy error: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function registerAIRoutes(server: FastifyInstance) {
  // ── Status ──────────────────────────────────────────────────────────
  server.get('/api/ai/status', async () => {
    let loraStatus = 'unreachable';
    let ollamaStatus = 'unreachable';
    let activeBackend = 'unavailable';

    try {
      const lora = await fetch(`${LORA_SERVER_URL}/api/ai/status`, { signal: AbortSignal.timeout(3000) });
      if (lora.ok) {
        const data = await lora.json();
        loraStatus = 'ready';
        activeBackend = data.adapter_loaded ? 'fine-tuned' : 'base';
      }
    } catch {
      /* ignore backend check failure */
    }

    if (activeBackend === 'unavailable') {
      try {
        const ollama = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
        if (ollama.ok) {
          ollamaStatus = 'ready';
          activeBackend = 'ollama';
        }
      } catch {
        /* ignore backend check failure */
      }
    }

    return {
      status: 'ready',
      version: '3.0.0',
      model: 'Qwen2.5-0.5B-Instruct + stockex_slm_agent_output',
      capabilities: [
        'analyze', 'chat', 'predict', 'live_prices', 'web_scraping',
        'user_data_source', 'websocket_streaming', 'reputation_system',
      ],
      prediction_factors: 50,
      backends: { lora_server: loraStatus, ollama: ollamaStatus },
      active_backend: activeBackend,
      timestamp: new Date().toISOString(),
    };
  });

  // ── Analyze (LLM analysis) ──────────────────────────────────────────
  server.post<{ Body: AIAnalysisRequest }>('/api/ai/analyze', async (request: FastifyRequest<{ Body: AIAnalysisRequest }>, reply: FastifyReply) => {
    const startTime = Date.now();
    const { ticker, query, session_id } = request.body;

    if (!ticker || !query) {
      return reply.status(400).send({ error: 'Missing required fields: ticker, query' });
    }

    try {
      let response: string | null = null;
      let adapter_used = false;
      let inference_type: 'fine-tuned' | 'base' = 'base';

      const loraResult = await queryLoraServer(ticker, query);
      if (loraResult) {
        response = loraResult.response;
        adapter_used = loraResult.adapter_used;
        inference_type = 'fine-tuned';
      } else {
        const ollamaResult = await queryOllama(ticker, query);
        if (ollamaResult) {
          response = ollamaResult;
          adapter_used = true;
          inference_type = 'fine-tuned';
        }
      }

      if (!response) {
        return reply.status(503).send({ error: 'Model backend unavailable', ticker });
      }

      return reply.send({
        response,
        ticker: ticker.toUpperCase(),
        adapter_used,
        inference_type,
        latency_ms: Date.now() - startTime,
      } satisfies AIAnalysisResponse);
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ error: 'Failed to generate analysis', ticker });
    }
  });

  // ── Chat ────────────────────────────────────────────────────────────────
  server.post<{ Body: { ticker?: string; messages: Array<{ role: 'user' | 'assistant'; content: string }>; session_id?: string } }>('/api/ai/chat', async (request, reply) => {
    const { ticker, messages, session_id } = request.body;

    if (!messages || messages.length === 0) {
      return reply.status(400).send({ error: 'Missing messages array' });
    }

    try {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role !== 'user') {
        return reply.status(400).send({ error: 'Last message must be from user' });
      }

      const query = lastMessage.content;
      let response: string | null = null;
      let adapter_used = false;

      const loraResult = await queryLoraServerChat(messages, ticker);
      if (loraResult) {
        response = loraResult.response;
        adapter_used = loraResult.adapter_used;
      } else {
        const ollamaResult = await queryOllama(ticker || 'general', query);
        if (ollamaResult) {
          response = ollamaResult;
          adapter_used = true;
        }
      }

      if (!response) {
        return reply.status(503).send({ error: 'Model backend unavailable' });
      }

      return reply.send({
        role: 'assistant',
        content: response,
        ticker: ticker?.toUpperCase(),
        model: adapter_used ? 'fine-tuned' : 'base',
      });
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ error: 'Failed to generate response' });
    }
  });

  // ── Prediction Engine (50+ factors) ─────────────────────────────────
  server.post('/api/ai/prediction/:ticker', async (request: FastifyRequest<{ Params: { ticker: string }; Querystring: { horizon?: string } }>, reply: FastifyReply) => {
    try {
      const ticker = request.params.ticker;
      if (!ticker) {
        return reply.status(400).send({ error: 'Missing ticker parameter' });
      }
      const data = await proxyLoraPost(`/api/ai/prediction/${ticker}`, {}, 15000);
      return reply.send(data);
    } catch (error: any) {
      server.log.error(error);
      return reply.status(502).send({ error: 'Prediction service unavailable', detail: error.message });
    }
  });

  // ── Live Price Submission (User-as-Data-Source) ─────────────────────
  server.post('/api/ai/live-price', async (request: FastifyRequest<{ Body: LivePriceSubmission }>, reply: FastifyReply) => {
    try {
      const data = await proxyLoraPost('/api/ai/live-price', request.body, 5000);
      return reply.send(data);
    } catch (error: any) {
      server.log.error(error);
      return reply.status(502).send({ error: 'Live price service unavailable', detail: error.message });
    }
  });

  // ── All Live Prices ─────────────────────────────────────────────────
  server.get('/api/ai/live-prices', async (_request, reply) => {
    try {
      const data = await proxyLoraGet('/api/ai/live-prices', 5000);
      return reply.send(data);
    } catch (error: any) {
      server.log.error(error);
      return reply.status(502).send({ error: 'Live prices unavailable', detail: error.message });
    }
  });

  // ── User Reputation ─────────────────────────────────────────────────
  server.get('/api/ai/user-reputation/:userId', async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
    try {
      const data = await proxyLoraGet(`/api/ai/user-reputation/${request.params.userId}`, 5000);
      return reply.send(data);
    } catch (error: any) {
      server.log.error(error);
      return reply.status(502).send({ error: 'Reputation service unavailable', detail: error.message });
    }
  });

  // ── Web Scraping: Screener.in ───────────────────────────────────────
  server.get('/api/ai/screener/:ticker', async (request: FastifyRequest<{ Params: { ticker: string } }>, reply: FastifyReply) => {
    try {
      const data = await proxyLoraGet(`/api/ai/screener/${request.params.ticker}`, 10000);
      return reply.send(data);
    } catch (error: any) {
      server.log.error(error);
      return reply.status(502).send({ error: 'Scraper unavailable', detail: error.message });
    }
  });

  // ── Web Scraping: Tickertape ────────────────────────────────────────
  server.get('/api/ai/tickertape/:ticker', async (request: FastifyRequest<{ Params: { ticker: string } }>, reply: FastifyReply) => {
    try {
      const data = await proxyLoraGet(`/api/ai/tickertape/${request.params.ticker}`, 10000);
      return reply.send(data);
    } catch (error: any) {
      server.log.error(error);
      return reply.status(502).send({ error: 'Scraper unavailable', detail: error.message });
    }
  });

  // ── Cache Info ──────────────────────────────────────────────────────
  server.get('/api/ai/cache-info', async (_request, reply) => {
    try {
      const data = await proxyLoraGet('/api/ai/cache-info', 5000);
      return reply.send(data);
    } catch (error: any) {
      server.log.error(error);
      return reply.status(502).send({ error: 'Cache info unavailable', detail: error.message });
    }
  });

  // ── Force Cache Refresh ─────────────────────────────────────────────
  server.post('/api/ai/refresh-cache', async (_request, reply) => {
    try {
      const data = await proxyLoraPost('/api/ai/refresh-cache', {}, 300000);
      return reply.send(data);
    } catch (error: any) {
      server.log.error(error);
      return reply.status(502).send({ error: 'Cache refresh failed', detail: error.message });
    }
  });

  // ── WebSocket Live Prices (bridges to Python v3 backend) ──────────
  server.get('/ws/live-prices', { websocket: true }, (socket) => {
    let pySocket: any = null;
    let closed = false;

    const connectToPython = () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { WebSocket } = require('ws');
        const py = new WebSocket(LORA_SERVER_URL.replace(/^http/, 'ws') + '/ws/live-prices');
        pySocket = py;

        py.on('open', () => {
          if (closed) { py.close(); return; }
          socket.send(JSON.stringify({ type: 'connected', message: 'Live price stream active' }));
        });

        py.on('message', (data: Buffer) => {
          if (!closed) socket.send(data.toString());
        });

        py.on('close', () => {
          pySocket = null;
          if (!closed) socket.send(JSON.stringify({ type: 'info', message: 'Backend reconnecting...' }));
        });

        py.on('error', () => {
          pySocket = null;
        });
      } catch {
        socket.send(JSON.stringify({ type: 'error', message: 'Backend unavailable' }));
      }
    };

    socket.on('message', (raw: string) => {
      if (pySocket && pySocket.readyState === 1) {
        pySocket.send(raw);
      }
    });

    socket.on('close', () => {
      closed = true;
      if (pySocket) { pySocket.close(); pySocket = null; }
    });

    socket.on('error', () => {
      closed = true;
      if (pySocket) { pySocket.close(); pySocket = null; }
    });

    connectToPython();
  });

  // ── Transcribe ──────────────────────────────────────────────────────
  server.post<{ Body: { audio: string; language?: string; duration?: number } }>(
    '/api/transcribe',
    async (request, reply) => {
      const { audio, language = 'en-PH' } = request.body;
      if (!audio) {
        return reply.status(400).send({ error: 'Missing audio data' });
      }

      try {
        const audioBytes = Buffer.from(audio.split(',')[1] || '', 'base64').length;
        if (audioBytes < 100) {
          return reply.status(400).send({ error: 'Invalid or empty audio data' });
        }
        const HF_TOKEN = process.env.HF_TOKEN;
        if (!HF_TOKEN) {
          return reply.status(501).send({ error: 'Speech transcription requires Hugging Face API token (HF_TOKEN)' });
        }
        const blob = Buffer.from(audio.split(',')[1] || '', 'base64');
        const res = await fetch('https://api-inference.huggingface.co/models/openai/whisper-tiny.en', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${HF_TOKEN}` },
          body: blob,
          signal: AbortSignal.timeout(30000),
        });
        if (!res.ok) {
          return reply.status(502).send({ error: 'Transcription service unavailable', detail: `${res.status}` });
        }
        const result = await res.json() as { text?: string };
        return reply.send({
          text: result.text || '',
          confidence: 0.9,
          language,
          duration: request.body.duration || 0,
        });
      } catch (error) {
        server.log.error(error);
        return reply.status(500).send({ error: 'Transcription failed' });
      }
    },
  );

  server.log.info('AI v3 routes: status, analyze, chat, predict, live-price, screener, tickertape, reputation, cache, transcribe');
}
