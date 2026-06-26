import { sglangService } from './SGLangService';

export interface ComparisonStockInput {
  symbol: string;
  companyName: string;
  score: number;
  quality: number;
  valuation: number;
  growth: number;
  stability: number;
  momentum: number;
  risk: number;
}

export interface StockComparisonResult {
  rankings: Array<{ symbol: string; rank: number; summary: string }>;
  recommendation: string;
  keyDifferences: string[];
}

export class StockComparisonService {
  async compare(
    stocks: ComparisonStockInput[]
  ): Promise<StockComparisonResult> {
    if (stocks.length < 2) {
      return {
        rankings: stocks.map((s, i) => ({ symbol: s.symbol, rank: i + 1, summary: 'Only one stock provided' })),
        recommendation: 'Add at least one more stock to compare.',
        keyDifferences: [],
      };
    }

    const stockDetails = stocks.map(s =>
      `${s.symbol} (${s.companyName}): score=${s.score}, quality=${s.quality}, valuation=${s.valuation}, growth=${s.growth}, stability=${s.stability}, momentum=${s.momentum}, risk=${s.risk}`
    ).join('\n');

    const prompt = [
      `Compare these ${stocks.length} stocks:\n${stockDetails}`,
      `Rank them from best to worst based on overall quality, valuation, growth, stability, and momentum.`,
      `Explain the key differences driving the ranking.`,
    ].join('\n');

    const result = await sglangService.generateStructured(prompt, {
      type: 'object',
      properties: {
        rankings: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              symbol: { type: 'string' },
              rank: { type: 'number' },
              summary: { type: 'string' },
            },
          },
        },
        recommendation: { type: 'string' },
        keyDifferences: { type: 'array', items: { type: 'string' } },
      },
      required: ['rankings', 'recommendation', 'keyDifferences'],
    }, 500);

    return {
      rankings: result.rankings || stocks.map((_, i) => ({ symbol: '', rank: i + 1, summary: '' })),
      recommendation: result.recommendation || '',
      keyDifferences: result.keyDifferences || [],
    };
  }
}

export const stockComparisonService = new StockComparisonService();
