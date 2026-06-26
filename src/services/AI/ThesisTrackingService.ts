import { sglangService } from './SGLangService';
import { query } from '../../db/index';

export interface ThesisSnapshot {
  symbol: string;
  thesis: string;
  score: number;
  generatedAt: string;
}

export class ThesisTrackingService {
  async detectChange(
    symbol: string,
    currentScore: number,
    previousScore: number,
    previousThesis: string
  ): Promise<{
    changed: boolean;
    summary: string;
    direction: 'improving' | 'declining' | 'stable';
  }> {
    const scoreDiff = currentScore - previousScore;

    if (Math.abs(scoreDiff) < 5) {
      return {
        changed: false,
        summary: 'No material change detected.',
        direction: 'stable',
      };
    }

    const direction = scoreDiff > 0 ? 'improving' : 'declining';

    const prompt = [
      `Thesis for ${symbol} was: "${previousThesis}"`,
      `Score changed from ${previousScore} to ${currentScore} (${scoreDiff > 0 ? '+' : ''}${scoreDiff} points).`,
      `Direction: ${direction}.`,
      `Generate a one-sentence alert summarizing what changed.`,
    ].join(' ');

    const result = await sglangService.generateStructured(prompt, {
      type: 'object',
      properties: { summary: { type: 'string' } },
      required: ['summary'],
    }, 200);

    return {
      changed: true,
      summary: result.summary as string,
      direction,
    };
  }

  async saveSnapshot(symbol: string, thesis: string, score: number): Promise<void> {
    await query(
      `INSERT INTO thesis_cache (symbol, thesis, score, generated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (symbol) DO UPDATE SET thesis = $2, score = $3, generated_at = now()`,
      [symbol, thesis, score]
    );
  }

  async getSnapshot(symbol: string): Promise<ThesisSnapshot | null> {
    const res = await query(
      `SELECT symbol, thesis, score, generated_at FROM thesis_cache WHERE symbol = $1`,
      [symbol]
    );
    if (!res.rows[0]) return null;
    return {
      symbol: res.rows[0].symbol,
      thesis: res.rows[0].thesis,
      score: res.rows[0].score,
      generatedAt: res.rows[0].generated_at,
    };
  }
}

export const thesisTrackingService = new ThesisTrackingService();
