import { createClient } from 'redis';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

export class FreeLLMService {
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

  async askBot(symbol: string, question: string): Promise<string> {
    const cacheKey = `chat:${symbol}:${question.slice(0, 50)}`;
    const cached = await redis.get(cacheKey);
    if (cached) return cached;

    const text = await this.groqChat(
      `You are a stock analyst. Analyze ${symbol} based on available data. Do not give price targets or buy/sell advice.`,
      question
    );

    await redis.setEx(cacheKey, 3600, text);
    return text;
  }

  async explainScore(symbol: string, score: number): Promise<string> {
    const cacheKey = `score:${symbol}:${score}`;
    const cached = await redis.get(cacheKey);
    if (cached) return cached;

    const text = await this.groqChat(
      'You are a stock analyst.',
      `Why did ${symbol} score ${score}/100? Explain briefly in 2-3 sentences.`
    );

    await redis.setEx(cacheKey, 3600, text);
    return text;
  }

  async health(): Promise<boolean> {
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
