import { sglangService } from './SGLangService';
import type { StockAnalysis } from './types';

export interface ThesisInput {
  peRatio?: number | null;
  roe?: number | null;
  revenueGrowth?: number | null;
}

export class LLMGateway {
  async askBot(
    symbol: string,
    question: string
  ): Promise<{ answer: string; confidence: number }> {
    const result = await sglangService.generateStructured(
      `You are a stock research assistant analyzing ${symbol}. The user asks: ${question}. Provide a helpful, factual response based on available data.`,
      {
        type: 'object',
        properties: {
          answer: { type: 'string' },
          confidence: { type: 'number' },
        },
        required: ['answer', 'confidence'],
      },
      300
    );

    return {
      answer: result.answer,
      confidence: result.confidence ?? 0.7,
    };
  }

  async analyzeStock(
    symbol: string,
    fundamentals: {
      roe?: number | null;
      roic?: number | null;
      peRatio?: number | null;
      pbRatio?: number | null;
      revenueGrowth?: number | null;
      debtEquity?: number | null;
    }
  ): Promise<StockAnalysis> {
    return sglangService.analyzeStockParallel(symbol, fundamentals);
  }

  async generateThesis(
    symbol: string,
    fundamentals: ThesisInput
  ): Promise<string> {
    return sglangService.generateThesis(symbol, fundamentals);
  }

  async health(): Promise<boolean> {
    return sglangService.health();
  }
}

export const llmGateway = new LLMGateway();
