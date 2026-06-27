import axios from 'axios';
import type { AIProvider, StockData, StockAnalysis, Thesis, Recommendation, StockComparison, ThesisValidity } from './AIProvider';
import { DeterministicResearchProvider } from './DeterministicResearchProvider';

function pick(provider: string, groqKey?: string, geminiKey?: string, openaiKey?: string): string | null {
  if (provider === 'groq' && groqKey) return 'groq';
  if (provider === 'gemini' && geminiKey) return 'gemini';
  if (provider === 'openai' && openaiKey) return 'openai';
  if (groqKey) return 'groq';
  if (geminiKey) return 'gemini';
  if (openaiKey) return 'openai';
  return null;
}

export class ExternalLLMProvider implements AIProvider {
  private fallback: DeterministicResearchProvider;
  private activeProvider: string | null = null;
  private groqKey: string;
  private geminiKey: string;
  private openaiKey: string;

  constructor() {
    this.fallback = new DeterministicResearchProvider();
    this.groqKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || '';
    this.geminiKey = process.env.GEMINI_API_KEY || '';
    this.openaiKey = process.env.OPENAI_API_KEY || '';
    const preferred = process.env.AI_PROVIDER || '';
    this.activeProvider = pick(preferred, this.groqKey, this.geminiKey, this.openaiKey);
    if (this.activeProvider) {
      console.log(`[AI] ExternalLLMProvider active: ${this.activeProvider}`);
    } else {
      console.log('[AI] No external LLM API key configured, using deterministic fallback');
    }
  }

  private async callLLM(systemPrompt: string, userPrompt: string, format: 'json' | 'text'): Promise<string> {
    if (this.activeProvider === 'groq') {
      return this.callGroq(systemPrompt, userPrompt, format);
    }
    if (this.activeProvider === 'gemini') {
      return this.callGemini(systemPrompt, userPrompt, format);
    }
    if (this.activeProvider === 'openai') {
      return this.callOpenAI(systemPrompt, userPrompt, format);
    }
    throw new Error('No LLM provider configured');
  }

  private async callGroq(systemPrompt: string, userPrompt: string, format: 'json' | 'text'): Promise<string> {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: process.env.AI_MODEL || 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: format === 'json' ? 0.1 : 0.5,
        response_format: format === 'json' ? { type: 'json_object' } : undefined,
      },
      { headers: { Authorization: `Bearer ${this.groqKey}`, 'Content-Type': 'application/json' }, timeout: 30000 },
    );
    return response.data.choices?.[0]?.message?.content || '';
  }

  private async callGemini(systemPrompt: string, userPrompt: string, _format: 'json' | 'text'): Promise<string> {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${process.env.AI_MODEL || 'gemini-2.0-flash'}:generateContent?key=${this.geminiKey}`,
      { contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }] },
      { headers: { 'Content-Type': 'application/json' }, timeout: 30000 },
    );
    return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  private async callOpenAI(systemPrompt: string, userPrompt: string, format: 'json' | 'text'): Promise<string> {
    const response = await axios.post(
      process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1/chat/completions',
      {
        model: process.env.AI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: format === 'json' ? 0.1 : 0.5,
        response_format: format === 'json' ? { type: 'json_object' } : undefined,
      },
      { headers: { Authorization: `Bearer ${this.openaiKey}`, 'Content-Type': 'application/json' }, timeout: 30000 },
    );
    return response.data?.choices?.[0]?.message?.content || '';
  }

  private async generate(system: string, prompt: string, format: 'json' | 'text'): Promise<string> {
    if (!this.activeProvider) throw new Error('No LLM provider');
    try {
      return await this.callLLM(system, prompt, format);
    } catch (err) {
      console.warn(`[AI] ExternalLLM call failed (${this.activeProvider}), falling back:`, (err as Error).message);
      throw err;
    }
  }

  private async jsonFromLLM<T>(system: string, prompt: string): Promise<T> {
    const text = await this.generate(system, prompt, 'json');
    return JSON.parse(text) as T;
  }

  private async tryJson<T>(system: string, prompt: string, fallback: () => Promise<T>): Promise<T> {
    if (!this.activeProvider) return fallback();
    try {
      return await this.jsonFromLLM<T>(system, prompt);
    } catch {
      console.warn('[AI] ExternalLLM failed, using deterministic fallback');
      return fallback();
    }
  }

  private factorAnalysisPrompt(data: StockData, depth: string): string {
    return `You are a financial analyst. Analyze ${data.symbol} (${data.name}) in ${data.sector}/${data.industry}.
P/E:${data.pe} P/B:${data.pb} ROE:${data.roe}% Debt/Equity:${data.debtToEquity} CurrentRatio:${data.currentRatio}
RevenueGrowth:${data.revenueGrowth}% ProfitMargin:${data.profitMargin}% RSI:${data.rsi}
Return JSON: { "quality": { "score":0-100, "reasoning":"", "factors":[] }, "valuation": {...}, "growth": {...}, "technicals": {...}, "risk": {...} }
${depth === 'detailed' ? 'Be comprehensive.' : 'Be concise.'}`;
  }

  async analyzeStock(stockData: StockData, depth?: 'quick' | 'detailed'): Promise<StockAnalysis> {
    return this.tryJson(
      'You are a stock analyst. Return only JSON.',
      this.factorAnalysisPrompt(stockData, depth || 'quick'),
      () => this.fallback.analyzeStock(stockData, depth),
    );
  }

  async generateThesis(stockData: StockData, analysis: StockAnalysis): Promise<Thesis> {
    return this.tryJson(
      'You are an investment strategist. Return only JSON.',
      `Generate thesis for ${stockData.symbol}. Quality:${analysis.quality.score} Valuation:${analysis.valuation.score} Growth:${analysis.growth.score} Risk:${analysis.risk.score}
Return JSON: { "bullCase":"", "bearCase":"", "investmentHorizon":"", "keyRisks":[], "catalysts":[] }`,
      () => this.fallback.generateThesis(stockData, analysis),
    );
  }

  async generateRecommendation(stockData: StockData, analysis: StockAnalysis, thesis: Thesis): Promise<Recommendation> {
    return this.tryJson(
      'You are a portfolio manager. Return only JSON.',
      `Recommendation for ${stockData.symbol}. Bull:${thesis.bullCase} Bear:${thesis.bearCase}
Return JSON: { "action":"BUY|HOLD|SELL", "rating":0-100, "conviction":0-100, "timeframe":"", "riskReward":"favorable|neutral|unfavorable" }`,
      () => this.fallback.generateRecommendation(stockData, analysis, thesis),
    );
  }

  async compareStocks(stocks: StockData[]): Promise<StockComparison> {
    return this.tryJson(
      'You are an equity analyst. Return only JSON.',
      `Compare: ${stocks.map(s => `${s.symbol} P/E:${s.pe} ROE:${s.roe}% Growth:${s.revenueGrowth}%`).join('; ')}
Return JSON: { "ranking":[{"symbol":"","score":0,"reasoning":""}], "winner":"", "summary":"" }`,
      () => this.fallback.compareStocks(stocks),
    );
  }

  async chat(symbol: string, question: string, context: string): Promise<string> {
    if (!this.activeProvider) return this.fallback.chat(symbol, question, context);
    try {
      return await this.generate('You are a helpful financial analyst.', `Stock:${symbol}\nContext:${context}\nQuestion:${question}`, 'text');
    } catch {
      return this.fallback.chat(symbol, question, context);
    }
  }

  async checkThesisValidity(symbol: string, originalThesis: Thesis, currentAnalysis: StockAnalysis): Promise<ThesisValidity> {
    return this.tryJson(
      'You are an investment reviewer. Return only JSON.',
      `Thesis for ${symbol}: Bull:${originalThesis.bullCase} Bear:${originalThesis.bearCase} Risks:${originalThesis.keyRisks?.join(',')}
Current: Quality:${currentAnalysis.quality.score} Valuation:${currentAnalysis.valuation.score} Growth:${currentAnalysis.growth.score} Technicals:${currentAnalysis.technicals.score} Risk:${currentAnalysis.risk.score}
Return JSON: { "stillValid":true/false, "changes":{ "bullCaseStatus":"", "newRisks":[], "mitigatedRisks":[], "recommendation":"continue|reconsider|exit", "updateRequired":true/false } }`,
      () => this.fallback.checkThesisValidity(symbol, originalThesis, currentAnalysis),
    );
  }

  async generateMarketCommentary(topStocks: StockData[], marketTrend: string): Promise<string> {
    if (!this.activeProvider) return this.fallback.generateMarketCommentary(topStocks, marketTrend);
    try {
      return await this.generate('You are a market commentator.', `Market:${marketTrend}\nTop stocks:${topStocks.map(s => `${s.symbol} ${s.price} (${s.changePercent}%)`).join(', ')}`, 'text');
    } catch {
      return this.fallback.generateMarketCommentary(topStocks, marketTrend);
    }
  }

  async generateBullBearCase(stockData: StockData, analysis: StockAnalysis): Promise<{ bullCase: string; bearCase: string }> {
    return this.tryJson(
      'You are a research analyst. Return only JSON.',
      `Bull/bear for ${stockData.symbol}. Quality:${analysis.quality.score} Growth:${analysis.growth.score} Risk:${analysis.risk.score}
Return JSON: { "bullCase":"", "bearCase":"" }`,
      () => this.fallback.generateBullBearCase(stockData, analysis),
    );
  }

  async generateRiskTriggers(stockData: StockData, analysis: StockAnalysis): Promise<string[]> {
    if (!this.activeProvider) return this.fallback.generateRiskTriggers(stockData, analysis);
    try {
      const text = await this.generate('List risks as JSON array.', `Risk triggers for ${stockData.symbol}. Quality:${analysis.quality.score} Risk:${analysis.risk.score} Debt/Equity:${stockData.debtToEquity}`, 'json');
      return JSON.parse(text) as string[];
    } catch {
      return this.fallback.generateRiskTriggers(stockData, analysis);
    }
  }

  async generateWhatChanged(symbol: string, oldAnalysis: StockAnalysis, newAnalysis: StockAnalysis): Promise<string> {
    if (!this.activeProvider) return this.fallback.generateWhatChanged(symbol, oldAnalysis, newAnalysis);
    try {
      return await this.generate('You are a research analyst.', `What changed for ${symbol}?\nOld scores: Q:${oldAnalysis.quality.score} V:${oldAnalysis.valuation.score} G:${oldAnalysis.growth.score}\nNew scores: Q:${newAnalysis.quality.score} V:${newAnalysis.valuation.score} G:${newAnalysis.growth.score}`, 'text');
    } catch {
      return this.fallback.generateWhatChanged(symbol, oldAnalysis, newAnalysis);
    }
  }

  async generatePeerComparison(stockData: StockData, peers: StockData[]): Promise<string> {
    if (!this.activeProvider) return this.fallback.generatePeerComparison(stockData, peers);
    try {
      return await this.generate('You are an equity analyst.', `Compare ${stockData.symbol} to peers: ${peers.map(p => `${p.symbol} P/E:${p.pe} Growth:${p.revenueGrowth}%`).join(', ')}`, 'text');
    } catch {
      return this.fallback.generatePeerComparison(stockData, peers);
    }
  }

  async generateValuationExplanation(stockData: StockData, analysis: StockAnalysis): Promise<string> {
    if (!this.activeProvider) return this.fallback.generateValuationExplanation(stockData, analysis);
    try {
      return await this.generate('You are a valuation analyst.', `Explain valuation for ${stockData.symbol}. P/E:${stockData.pe} P/B:${stockData.pb} Sector:${stockData.sector} Valuation score:${analysis.valuation.score}`, 'text');
    } catch {
      return this.fallback.generateValuationExplanation(stockData, analysis);
    }
  }

  async generateEarningsSummary(symbol: string, financialData: Record<string, unknown>): Promise<string> {
    if (!this.activeProvider) return this.fallback.generateEarningsSummary(symbol, financialData);
    try {
      return await this.generate('You are an earnings analyst.', `Summarize earnings for ${symbol}. Data: ${JSON.stringify(financialData)}`, 'text');
    } catch {
      return this.fallback.generateEarningsSummary(symbol, financialData);
    }
  }

  async generateWatchlistAlert(symbol: string, reason: string, context: string): Promise<string> {
    if (!this.activeProvider) return this.fallback.generateWatchlistAlert(symbol, reason, context);
    try {
      return await this.generate('You are an alert generator.', `Watchlist: ${symbol}. Reason: ${reason}. Context: ${context}`, 'text');
    } catch {
      return this.fallback.generateWatchlistAlert(symbol, reason, context);
    }
  }

  async explainFactorScore(factorName: string, score: number, data: Record<string, unknown>): Promise<string> {
    if (!this.activeProvider) return this.fallback.explainFactorScore(factorName, score, data);
    try {
      return await this.generate('You are a research analyst.', `Explain factor: ${factorName} score ${score}/100. Data: ${JSON.stringify(data)}`, 'text');
    } catch {
      return this.fallback.explainFactorScore(factorName, score, data);
    }
  }
}
