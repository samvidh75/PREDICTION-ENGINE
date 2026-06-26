import { sglangService } from './SGLangService';
import { query } from '../../db/index';

const SESSION_TTL_HOURS = 24;

let idCounter = 0;
function generateId(): string {
  idCounter += 1;
  return `${Date.now()}-${idCounter}`;
}

export class ResearchBotService {
  async chat(
    symbol: string,
    question: string,
    sessionId?: string
  ): Promise<{ answer: string; sessionId: string }> {
    const sid = sessionId || generateId();
    const context = await this.loadContext(sid);

    const messages = [
      ...(context?.messages || []),
      { role: 'user', content: `About ${symbol}: ${question}` },
    ];

    const prompt = [
      `You are StockStory's research assistant analyzing ${symbol}.`,
      `Conversation context:\n${messages.slice(-6).map((m: any) => `${m.role}: ${m.content}`).join('\n')}`,
      `Respond helpfully based on available financial data. Do not give price targets or buy/sell advice.`,
    ].join('\n');

    const result = await sglangService.generateStructured(prompt, {
      type: 'object',
      properties: { answer: { type: 'string' } },
      required: ['answer'],
    }, 400);

    messages.push({ role: 'assistant', content: result.answer });

    await this.saveContext(sid, symbol, messages);

    return { answer: result.answer, sessionId: sid };
  }

  private async loadContext(sessionId: string): Promise<{ messages: Array<{ role: string; content: string }> } | null> {
    const res = await query(
      `SELECT context FROM multi_turn_sessions WHERE session_id = $1 AND expires_at > now()`,
      [sessionId]
    );
    return res.rows[0]?.context || null;
  }

  private async saveContext(sessionId: string, symbol: string, messages: Array<{ role: string; content: string }>) {
    const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);
    await query(
      `INSERT INTO multi_turn_sessions (session_id, symbol, context, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (session_id) DO UPDATE SET context = $3, last_message_at = now(), expires_at = $4`,
      [sessionId, symbol, JSON.stringify({ messages }), expiresAt]
    );
  }
}

export const researchBotService = new ResearchBotService();
