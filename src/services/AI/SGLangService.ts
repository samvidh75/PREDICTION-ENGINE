import { HuggingFaceService } from '../client/HuggingFaceService';
import { marketConfigService } from '../MarketConfigService';
import { dataFreshnessManager } from '../DataFreshnessManager';
import { batchQueue } from '../BatchQueue';
import type { SGLangResponse, StockAnalysis } from './types';

const OLLAMA_URL = process.env.SGLANG_INTELLIGENCE_URL || process.env.SGLANG_URL || process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';

function extractJson(text: string | undefined | null): Record<string, any> | null {
  if (!text) return null;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch { /* not valid JSON */ }
  }
  return null;
}

function sentimentScore(text: string, isRisk: boolean = false): number {
  if (!text) return 50;
  const lower = text.toLowerCase();
  const positive = ['strong', 'excellent', 'good', 'positive', 'growth', 'stable', 'profitable',
    'low', 'improving', 'best', 'great', 'outperform', 'attractive', 'growing', 'efficient',
    'high quality', 'robust', 'superior', 'impressive', 'favorable', 'healthy', 'solid'];
  const negative = ['weak', 'poor', 'negative', 'decline', 'high', 'risky', 'concern', 'bad',
    'falling', 'deteriorating', 'volatile', 'risk', 'warning', 'caution', 'debt', 'struggling',
    'underperform', 'challenging', 'unfavorable', 'overvalued', 'expensive'];

  let score = 50;
  for (const word of positive) {
    if (lower.includes(word)) score += isRisk ? -5 : 8;
  }
  for (const word of negative) {
    if (lower.includes(word)) score += isRisk ? 5 : -8;
  }
  return Math.max(0, Math.min(100, score));
}

export class SGLangService {
  useExternal = process.env.SGLANG_URL !== undefined;

  async generateStructured(
    prompt: string,
    jsonSchema: Record<string, any>,
    maxTokens: number = 500
  ): Promise<Record<string, any>> {
    if (this.useExternal || process.env.OLLAMA_URL) {
      const { default: axios } = await import('axios');
      const response = await axios.post(
        `${OLLAMA_URL}/api/generate`,
        {
          model: OLLAMA_MODEL,
          prompt,
          options: { num_predict: maxTokens, temperature: 0.3 },
          stream: false,
        },
        { timeout: 30000 }
      );
      const text = response.data.response;
      const parsed = extractJson(text);
      if (parsed) return parsed;
      try { return JSON.parse(text); } catch { return { text, analysis: text }; }
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
   * Market-hours aware stock analysis with scoring
   * Returns text analysis + numeric scores for all dimensions
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
    const marketStatus = await marketConfigService.getMarketStatus();

    if (!marketStatus.isOpen) {
      const text = `Snapshot analysis (market closed). Previous close data for ${symbol} shows stable fundamentals.`;
      return {
        quality: text,
        valuation: text,
        growth: `Growth metrics based on most recent quarterly data for ${symbol}.`,
        risk: `Risk assessment based on latest available financials for ${symbol}.`,
        scores: { quality: 50, valuation: 50, growth: 50, risk: 50, overall: 50 },
      };
    }

    return batchQueue.enqueue(`sglang:analyze:${symbol}`, async () => {
      const schema = {
        type: 'object' as const,
        properties: { analysis: { type: 'string' as const } },
        required: ['analysis'],
      };

      const [quality, valuation, growth, risk] = await Promise.all([
        this.generateStructured(
          `Analyze business quality of ${symbol}. ROE=${fundamentals.roe ?? 'N/A'}%, ROIC=${fundamentals.roic ?? 'N/A'}%. Assess competitive advantage, management quality, and financial strength.`,
          schema, 200
        ),
        this.generateStructured(
          `Analyze valuation of ${symbol}. PE=${fundamentals.peRatio ?? 'N/A'}x, PB=${fundamentals.pbRatio ?? 'N/A'}x. Assess if the stock is fairly valued, overvalued, or undervalued.`,
          schema, 200
        ),
        this.generateStructured(
          `Analyze growth prospects of ${symbol}. Revenue Growth=${fundamentals.revenueGrowth ?? 'N/A'}%. Assess revenue trends, earnings growth, and future outlook.`,
          schema, 200
        ),
        this.generateStructured(
          `Analyze risk factors for ${symbol}. Debt/Equity=${fundamentals.debtEquity ?? 'N/A'}x. Assess financial risk, business risk, and any red flags.`,
          schema, 200
        ),
      ]);

      const qText = quality?.analysis || quality?.text || `Quality analysis for ${symbol}`;
      const vText = valuation?.analysis || valuation?.text || `Valuation analysis for ${symbol}`;
      const gText = growth?.analysis || growth?.text || `Growth analysis for ${symbol}`;
      const rText = risk?.analysis || risk?.text || `Risk analysis for ${symbol}`;

      const scores = {
        quality: sentimentScore(qText),
        valuation: sentimentScore(vText),
        growth: sentimentScore(gText),
        risk: sentimentScore(rText, true),
        overall: 0,
      };
      scores.overall = Math.round((scores.quality + scores.valuation + scores.growth + (100 - scores.risk)) / 4);

      return { quality: qText, valuation: vText, growth: gText, risk: rText, scores };
    });
  }

  async generateRiskFactors(symbol: string): Promise<string[]> {
    try {
      const result = await this.generateStructured(
        `List 3-5 specific risk factors for investing in ${symbol}. Be specific and data-driven. Format as JSON array of strings.`,
        { type: 'object', properties: { risks: { type: 'array', items: { type: 'string' } } }, required: ['risks'] },
        300
      );
      return result?.risks || [`Consider consulting latest financial reports for ${symbol} risk assessment.`];
    } catch {
      return [`Risk data temporarily unavailable for ${symbol}.`];
    }
  }

  async generateBullBearCase(symbol: string, fundamentals: {
    peRatio?: number | null; roe?: number | null; revenueGrowth?: number | null;
  }): Promise<{ bull: string; bear: string }> {
    try {
      const result = await this.generateStructured(
        `Provide a bull case and bear case for investing in ${symbol}. PE=${fundamentals.peRatio ?? 'N/A'}x, ROE=${fundamentals.roe ?? 'N/A'}%, Revenue Growth=${fundamentals.revenueGrowth ?? 'N/A'}%. Return JSON with "bull" and "bear" strings.`,
        { type: 'object', properties: { bull: { type: 'string' }, bear: { type: 'string' } }, required: ['bull', 'bear'] },
        300
      );
      return {
        bull: result?.bull || `${symbol} shows potential based on available data.`,
        bear: result?.bear || `Consider downside risks for ${symbol} before investing.`,
      };
    } catch {
      return {
        bull: `${symbol} investment case requires further fundamental analysis.`,
        bear: `Market conditions and company-specific risks should be evaluated.`,
      };
    }
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
        const response = await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 5000 });
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
