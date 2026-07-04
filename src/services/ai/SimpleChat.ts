/**
 * Simple Chat Service - Basic conversational AI
 * Handles greetings and simple queries without complex analysis
 */

export async function simpleChat(message: string): Promise<string> {
  const lower = message.toLowerCase().trim();

  // Greetings
  if (['hi', 'hello', 'hey', 'halo'].some(g => lower === g)) {
    return 'Hi! How can I help you with your stock research today?';
  }

  if (lower.startsWith('hi ') || lower.startsWith('hello ')) {
    return 'Hi! How can I help you with your stock research?';
  }

  // How are you?
  if (lower.includes('how are you') || lower === 'how r u') {
    return "I'm doing well, thanks for asking! Ready to help you with stock analysis. What's on your mind?";
  }

  // Help/assistance
  if (['help', 'what can you do', 'what can you help with'].some(q => lower.includes(q))) {
    return `I can help you with:
• Stock analysis and fundamentals
• Price charts and trends
• Market updates
• Stock comparisons
• Watchlist tracking
• Technical analysis

Just ask about any stock or market topic!`;
  }

  // Stock analysis - simple
  if (lower.includes('analyze ') || lower.includes('tell me about ')) {
    const match = message.match(/analyze\s+(\w+)|tell me about\s+(\w+)/i);
    const stock = match?.[1] || match?.[2];
    if (stock) {
      return `I can analyze ${stock.toUpperCase()} for you. Let me fetch real data and provide:
• Current price
• Key metrics (PE, PB, ROE)
• 52-week range
• Fundamentals

Would you like a detailed analysis?`;
    }
  }

  // Default helpful response
  return `Sure! You can ask me about:
• Specific stocks (e.g., "Analyze INFY")
• Market trends
• Stock comparisons
• Technical signals

What would you like to know?`;
}
