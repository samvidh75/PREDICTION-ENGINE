import { sglangService } from './SGLangService';
import { routellmService } from './RouteLLMService';
import type { Fundamentals } from '@/types';

export class LLMGateway {
  async askBot(
    symbol: string,
    question: string,
    user: { isPro: boolean }
  ): Promise<{
    answer: string;
    confidence: number;
    routedTo: 'weak' | 'strong';
  }> {
    const result = await routellmService.routeQuery(question, user);
    const confidence = result.answer.toLowerCase().includes('confident') ? 0.9 : 0.7;
    return { answer: result.answer, confidence, routedTo: result.routedTo };
  }

  async analyzeStockParallel(
    symbol: string,
    fundamentals: Fundamentals,
    _isPro: boolean
  ): Promise<{
    quality: string;
    valuation: string;
    growth: string;
    risk: string;
  }> {
    return sglangService.analyzeStockParallel(symbol, fundamentals);
  }

  async generateThesis(
    symbol: string,
    fundamentals: Fundamentals,
    isPro: boolean
  ): Promise<string> {
    return routellmService.generateThesis(symbol, fundamentals, isPro);
  }

  async health(): Promise<{
    sglang: boolean;
    routellm: boolean;
  }> {
    return {
      sglang: await sglangService.health(),
      routellm: await routellmService.health(),
    };
  }
}

export const llmGateway = new LLMGateway();
