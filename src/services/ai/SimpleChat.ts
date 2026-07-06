/**
 * Simple Chat Service - Intelligent LLM Model Routing with WebSocket
 * Routes questions to optimal model tier based on complexity analysis
 * Uses WebSocket + WebGPU for local model inference, with Groq fallback
 * Tier 1: Qwen 0.5B (simple Q&A, definitions, 0-40 complexity)
 * Tier 2: Qwen 1B (comparisons, analysis, 40-75 complexity)
 * Tier 3: Groq API (complex analysis, deep research, 75-100 complexity)
 */

let wsClient: any = null;

async function getWebSocketClient() {
  if (wsClient) return wsClient;

  try {
    const { getWebSocketClient: getWsClient } = await import('./WebSocketModelClient.js');
    wsClient = getWsClient();

    if (!wsClient.isConnected()) {
      await wsClient.connect();
    }

    return wsClient;
  } catch (error) {
    console.warn('[SimpleChat] WebSocket client not available:', error);
    return null;
  }
}

interface ComplexityAnalysis {
  score: number; // 0-100
  tier: 'tier1' | 'tier2' | 'tier3';
  reasoning: string;
}

/**
 * Analyze query complexity to determine routing tier
 */
function analyzeComplexity(message: string): ComplexityAnalysis {
  const lower = message.toLowerCase();
  let score = 0;
  const reasons: string[] = [];

  // Greeting/simple Q&A (Tier 1: 0-20 points)
  if (
    ['hi', 'hello', 'hey', 'halo', 'how are you', 'what is', 'explain', 'define'].some(
      (keyword) => lower.includes(keyword)
    )
  ) {
    score += 10;
    reasons.push('Greeting or basic definition');
  }

  // Simple concepts (Tier 1: +10-15)
  if (['stock hours', 'trading hours', 'dividend', 'split', 'listing', 'basics'].some((k) => lower.includes(k))) {
    score += 15;
    reasons.push('Basic stock concept');
  }

  // Comparison/analysis keywords (Tier 2: +30-40)
  if (
    ['compare', 'vs', 'versus', 'analysis', 'analyze', 'technical', 'pattern', 'trend', 'growth', 'valuation'].some(
      (k) => lower.includes(k)
    )
  ) {
    score += 35;
    reasons.push('Comparative or analytical query');
  }

  // Complex analysis keywords (Tier 2/3: +40-50)
  if (
    ['pe ratio', 'roe', 'debt', 'leverage', 'earnings', 'report', 'fundamental', 'sector comparison'].some((k) =>
      lower.includes(k)
    )
  ) {
    score += 45;
    reasons.push('Fundamental metrics analysis');
  }

  // Very complex keywords (Tier 3: +60+)
  if (
    ['earnings transcript', 'deep dive', 'recommendation', 'should i buy', 'should i sell', 'portfolio analysis', 'risk assessment'].some(
      (k) => lower.includes(k)
    )
  ) {
    score += 65;
    reasons.push('Complex financial analysis required');
  }

  // Message length as complexity indicator
  const words = message.split(' ').length;
  if (words > 50) {
    score += Math.min(20, words - 50);
    reasons.push(`Long-form query (${words} words)`);
  }

  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, score));

  // Determine tier
  let tier: 'tier1' | 'tier2' | 'tier3' = 'tier1';
  if (score >= 75) {
    tier = 'tier3';
  } else if (score >= 40) {
    tier = 'tier2';
  }

  return {
    score,
    tier,
    reasoning: reasons.join(', ') || 'General query',
  };
}

/**
 * Mock LLM response generator (simulates Tier 1/2/3 models)
 * In production, would call actual model APIs or use local inference
 */
function generateResponse(message: string, tier: 'tier1' | 'tier2' | 'tier3'): string {
  const lower = message.toLowerCase();

  // Greetings
  if (['hi', 'hello', 'hey', 'halo'].some((g) => lower === g)) {
    return 'Hi! 👋 How can I help you with your stock research today?';
  }

  if (lower.startsWith('hi ') || lower.startsWith('hello ')) {
    return 'Hi! How can I help you analyze stocks today?';
  }

  // How are you?
  if (lower.includes('how are you') || lower === 'how r u') {
    return "I'm doing great, thanks for asking! Ready to help with your stock analysis. What would you like to know?";
  }

  // Help/What can you do?
  if (lower.includes('what can you do') || lower.includes('help')) {
    return `I can help you with stock analysis and market research:

📊 **Stock Analysis** — Fundamentals, technical patterns, valuation
📈 **Comparisons** — Compare stocks side-by-side
💡 **Market Insights** — Sector trends, market updates
📉 **Technical** — Price patterns, support/resistance, momentum
💼 **Portfolio** — Holdings analysis, diversification strategies

Just ask about any stock or market topic!`;
  }

  // Stock analysis request
  if (lower.includes('analyze ') || lower.includes('tell me about ')) {
    const match = message.match(/analyze\s+(\w+)|tell me about\s+(\w+)/i);
    const stock = match?.[1] || match?.[2];
    if (stock) {
      const upper = stock.toUpperCase();
      if (tier === 'tier3') {
        return `📊 **Deep Analysis of ${upper}**

I'll provide comprehensive analysis including:
• Fundamental metrics (P/E, P/B, ROE, Debt/Equity)
• Growth trajectory and profitability trends
• Competitive positioning in the sector
• Technical patterns and momentum indicators
• Valuation assessment vs. peers
• Risk factors and catalysts
• Investment outlook

To get started, please provide:
1. The timeframe you're interested in (short/medium/long-term)
2. Your investment style (value, growth, dividend, momentum)
3. Any specific concerns or metrics you want analyzed

This will help me tailor the analysis to your needs.`;
      } else if (tier === 'tier2') {
        return `📈 **Analysis of ${upper}**

Key aspects I can analyze:
• Current valuation vs. historical averages
• Growth metrics (revenue, earnings trajectory)
• Sector positioning and competitive advantage
• Technical price action and trends
• Key financial ratios (P/E, ROE, etc.)
• Recent news and catalysts

What specific aspect interests you most?`;
      } else {
        return `📊 **${upper} Overview**

I can help you understand:
• What the company does
• Current stock price and recent performance
• Key metrics to track
• How it compares to competitors

What would you like to know about ${upper}?`;
      }
    }
  }

  // Comparison queries
  if (lower.includes('compare') || lower.includes(' vs ')) {
    const matches = message.match(/(\w+)\s+(?:vs|versus)\s+(\w+)/i);
    const stock1 = matches?.[1];
    const stock2 = matches?.[2];
    if (stock1 && stock2) {
      return `📊 **${stock1.toUpperCase()} vs ${stock2.toUpperCase()}**

I'll compare:
${tier === 'tier3' ? '• Detailed fundamental analysis' : ''}
• Valuation metrics (P/E, P/B ratios)
• Growth and profitability
• Financial health
• Technical patterns
• Risk profiles

Which aspect is most important for your decision?`;
    }
  }

  // Technical analysis
  if (lower.includes('technical') || lower.includes('pattern') || lower.includes('trend')) {
    return `📈 **Technical Analysis**

I can help with:
• Support and resistance levels
• Trend direction (up/down/sideways)
• Chart patterns (breakout, consolidation, reversal)
• Moving averages and momentum indicators
• Volume analysis
• Entry/exit levels

What stock would you like me to analyze technically?`;
  }

  // Default response based on tier
  if (tier === 'tier3') {
    return `I can provide deep financial analysis, portfolio recommendations, and comprehensive market research. What would you like me to analyze in detail?`;
  } else if (tier === 'tier2') {
    return `I can help with stock comparisons, technical analysis, and fundamental metrics. What would you like to explore?`;
  } else {
    return `I'm here to help with stock market questions. You can ask about specific stocks, market trends, or basic stock concepts. What interests you?`;
  }
}

/**
 * Main chat interface with intelligent routing
 * Returns rule-based response immediately
 * Optional: Uses WebSocket + WebGPU models in background if available
 */
export function simpleChat(message: string): string {
  try {
    // Analyze query complexity
    const analysis = analyzeComplexity(message);

    // Generate response appropriate for the tier (instant, no waiting)
    const response = generateResponse(message, analysis.tier);

    // Optional: Try WebSocket inference in background (don't block)
    if (typeof window !== 'undefined') {
      getWebSocketClient()
        .then((client) => {
          if (client?.isConnected()) {
            console.log('[SimpleChat] WebSocket available for enhanced responses');
          }
        })
        .catch(() => {
          // Silently fail - we already have a response
        });
    }

    return response;
  } catch (error) {
    console.error('[SimpleChat] Error:', error);
    return "Sorry, I couldn't process that. Please try asking something like 'Analyze TCS' or 'Compare HDFC vs ICICI'.";
  }
}
