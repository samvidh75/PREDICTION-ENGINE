import { createClient } from 'redis';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://ollama:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:1b';
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

let redisClient: ReturnType<typeof createClient> | null = null;
async function getRedis() {
  if (!redisClient) {
    redisClient = createClient({ url: process.env.REDIS_URL });
    await redisClient.connect();
  }
  return redisClient;
}

export class FreeLLMService {
  private async ollamaChat(system: string, user: string): Promise<string> {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ollama error: ${response.status} ${text}`);
    }

    const data = await response.json() as any;
    return data.message?.content || '';
  }

  private async groqChat(system: string, user: string): Promise<string> {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Groq API error: ${response.status} ${text}`);
    }

    const data = await response.json() as any;
    return data.choices?.[0]?.message?.content || '';
  }

  private async chat(system: string, user: string): Promise<string> {
    try {
      return await this.ollamaChat(system, user);
    } catch (err) {
      if (GROQ_API_KEY) {
        return await this.groqChat(system, user);
      }
      throw err;
    }
  }

  async askBot(symbol: string, question: string): Promise<string> {
    const redis = await getRedis();
    const cacheKey = `chat:${symbol}:${question.slice(0, 50)}`;
    const cached = await redis.get(cacheKey);
    if (cached) return cached;

    const text = await this.chat(
      `You are a stock analyst. Analyze ${symbol} based on available data. Do not give price targets or buy/sell advice.`,
      question
    );

    await redis.setEx(cacheKey, 3600, text);
    return text;
  }

  async explainScore(symbol: string, score: number): Promise<string> {
    const redis = await getRedis();
    const cacheKey = `score:${symbol}:${score}`;
    const cached = await redis.get(cacheKey);
    if (cached) return cached;

    const text = await this.chat(
      'You are a stock analyst.',
      `Why did ${symbol} score ${score}/100? Explain briefly in 2-3 sentences.`
    );

    await redis.setEx(cacheKey, 3600, text);
    return text;
  }

  async health(): Promise<boolean> {
    try {
      const response = await fetch(`${OLLAMA_URL}/api/tags`, { method: 'GET' });
      if (response.ok) return true;
    } catch { /* fall through */ }

    if (!GROQ_API_KEY) return false;
    try {
      const response = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const freeLLMService = new FreeLLMService();
