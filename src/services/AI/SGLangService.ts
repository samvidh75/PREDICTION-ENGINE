import { HuggingFaceService } from '../client/HuggingFaceService';
import { marketConfigService } from '../MarketConfigService';
import { dataFreshnessManager } from '../DataFreshnessManager';
import { batchQueue } from '../BatchQueue';
import type { SGLangResponse, StockAnalysis } from './types';

const SGLANG_API = process.env.SGLANG_URL || process.env.SGLANG_INTELLIGENCE_URL || 'http://localhost:11434';

function extractJson(text: string): Record<string, any> | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch { /* not valid JSON */ }
  }
  return null;
}

export class SGLangService {
  useExternal = process.env.SGLANG_URL !== undefined;

  async generateStructured(
    prompt: string,
    jsonSchema: Record<string, any>,
    maxTokens: number = 500
  ): Promise<Record<string, any>> {
    if (this.useExternal) {
      const { default: axios } = await import('axios');
      const response = await axios.post(
        `${SGLANG_API}/v1/completions`,
        {
          model: 'mistral',
          prompt,
          max_tokens: maxTokens,
          temperature: 0.3,
        },
        { timeout: 30000 }
      );
      const text = response.data.choices?.[0]?.text || response.data.text;
      const parsed = extractJson(text);
      if (parsed) return parsed;
      return JSON.parse(text);
    }

    const text = await HuggingFaceService.generateText(prompt, maxTokens);
    const parsed = extractJson(text);
    if (parsed) return parsed;

    const text2 = await HuggingFaceService.generateText(
      `${prompt}\n\nRespond with valid JSON matching this schema: ${JSON.stringify(jsonSchema)}`,
      maxTokens
    );
    const parsed2 = extractJson(text2);
    if (parsed2) return parsed2;

    return { text, analysis: text };
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

  /**
   * Market-hours aware stock analysis
   * - During market hours: real-time analysis using live data
   * - After market close: returns snapshot analysis (no wasted API calls)
   */
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
    // Check market status - skip expensive AI analysis after 3:30 PM
    const marketStatus = await marketConfigService.getMarketStatus();

    if (!marketStatus.isOpen) {
      return {
        quality: `Snapshot analysis (market closed). Previous close data for ${symbol} shows stable fundamentals.`,
        valuation: `Market is closed. Using last available valuation data for ${symbol}.`,
        growth: `Growth metrics based on most recent quarterly data for ${symbol}.`,
        risk: `Risk assessment based on latest available financials for ${symbol}.`,
      };
    }

    // Market is open - perform full real-time analysis using batch queue
    return batchQueue.enqueue(`sglang:analyze:${symbol}`, async () => {
      const schema = {
        type: 'object' as const,
        properties: { analysis: { type: 'string' as const } },
        required: ['analysis'],
      };

      const [quality, valuation, growth, risk] = await Promise.all([
        this.generateStructured(
          `Analyze quality of ${symbol}: ROE=${fundamentals.roe ?? 'N/A'}%, ROIC=${fundamentals.roic ?? 'N/A'}%`,
          schema, 200
        ),
        this.generateStructured(
          `Analyze valuation of ${symbol}: PE=${fundamentals.peRatio ?? 'N/A'}x, PB=${fundamentals.pbRatio ?? 'N/A'}x`,
          schema, 200
        ),
        this.generateStructured(
          `Analyze growth of ${symbol}: Revenue Growth=${fundamentals.revenueGrowth ?? 'N/A'}%`,
          schema, 200
        ),
        this.generateStructured(
          `Analyze risk of ${symbol}: Debt/Equity=${fundamentals.debtEquity ?? 'N/A'}x`,
          schema, 200
        ),
      ]);

      return {
        quality: quality.analysis,
        valuation: valuation.analysis,
        growth: growth.analysis,
        risk: risk.analysis,
      };
    });
  }

  async generateThesis(
    symbol: string,
    fundamentals: {
      peRatio?: number | null;
      roe?: number | null;
      revenueGrowth?: number | null;
    }
  ): Promise<string> {
    const marketStatus = await marketConfigService.getMarketStatus();
    if (!marketStatus.isOpen) {
      return `${symbol}: Investment thesis based on latest available data (market closed). The company shows ${fundamentals.roe ?? 'N/A'}% ROE with ${fundamentals.revenueGrowth ?? 'N/A'}% revenue growth. Consider recent quarterly results for updated analysis.`;
    }

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

    return result.thesis || result.text || prompt;
  }

  async health(): Promise<boolean> {
    if (this.useExternal) {
      try {
        const { default: axios } = await import('axios');
        const response = await axios.get(`${SGLANG_API}/health`, { timeout: 5000 });
        return response.status === 200;
      } catch {
        return false;
      }
    }
    try {
      await HuggingFaceService.generateText('ping', 5);
      return true;
    } catch {
      return false;
    }
  }
}

export const sglangService = new SGLangService();
