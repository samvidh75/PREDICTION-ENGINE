import { sglangService } from './SGLangService';

export interface ScoreExplanationInput {
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

export class ScoreExplanationService {
  async generateScoreExplanation(input: ScoreExplanationInput): Promise<{
    summary: string;
    strengths: string[];
    weaknesses: string[];
  }> {
    const prompt = [
      `Explain the StockStory score of ${input.companyName} (${input.symbol}).`,
      `Factor scores (0-100): quality=${input.quality}, valuation=${input.valuation},`,
      `growth=${input.growth}, stability=${input.stability}, momentum=${input.momentum}, risk=${input.risk}.`,
      `Overall score: ${input.score}/100.`,
      `Identify the top 2 strengths and top 2 weaknesses driving this score.`,
    ].join(' ');

    const result = await sglangService.generateStructured(prompt, {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        strengths: { type: 'array', items: { type: 'string' } },
        weaknesses: { type: 'array', items: { type: 'string' } },
      },
      required: ['summary', 'strengths', 'weaknesses'],
    }, 300);

    return {
      summary: result.summary as string || '',
      strengths: Array.isArray(result.strengths) ? result.strengths as string[] : [],
      weaknesses: Array.isArray(result.weaknesses) ? result.weaknesses as string[] : [],
    };
  }
}

export const scoreExplanationService = new ScoreExplanationService();
