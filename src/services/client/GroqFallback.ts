export class GroqFallbackService {
  private apiKey: string;

  constructor() {
    const meta = import.meta as any;
    this.apiKey = meta.env?.VITE_GROQ_API_KEY || '';
  }

  async fallbackToGroq(query: string): Promise<string> {
    if (!this.apiKey) {
      console.warn('Groq API key not set, using default response');
      return 'Unable to process. Please refine your query.';
    }

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mixtral-8x7b-32768',
          messages: [
            {
              role: 'system',
              content: 'You are a financial analyst. Answer stock queries concisely.',
            },
            { role: 'user', content: query },
          ],
          max_tokens: 200,
          temperature: 0.3,
        }),
      });

      const data = await response.json();
      return data.choices[0]?.message?.content || 'Unable to process query';
    } catch (error) {
      console.error('Groq fallback failed:', error);
      return 'Service unavailable. Try rephrasing your query.';
    }
  }
}

export const groqFallback = new GroqFallbackService();
