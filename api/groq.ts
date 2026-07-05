/**
 * Groq API Endpoint for Tier 3 Complex LLM Queries
 * Routes complex stock market analysis questions to Groq's free tier
 * Model: Llama 3 70B Versatile
 * Rate limit: 30 requests/min (free tier)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
  }

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
          {
            role: 'system',
            content: `You are an expert stock market analyst specializing in Indian stocks and the BSE.
Provide clear, actionable, and data-driven insights for stock market questions.

Your expertise includes:
- Fundamental analysis (P/E, ROE, debt ratios, growth rates)
- Technical analysis (support/resistance, chart patterns, momentum indicators)
- Portfolio analysis and diversification strategies
- Risk assessment and portfolio optimization
- Earnings analysis and forecasting
- Market trends and macroeconomic factors affecting stocks

Always:
1. Cite relevant metrics and data points
2. Explain your reasoning clearly
3. Mention risks and uncertainties
4. Provide specific recommendations when appropriate
5. Use simple language for complex concepts

Keep responses concise but comprehensive.`,
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1500,
        temperature: 0.7,
        top_p: 0.9,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Groq API Error]', response.status, error);

      // Handle rate limiting gracefully
      if (response.status === 429) {
        return res.status(429).json({
          error: 'Rate limit exceeded. Please try again in a moment.',
          retry_after: response.headers.get('retry-after') || 60,
        });
      }

      // Handle authentication errors
      if (response.status === 401) {
        return res.status(401).json({
          error: 'Invalid or expired GROQ_API_KEY',
        });
      }

      return res.status(response.status).json({
        error: `Groq API error: ${response.statusText}`,
      });
    }

    const data = await response.json();

    // Validate response structure
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return res.status(500).json({
        error: 'Invalid response from Groq API',
      });
    }

    return res.status(200).json({
      response: data.choices[0].message.content,
      model: data.model,
      usage: {
        prompt_tokens: data.usage?.prompt_tokens || 0,
        completion_tokens: data.usage?.completion_tokens || 0,
        total_tokens: data.usage?.total_tokens || 0,
      },
    });

  } catch (error) {
    console.error('[Groq Request Error]', error);

    if (error instanceof Error) {
      // Network error
      if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        return res.status(503).json({
          error: 'Unable to reach Groq API. Please try again.',
        });
      }

      return res.status(500).json({
        error: `Server error: ${error.message}`,
      });
    }

    return res.status(500).json({
      error: 'Unknown error occurred',
    });
  }
}
