import { Ollama } from 'ollama';
import { createClient } from 'redis';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1';

const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

export class FreeLLMService {
  private client: Ollama;

  constructor() {
    this.client = new Ollama({ host: OLLAMA_URL });
  }

  async askBot(symbol: string, question: string): Promise<string> {
    const cacheKey = `chat:${symbol}:${question.slice(0, 50)}`;
    const cached = await redis.get(cacheKey);
    if (cached) return cached;

    const response = await this.client.chat({
      model: OLLAMA_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a stock analyst. Analyze ${symbol} based on available data. Do not give price targets or buy/sell advice.`,
        },
        { role: 'user', content: question },
      ],
    });

    const text = response.message.content;
    await redis.setEx(cacheKey, 3600, text);
    return text;
  }

  async explainScore(symbol: string, score: number): Promise<string> {
    const cacheKey = `score:${symbol}:${score}`;
    const cached = await redis.get(cacheKey);
    if (cached) return cached;

    const response = await this.client.chat({
      model: OLLAMA_MODEL,
      messages: [
        {
          role: 'user',
          content: `Why did ${symbol} score ${score}/100? Explain briefly in 2-3 sentences.`,
        },
      ],
    });

    const text = response.message.content;
    await redis.setEx(cacheKey, 3600, text);
    return text;
  }

  async health(): Promise<boolean> {
    try {
      await this.client.list();
      return true;
    } catch {
      return false;
    }
  }
}

export const freeLLMService = new FreeLLMService();
