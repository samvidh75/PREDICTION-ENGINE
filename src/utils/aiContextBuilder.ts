/**
 * Builds enhanced AI context with:
 * - Conversation history (multi-turn memory)
 * - Live market data (real-time ticker info)
 * - Company fundamentals
 * - PSE compliance checks
 */

import type { ChatMessage } from './chatHistoryStorage';

export interface AIContext {
  systemPrompt: string;
  userPrompt: string;
  conversationHistory: ChatMessage[];
  marketData: MarketContext;
  complianceWarning?: string;
  isFlaggedQuery: boolean;
}

export interface MarketContext {
  ticker: string;
  currentPrice?: number;
  change?: number;
  changePercent?: number;
  pe?: number;
  roe?: number;
  debtToEquity?: number;
  marketCap?: number;
  lastUpdate?: number;
}

const FLAGGED_KEYWORDS = [
  'should i buy',
  'should i sell',
  'will it go up',
  'will it go down',
  'guaranteed',
  'sure profit',
  'cannot lose',
  'recommend',
  'invest in',
];

const SEC_DISCLAIMER =
  '⚠️ SEC COMPLIANCE: This is educational content only, not investment advice. Always consult a PSE-listed advisor before making investment decisions.';

export function buildAIContext(
  userQuery: string,
  ticker: string,
  conversationHistory: ChatMessage[] = [],
  marketData: MarketContext = { ticker },
): AIContext {
  const isFlaggedQuery = isFlaggedFinancialAdvice(userQuery);
  const complianceWarning = isFlaggedQuery ? SEC_DISCLAIMER : undefined;

  const marketContextStr = formatMarketContext(marketData);
  const conversationContextStr = formatConversationContext(conversationHistory);

  const systemPrompt = buildSystemPrompt(ticker, marketContextStr, conversationContextStr);

  return {
    systemPrompt,
    userPrompt: userQuery,
    conversationHistory,
    marketData,
    complianceWarning,
    isFlaggedQuery,
  };
}

function isFlaggedFinancialAdvice(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  return FLAGGED_KEYWORDS.some((keyword) => lowerQuery.includes(keyword));
}

function formatMarketContext(data: MarketContext): string {
  let context = `Company: ${data.ticker}`;

  if (data.currentPrice) {
    context += `\nCurrent Price: ₹${data.currentPrice.toFixed(2)}`;
  }
  if (data.change !== undefined && data.changePercent !== undefined) {
    const direction = data.change >= 0 ? '↑' : '↓';
    context += `\n${direction} Change: ₹${Math.abs(data.change).toFixed(2)} (${Math.abs(data.changePercent).toFixed(2)}%)`;
  }
  if (data.pe) {
    context += `\nP/E Ratio: ${data.pe.toFixed(2)}`;
  }
  if (data.roe) {
    context += `\nROE: ${(data.roe * 100).toFixed(2)}%`;
  }
  if (data.debtToEquity) {
    context += `\nDebt-to-Equity: ${data.debtToEquity.toFixed(2)}`;
  }
  if (data.marketCap) {
    context += `\nMarket Cap: ₹${(data.marketCap / 10000000000).toFixed(2)}Cr`;
  }
  if (data.lastUpdate) {
    context += `\nLast Updated: ${new Date(data.lastUpdate).toLocaleTimeString()}`;
  }

  return context;
}

function formatConversationContext(history: ChatMessage[]): string {
  if (history.length === 0) {
    return '';
  }

  const recentMessages = history.slice(-6); // Last 6 messages for context
  let contextStr = '\n\nConversation Context:\n';

  recentMessages.forEach((msg) => {
    const role = msg.role === 'user' ? 'User' : 'Assistant';
    contextStr += `${role}: ${msg.content.substring(0, 150)}...\n`;
  });

  return contextStr;
}

function buildSystemPrompt(_ticker: string, marketContext: string, conversationContext: string): string {
  return `You are StockEX Encyclopedia, an expert financial analyst for Philippine equities.

ROLE:
- Provide accurate, educational financial analysis
- Explain metrics (P/E, ROE, Debt, Market Cap)
- Contextualize industry trends and company performance
- NEVER provide personalized investment recommendations
- ALWAYS include SEC disclaimers for financial questions

CURRENT CONTEXT:
${marketContext}
${conversationContext}

INSTRUCTIONS:
1. When asked about metrics: Explain them with real examples
2. When asked "should I buy/sell": Redirect to fundamental analysis and SEC disclaimer
3. When asked about price predictions: Explain you cannot predict, offer analysis framework instead
4. Use real data from context above when available
5. For any investment decision: End with "Consult a PSE-listed advisor"

OUTPUT FORMAT:
- Clear, concise responses
- Cite the data you're using
- Add [SEC DISCLAIMER] tag if financial advice question detected`;
}

export function enhanceUserQuery(query: string, marketData: MarketContext): string {
  if (marketData.currentPrice) {
    return `${query}\n\n[CONTEXT: Currently trading at ₹${marketData.currentPrice}]`;
  }
  return query;
}
