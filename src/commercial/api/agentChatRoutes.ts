import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { exec } from 'child_process';
import util from 'util';
import { CloudflareAiProvider } from '../../services/llm/CloudflareAiProvider';

const execPromise = util.promisify(exec);

const DETERMINISTIC_FALLBACKS: Record<string, string[]> = {
  BULLISH_MOMENTUM: [
    'trading above both its 50-day and 200-day SMAs with strong RSI momentum',
    'price action confirms a sustained uptrend with broad market participation',
  ],
  BEARISH_MOMENTUM: [
    'trading below key moving averages with weakening RSI momentum',
    'price structure suggests continued downside pressure in the near term',
  ],
  BULLISH_CONVERGENCE: [
    'holding above its 200-day SMA floor while RSI indicators stabilise',
    'long-term support base remains intact for potential recovery',
  ],
  BEARISH_CONVERGENCE: [
    'trading below its 200-day SMA with RSI in bearish territory',
    'structural resistance caps upside until momentum shifts',
  ],
  NEUTRAL_RECOVERY: [
    'showing early recovery signals with 50-day SMA converging towards 200-day',
    'price consolidation within a defined range warrants close monitoring',
  ],
  CAUTIOUS_CROSSOVER: [
    'death cross pattern forming as shorter-term averages lag',
    'risk management remains paramount until trend re-establishes',
  ],
  NEUTRAL_STABLE: [
    'range-bound price action with balanced risk-reward setup',
    'waiting for a catalyst-driven breakout above resistance levels',
  ],
};

function buildDeterministicResponse(symbol: string, sector: string, metrics: Record<string, number | string>): string {
  const price = Number(metrics.current_price).toFixed(3);
  const rsi = Number(metrics.rsi_14).toFixed(3);
  const pe = Number(metrics.pe_ratio).toFixed(3);
  const de = Number(metrics.debt_to_equity).toFixed(3);
  const sma50 = Number(metrics.sma_50).toFixed(3);
  const sma200 = Number(metrics.sma_200).toFixed(3);
  const trend = String(metrics.trend_state || 'NEUTRAL_STABLE');
  const lines = DETERMINISTIC_FALLBACKS[trend] || DETERMINISTIC_FALLBACKS.NEUTRAL_STABLE;
  const line = lines[Math.floor(Math.random() * lines.length)];
  return `${symbol} (${sector}) is currently at INR ${price} and ${line}. Key metrics show RSI-14 at ${rsi}, P/E at ${pe}x, D/E at ${de}x, with SMA-50 at INR ${sma50} and SMA-200 at INR ${sma200}.`;
}

function buildSystemContextPrompt(symbol: string, metrics: Record<string, number | string>): string {
  return (
    `You are the official fine-tuned StockEX Market Encyclopedia. You must answer user queries using exactly two sentences. ` +
    `Ground your response entirely on these exact 3rd-decimal mathematical variables computed by the local library:\n\n` +
    `[AUTHORITATIVE REAL-TIME DATA MATRIX]\n` +
    `- Asset Code: ${symbol}\n` +
    `- Exchange Board Sector: ${metrics.sector}\n` +
    `- Live Price Close: INR ${Number(metrics.current_price).toFixed(3)}\n` +
    `- 50-Day SMA Support: INR ${Number(metrics.sma_50).toFixed(3)}\n` +
    `- 200-Day SMA Floor: INR ${Number(metrics.sma_200).toFixed(3)}\n` +
    `- Relative Strength Index (RSI-14): ${Number(metrics.rsi_14).toFixed(3)}\n` +
    `- Price-to-Earnings (P/E) Ratio: ${Number(metrics.pe_ratio).toFixed(3)}x\n` +
    `- Debt-to-Equity Leverage: ${Number(metrics.debt_to_equity).toFixed(3)}\n` +
    `- Promoter Pledged Footprint: ${Number(metrics.promoter_pledged_pct).toFixed(3)}%\n` +
    `- Momentum Trajectory Flag: ${metrics.trend_state}\n`
  );
}

async function callOllama(systemPrompt: string, userPrompt: string): Promise<string | null> {
  const ollamaEndpoint = process.env.OLLAMA_HOST_URL || 'http://127.0.0.1:11434/api/generate';
  try {
    const response = await fetch(ollamaEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'stockstory-slm',
        prompt: `${systemPrompt}\nUser Query: ${userPrompt}`,
        stream: false,
        options: { temperature: 0.1 },
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 200) {
      const payload = (await response.json()) as any;
      const text = (payload.response || '').trim();
      if (text) return text;
    }
  } catch {
    // Ollama unavailable — cascade to next tier
  }
  return null;
}

async function callCloudflare(systemPrompt: string, userPrompt: string): Promise<string | null> {
  try {
    return await CloudflareAiProvider.generateResponseFallback(systemPrompt, userPrompt);
  } catch {
    return null;
  }
}

export async function agentChatRoutes(fastify: FastifyInstance) {
  fastify.post('/api/v1/chat/agent-interpreter', async (req: FastifyRequest, reply: FastifyReply) => {
    const { ticker, prompt } = req.body as { ticker: string; prompt: string };
    const symbol = ticker.toUpperCase().replace('.NS', '').replace('.BO', '').trim();

    try {
      console.log(`Invoking precision calculation kernel for: ${symbol}`);
      const { stdout } = await execPromise(`python3 scripts/python/slm_math_runtime.py --ticker ${symbol}`);
      const mathContext = JSON.parse(stdout);

      if (!mathContext.success) {
        throw new Error(mathContext.error || 'Python calculation kernel timeout.');
      }

      const metrics = mathContext.metrics as Record<string, number | string>;
      const systemPrompt = buildSystemContextPrompt(symbol, metrics);

      let responseText: string | null = null;
      responseText = await callOllama(systemPrompt, prompt);
      if (!responseText) {
        console.warn('Ollama unavailable. Cascading to Cloudflare Workers AI...');
        responseText = await callCloudflare(systemPrompt, prompt);
      }
      if (!responseText) {
        console.warn('Cloudflare edge unavailable. Using deterministic narrative engine...');
        responseText = buildDeterministicResponse(symbol, String(metrics.sector), metrics);
      }

      return reply.status(200).send({ success: true, response: responseText });
    } catch (err: any) {
      console.error('Agent calculation execution failure:', err.message);
      return reply.status(200).send({
        success: true,
        response: `[Factor Engine Fallback] ${symbol} technical indicators indicate a stable trend continuation channel. Valuation and moving averages support layers remain within standard tracking limits.`,
      });
    }
  });
}
