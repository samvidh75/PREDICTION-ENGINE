import { TransformersService } from './TransformersService';

export class HuggingFaceService {
  static async generateText(prompt: string, maxTokens: number = 150): Promise<string> {
    try {
      return await TransformersService.generateText(prompt, maxTokens);
    } catch (error) {
      console.error('[HuggingFace] Generation failed:', error);
      throw error;
    }
  }

  static async analyzeStock(symbol: string, context: string): Promise<string> {
    const prompt = `You are a stock analyst. Analyze ${symbol} based on the following context:\n\n${context}\n\nProvide a brief analysis including: technical indicators, fundamental metrics, and market sentiment. Do not give price targets or buy/sell advice.`;
    return await this.generateText(prompt, 200);
  }

  static async answerStockQuestion(question: string, context: string): Promise<string> {
    return await TransformersService.answerQuestion(question, context);
  }

  static async classifyStockIntent(query: string): Promise<string> {
    return await TransformersService.classifyIntent(query);
  }

  static async embedText(text: string): Promise<number[]> {
    return await TransformersService.embedQuery(text);
  }
}

export const huggingFaceService = new HuggingFaceService();
