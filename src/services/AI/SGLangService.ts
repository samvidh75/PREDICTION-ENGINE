import axios from 'axios';
import { llmResponsesQueries } from '@/db/queries/llm-responses';

const SGLANG_API = process.env.SGLANG_URL || 'http://localhost:30000';

export class SGLangService {
  async generateStructured(
    prompt: string,
    jsonSchema: Record<string, any>,
    maxTokens: number = 500
  ): Promise<Record<string, any>> {
    const startTime = Date.now();
    try {
      const response = await axios.post(`${SGLANG_API}/generate`, {
        text: prompt,
        sampling_params: { max_new_tokens: maxTokens, temperature: 0.3 },
        json_schema: jsonSchema,
      });
      const parsed = JSON.parse(response.data.text);
      const latencyMs = Date.now() - startTime;
      const tokens = response.data.usage?.completion_tokens || maxTokens;

      await llmResponsesQueries.logCall({
        service: 'sglang',
        method: 'generateStructured',
        inputTokens: prompt.length / 4,
        outputTokens: tokens,
        latencyMs,
        costEstimate: tokens * 0.0000001,
        routedTo: 'weak',
        success: true,
      });

      return parsed;
    } catch (e) {
      await llmResponsesQueries.logCall({
        service: 'sglang',
        method: 'generateStructured',
        inputTokens: prompt.length / 4,
        outputTokens: 0,
        latencyMs: Date.now() - startTime,
        costEstimate: 0,
        routedTo: 'weak',
        success: false,
        errorMessage: String(e),
      });
      throw e;
    }
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
    fundamentals: { roe?: number | null; roic?: number | null; peRatio?: number | null; pbRatio?: number | null; revenueGrowth?: number | null; debtEquity?: number | null }
  ): Promise<{ quality: string; valuation: string; growth: string; risk: string }> {
    const [quality, valuation, growth, risk] = await Promise.all([
      this.generateStructured(
        `Analyze quality of ${symbol}: ROE=${fundamentals.roe}%, ROIC=${fundamentals.roic}%`,
        { type: 'object', properties: { analysis: { type: 'string' } } },
        200
      ),
      this.generateStructured(
        `Analyze valuation of ${symbol}: PE=${fundamentals.peRatio}x, PB=${fundamentals.pbRatio}x`,
        { type: 'object', properties: { analysis: { type: 'string' } } },
        200
      ),
      this.generateStructured(
        `Analyze growth of ${symbol}: Revenue Growth=${fundamentals.revenueGrowth}%`,
        { type: 'object', properties: { analysis: { type: 'string' } } },
        200
      ),
      this.generateStructured(
        `Analyze risk of ${symbol}: Debt/Equity=${fundamentals.debtEquity}x`,
        { type: 'object', properties: { analysis: { type: 'string' } } },
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

  async health(): Promise<boolean> {
    try {
      const response = await axios.get(`${SGLANG_API}/health`, { timeout: 5000 });
      return response.status === 200;
    } catch { return false; }
  }
}

export const sglangService = new SGLangService();
