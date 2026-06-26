import { sglangService } from './SGLangService';
import { query } from '../../db/index';

export interface ScannerThesisInput {
  symbol: string;
  companyName: string;
  score: number;
  quality: number;
  valuation: number;
  growth: number;
  momentum: number;
}

export class ScannerThesisService {
  async generateThesis(input: ScannerThesisInput): Promise<string> {
    const prompt = [
      `Generate a one-line investment thesis for ${input.companyName} (${input.symbol}).`,
      `Score: ${input.score}/100, quality=${input.quality}, valuation=${input.valuation},`,
      `growth=${input.growth}, momentum=${input.momentum}.`,
      `One sentence only. Focus on the key driver.`,
    ].join(' ');

    const result = await sglangService.generateStructured(prompt, {
      type: 'object',
      properties: { thesis: { type: 'string' } },
      required: ['thesis'],
    }, 150);

    return result.thesis as string;
  }

  async batchGenerate(
    stocks: ScannerThesisInput[]
  ): Promise<Array<{ symbol: string; thesis: string }>> {
    const results = await Promise.allSettled(
      stocks.map(s => this.generateThesis(s))
    );

    return stocks.map((s, i) => ({
      symbol: s.symbol,
      thesis: results[i].status === 'fulfilled' ? (results[i] as PromiseFulfilledResult<string>).value : '',
    }));
  }

  async cacheThesis(symbol: string, thesis: string): Promise<void> {
    await query(
      `INSERT INTO thesis_cache (symbol, thesis, generated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (symbol) DO UPDATE SET thesis = $2, generated_at = now()`,
      [symbol, thesis]
    );
  }

  async getCachedThesis(symbol: string): Promise<string | null> {
    const res = await query(
      `SELECT thesis FROM thesis_cache WHERE symbol = $1`,
      [symbol]
    );
    return res.rows[0]?.thesis ?? null;
  }
}

export const scannerThesisService = new ScannerThesisService();
