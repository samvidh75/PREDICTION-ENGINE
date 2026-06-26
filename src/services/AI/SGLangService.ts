import axios from 'axios';
import type { SGLangResponse, StockAnalysis } from './types';

const SGLANG_API = process.env.SGLANG_URL || 'http://localhost:30000';

export class SGLangService {
  async generateStructured(
    prompt: string,
    jsonSchema: Record<string, any>,
    maxTokens: number = 500
  ): Promise<Record<string, any>> {
    const startTime = Date.now();
    const response = await axios.post(
      `${SGLANG_API}/generate`,
      {
        text: prompt,
        sampling_params: { max_new_tokens: maxTokens, temperature: 0.3 },
        json_schema: jsonSchema,
      },
      { timeout: 30000 }
    );

    const text = response.data.text;
    const tokens = response.data.usage?.completion_tokens || maxTokens;
    const latencyMs = Date.now() - startTime;

    return JSON.parse(text);
  }

  async parallelGenerate(
    prompts: string[],
    jsonSchema: Record<string, any>,
    maxTokens: number = 300
  ): Promise<Record<string, any>[]> {
    const results = await Promise.all(
      prompts.map(p =>
        this.generateStructured(p, jsonSchema, maxTokens).catch(() => null)
      )
    );
    return results.filter((r): r is Record<string, any> => r !== null);
  }

  async analyzeStockParallel(
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
    const schema = {
      type: 'object' as const,
      properties: { analysis: { type: 'string' as const } },
      required: ['analysis'],
    };

    const [quality, valuation, growth, risk] = await Promise.all([
      this.generateStructured(
        `Analyze quality of ${symbol}: ROE=${fundamentals.roe ?? 'N/A'}%, ROIC=${fundamentals.roic ?? 'N/A'}%`,
        schema,
        200
      ),
      this.generateStructured(
        `Analyze valuation of ${symbol}: PE=${fundamentals.peRatio ?? 'N/A'}x, PB=${fundamentals.pbRatio ?? 'N/A'}x`,
        schema,
        200
      ),
      this.generateStructured(
        `Analyze growth of ${symbol}: Revenue Growth=${fundamentals.revenueGrowth ?? 'N/A'}%`,
        schema,
        200
      ),
      this.generateStructured(
        `Analyze risk of ${symbol}: Debt/Equity=${fundamentals.debtEquity ?? 'N/A'}x`,
        schema,
        200
      ),
    ]);

    return {
      quality: quality.analysis,
      valuation: valuation.analysis,
      growth: growth.analysis,
      risk: risk.analysis,
    };
  }

  async generateThesis(
    symbol: string,
    fundamentals: {
      peRatio?: number | null;
      roe?: number | null;
      revenueGrowth?: number | null;
    }
  ): Promise<string> {
    const prompt = [
      `Generate a one-sentence investment thesis for ${symbol}.`,
      `Financial context: PE=${fundamentals.peRatio ?? 'N/A'}x,`,
      `ROE=${fundamentals.roe ?? 'N/A'}%,`,
      `Revenue Growth=${fundamentals.revenueGrowth ?? 'N/A'}%.`,
      `Be specific about what makes this company attractive or concerning.`,
    ].join(' ');

    const result = await this.generateStructured(prompt, {
      type: 'object',
      properties: { thesis: { type: 'string' } },
      required: ['thesis'],
    }, 200);

    return result.thesis;
  }

  async health(): Promise<boolean> {
    try {
      const response = await axios.get(`${SGLANG_API}/health`, { timeout: 5000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

export const sglangService = new SGLangService();
