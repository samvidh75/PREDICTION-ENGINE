/**
 * AI Chat Endpoint
 * Provides fallback responses when browser LLM not loaded
 * Routes: POST /api/ai/chat
 */

import type { FastifyRequest, FastifyReply } from 'fastify';

interface ChatRequest {
  message: string;
  context?: string;
}

interface ChatResponse {
  response: string;
  confidence: number;
  source: 'server' | 'browser';
}

const STOCK_KNOWLEDGE_BASE: Record<string, string> = {
  'pe ratio': `P/E Ratio = Price per share ÷ Earnings per share. Shows how much investors pay per rupee of earnings.
• Low P/E doesn't always mean undervalued
• Check alongside ROE, debt, and growth rates
• Indian mid-caps average 15-20x P/E
• Compare with sector peers and historical average`,

  'roe': `ROE = Net Profit ÷ Shareholder Equity. Measures profit generated per rupee of equity.
• Target >15% for quality compounders
• Banks: 12-15%, IT: 20-25%, Manufacturing: 8-12%
• Consistent ROE >15% indicates quality
• Compare against sector average`,

  'debt equity': `Debt/Equity ratio = Total Debt ÷ Total Equity. Shows financial leverage.
• Healthy: <0.5 for industrials, <0.3 for IT/services
• High leverage increases risk during downturns
• Always check debt trend vs revenue growth
• Watch for debt-fueled growth that's unsustainable`,

  'dividend': `Dividend strategy guide:
• Dividend Yield = Annual Dividend ÷ Stock Price
• Payout Ratio = Dividend ÷ Earnings (target <60%)
• Look for consistency - 5+ years of rising dividends
• High yields (>5%) may signal trouble
• Verify dividend sustainability from cash flow`,

  'growth': `Growth analysis for quality stocks:
• Revenue CAGR >15% indicates strong growth
• Verify quality: competitive moat, margin expansion, capital efficiency
• Watch for one-time revenues that don't repeat
• Check 3-5 year consistency, not just recent quarters
• Growth must be profitable and capital-efficient`,

  'valuation': `Valuation framework:
• Use multiple metrics: P/E, P/B, EV/EBITDA
• Compare against: sector peers, historical average, market
• Single metrics are misleading
• Combine with fundamentals and growth prospects
• Apply margin of safety >20% for downside protection`,
};

function getRelevantAnalysis(query: string): string | null {
  const lowerQuery = query.toLowerCase();

  for (const [key, value] of Object.entries(STOCK_KNOWLEDGE_BASE)) {
    if (lowerQuery.includes(key) || lowerQuery.includes(key.split(' ')[0])) {
      return value;
    }
  }

  return null;
}

export async function aiChatHandler(
  request: FastifyRequest<{ Body: ChatRequest }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const { message } = request.body;

    if (!message || !message.trim()) {
      reply.status(400).send({
        error: 'Message required',
      });
      return;
    }

    // Try to match against knowledge base
    const analysis = getRelevantAnalysis(message);

    if (analysis) {
      reply.send({
        response: analysis,
        confidence: 0.95,
        source: 'server',
      } as ChatResponse);
      return;
    }

    // Default helpful response
    reply.send({
      response: `Ask about: P/E ratio, ROE, Debt/Equity ratio, Dividend strategy, Growth metrics, or Valuation methods. I can help you analyze Indian stocks!`,
      confidence: 0.8,
      source: 'server',
    } as ChatResponse);
  } catch (error) {
    console.error('[AI Chat] Error:', error);
    reply.status(500).send({
      error: 'Failed to generate response',
    });
  }
}

export default aiChatHandler;
