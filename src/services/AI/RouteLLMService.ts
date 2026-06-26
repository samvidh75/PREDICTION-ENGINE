import OpenAI from 'openai';
import { llmResponsesQueries } from '@/db/queries/llm-responses';

const ROUTELLM_API = process.env.ROUTELLM_URL || 'http://localhost:8000';

export interface RoutingResult {
  answer: string;
  routedTo: 'weak' | 'strong';
  costEstimate: number;
  tokensUsed: number;
}

export class RouteLLMService {
  private client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: ROUTELLM_API,
  });

  async routeQuery(
    userMessage: string,
    user: { isPro: boolean }
  ): Promise<RoutingResult> {
    const costThreshold = user.isPro ? 0.20 : 0.05;
    const model = `router-mf-${costThreshold.toFixed(5)}`;
    const startTime = Date.now();

    try {
      const response = await this.client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: userMessage }],
        max_tokens: 500,
        temperature: 0.7,
      });

      const latencyMs = Date.now() - startTime;
      const answer = response.choices[0]?.message?.content || '';
      const inputTokens = response.usage?.prompt_tokens || 0;
      const outputTokens = response.usage?.completion_tokens || 0;
      const routedTo: 'weak' | 'strong' = latencyMs < 500 ? 'weak' : 'strong';
      const costEstimate = routedTo === 'weak'
        ? (inputTokens + outputTokens) * 0.0000001
        : (inputTokens * 0.000005 + outputTokens * 0.00002);

      await llmResponsesQueries.logCall({
        service: 'routellm',
        method: 'routeQuery',
        inputTokens,
        outputTokens,
        latencyMs,
        costEstimate,
        routedTo,
        success: true,
      });

      return { answer, routedTo, costEstimate, tokensUsed: inputTokens + outputTokens };
    } catch (e) {
      const latencyMs = Date.now() - startTime;
      await llmResponsesQueries.logCall({
        service: 'routellm',
        method: 'routeQuery',
        inputTokens: 0,
        outputTokens: 0,
        latencyMs,
        costEstimate: 0,
        routedTo: 'weak',
        success: false,
        errorMessage: String(e),
      });
      throw e;
    }
  }

  async generateThesis(
    symbol: string,
    fundamentals: { peRatio?: number | null; roe?: number | null; revenueGrowth?: number | null },
    isPro: boolean
  ): Promise<string> {
    const cacheKey = `thesis:${symbol}`;
    const cached = await llmResponsesQueries.getThesis(symbol);
    if (cached) return cached;

    const result = await this.routeQuery(
      `In 1 sentence, what is the investment thesis for ${symbol} based on: PE=${fundamentals.peRatio}x, ROE=${fundamentals.roe}%, Revenue Growth=${fundamentals.revenueGrowth}%?`,
      { isPro }
    );

    await llmResponsesQueries.cacheThesis(symbol, result.answer, 0);
    return result.answer;
  }

  async getMetrics(period: '1h' | '24h' | '7d'): Promise<any> {
    return llmResponsesQueries.getMetrics(period);
  }

  async health(): Promise<boolean> {
    try {
      const response = await this.client.models.list();
      return !!response;
    } catch { return false; }
  }
}

export const routellmService = new RouteLLMService();
