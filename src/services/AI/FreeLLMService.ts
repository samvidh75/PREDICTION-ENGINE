import { createClient } from 'redis';
import { HuggingFaceService } from '../client/HuggingFaceService';

let redisClient: ReturnType<typeof createClient> | null = null;
async function getRedis() {
  if (!redisClient) {
    redisClient = createClient({ url: process.env.REDIS_URL });
    await redisClient.connect();
  }
  return redisClient;
}

export class FreeLLMService {
  private async generate(system: string, user: string): Promise<string> {
    const prompt = `${system}\n\nUser: ${user}\n\nAssistant:`;
    return await HuggingFaceService.generateText(prompt, 200);
  }

  async askBot(symbol: string, question: string): Promise<string> {
    const redis = await getRedis();
    const cacheKey = `chat:${symbol}:${question.slice(0, 50)}`;
    const cached = await redis.get(cacheKey);
    if (cached) return cached;

    const text = await this.generate(
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

    const text = await this.generate(
      'You are a stock analyst.',
      `Why did ${symbol} score ${score}/100? Explain briefly in 2-3 sentences.`
    );

    await redis.setEx(cacheKey, 3600, text);
    return text;
  }

  async health(): Promise<boolean> {
    try {
      await HuggingFaceService.generateText('ping', 5);
      return true;
    } catch {
      return false;
    }
  }
}

export const freeLLMService = new FreeLLMService();
