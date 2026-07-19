/**
 * Chat API endpoint for the AI research assistant (src/pages/AIChatPage.tsx).
 * Previously this endpoint did not exist at all — every chat message hit a
 * 404 and silently fell back to "I'm unable to process your request right
 * now." Reuses the same Groq key/model already configured for api/groq.ts.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

const SYSTEM_PROMPT = `You are StockEX AI, an equity research analyst assistant covering both the Philippine Stock Exchange (PSE) and Indian (NSE/BSE) markets.

Your expertise includes:
- Fundamental analysis (P/E, ROE, debt ratios, growth rates)
- Technical analysis (support/resistance, chart patterns, momentum indicators)
- Portfolio analysis and diversification strategies
- Risk assessment
- Sector and macro trends affecting equities in these markets

Rules:
- Do not invent specific financial figures you weren't given — speak in general, qualitative terms when you lack live data for a specific company.
- Do not give personal financial advice or use Buy/Hold/Sell language; frame things as research context.
- Cite the reasoning behind any claim briefly.
- Keep responses concise but comprehensive, using plain language.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, symbol, context } = req.body || {};

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required' });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
  }

  const userContent = [
    symbol ? `Stock symbol in context: ${symbol}` : null,
    context ? `Additional context: ${context}` : null,
    `Question: ${message}`,
  ].filter(Boolean).join('\n');

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        max_tokens: 1200,
        temperature: 0.6,
        top_p: 0.9,
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Chat API] Groq error', response.status, errorText);
      if (response.status === 429) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again in a moment.' });
      }
      return res.status(502).json({ error: 'Upstream chat model error' });
    }

    const data = await response.json() as any;
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(502).json({ error: 'Invalid response from chat model' });
    }

    return res.status(200).json({
      response: content,
      citations: symbol ? [String(symbol), 'Market Research'] : ['Market Research'],
      model: data.model,
    });
  } catch (error) {
    console.error('[Chat API] Request error', error);
    return res.status(500).json({ error: 'Failed to generate response' });
  }
}
