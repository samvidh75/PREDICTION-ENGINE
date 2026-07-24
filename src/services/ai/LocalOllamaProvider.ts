import axios from 'axios';
import type { AIProvider, StockData, StockAnalysis, Thesis, Recommendation, StockComparison, ThesisValidity } from './AIProvider';
import { DeterministicResearchProvider } from './DeterministicResearchProvider';

export class LocalOllamaProvider implements AIProvider {
  private client = axios.create({
    baseURL: process.env.OLLAMA_URL || process.env.SGLANG_URL || 'http://localhost:11434',
    timeout: 60000,
  });
  private modelName = process.env.OLLAMA_MODEL || 'mistral';
  private fallback = new DeterministicResearchProvider();

  private async generateText(prompt: string, maxTokens = 1000, temperature = 0.7): Promise<string> {
    try {
      const response = await this.client.post('/api/generate', {
        model: this.modelName,
        prompt,
        options: { num_predict: maxTokens, temperature, top_p: 0.9 },
        stream: false,
      });
      if (response.data?.response) return response.data.response;
    } catch {
      console.warn('[LocalOllama] Unavailable, falling back to deterministic');
    }
    throw new Error('Ollama unavailable');
  }

  private async generateStructured(prompt: string, maxTokens = 1000): Promise<string> {
    const sp = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON, no other text.`;
    const response = await this.generateText(sp, maxTokens, 0.3);
    const match = response.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Failed to extract JSON');
    return match[0];
  }

  private async withFallback<T>(fn: () => Promise<T>, fb: () => Promise<T>): Promise<T> {
    try { return await fn(); } catch { return fb(); }
  }

  async analyzeStock(stockData: StockData, depth: 'quick' | 'detailed' = 'quick'): Promise<StockAnalysis> {
    return this.withFallback(async () => {
      const json = await this.generateStructured(this.buildAnalysisPrompt(stockData, depth));
      return JSON.parse(json) as StockAnalysis;
    }, () => this.fallback.analyzeStock(stockData, depth));
  }

  async generateThesis(stockData: StockData, analysis: StockAnalysis): Promise<Thesis> {
    return this.withFallback(async () => {
      const json = await this.generateStructured(this.buildThesisPrompt(stockData, analysis));
      return JSON.parse(json);
    }, () => this.fallback.generateThesis(stockData, analysis));
  }

  async generateRecommendation(stockData: StockData, analysis: StockAnalysis, thesis: Thesis): Promise<Recommendation> {
    return this.withFallback(async () => {
      const json = await this.generateStructured(this.buildRecommendationPrompt(stockData, analysis, thesis));
      return JSON.parse(json);
    }, () => this.fallback.generateRecommendation(stockData, analysis, thesis));
  }

  async compareStocks(stocks: StockData[]): Promise<StockComparison> {
    return this.withFallback(async () => {
      const json = await this.generateStructured(this.buildComparisonPrompt(stocks));
      return JSON.parse(json);
    }, () => this.fallback.compareStocks(stocks));
  }

  async chat(symbol: string, question: string, context: string): Promise<string> {
    return this.withFallback(async () => {
      return this.generateText(`You are a financial analyst expert in PSX stocks.\n\nStock: ${symbol}\nContext:\n${context}\n\nUser Question: ${question}\n\nProvide a clear, informative answer.`, 1000, 0.5);
    }, () => this.fallback.chat(symbol, question, context));
  }

  async checkThesisValidity(symbol: string, originalThesis: Thesis, currentAnalysis: StockAnalysis): Promise<import('./AIProvider').ThesisValidity> {
    return this.withFallback(async () => {
      const json = await this.generateStructured(
        `Original thesis for ${symbol}:\nBull: ${originalThesis.bullCase}\nBear: ${originalThesis.bearCase}\nRisks: ${(originalThesis.keyRisks ?? []).join(', ')}\nCurrent: Q:${currentAnalysis.quality.score} V:${currentAnalysis.valuation.score} G:${currentAnalysis.growth.score} T:${currentAnalysis.technicals.score} R:${currentAnalysis.risk.score}\nAssess. Return JSON: { "stillValid": true/false, "changes": { "bullCaseStatus": "", "newRisks": [], "mitigatedRisks": [], "recommendation": "continue|reconsider|exit", "updateRequired": true/false } }`);
      return JSON.parse(json);
    }, () => this.fallback.checkThesisValidity(symbol, originalThesis, currentAnalysis));
  }

  async generateMarketCommentary(topStocks: StockData[], marketTrend: string): Promise<string> {
    return this.withFallback(async () => {
      return this.generateText(`Market trend: ${marketTrend}\nTop stocks: ${topStocks.map(s => `${s.symbol}: ${s.price} (${s.changePercent}%)`).join('\n')}\nGenerate brief market commentary.`, 800, 0.6);
    }, () => this.fallback.generateMarketCommentary(topStocks, marketTrend));
  }

  async generateBullBearCase(stockData: StockData, analysis: StockAnalysis): Promise<{ bullCase: string; bearCase: string }> {
    return this.withFallback(async () => {
      const json = await this.generateStructured(`Bull/bear for ${stockData.symbol}. Quality:${analysis.quality.score} Growth:${analysis.growth.score} Risk:${analysis.risk.score}\nReturn JSON: {"bullCase":"","bearCase":""}`);
      return JSON.parse(json);
    }, () => this.fallback.generateBullBearCase(stockData, analysis));
  }

  async generateRiskTriggers(stockData: StockData, analysis: StockAnalysis): Promise<string[]> {
    return this.withFallback(async () => {
      const json = await this.generateStructured(`Risk triggers for ${stockData.symbol}. Risk score:${analysis.risk.score} Debt/Equity:${stockData.debtToEquity}\nReturn JSON array of risks.`);
      return JSON.parse(json);
    }, () => this.fallback.generateRiskTriggers(stockData, analysis));
  }

  async generateWhatChanged(symbol: string, oldAnalysis: StockAnalysis, newAnalysis: StockAnalysis): Promise<string> {
    return this.withFallback(async () => {
      return this.generateText(`What changed for ${symbol}? Old: Q:${oldAnalysis.quality.score} V:${oldAnalysis.valuation.score} G:${oldAnalysis.growth.score}\nNew: Q:${newAnalysis.quality.score} V:${newAnalysis.valuation.score} G:${newAnalysis.growth.score}`, 500);
    }, () => this.fallback.generateWhatChanged(symbol, oldAnalysis, newAnalysis));
  }

  async generatePeerComparison(stockData: StockData, peers: StockData[]): Promise<string> {
    return this.withFallback(async () => {
      return this.generateText(`Compare ${stockData.symbol} to peers: ${peers.map(p => `${p.symbol} P/E:${p.pe} Growth:${p.revenueGrowth}%`).join(', ')}`, 500);
    }, () => this.fallback.generatePeerComparison(stockData, peers));
  }

  async generateValuationExplanation(stockData: StockData, analysis: StockAnalysis): Promise<string> {
    return this.withFallback(async () => {
      return this.generateText(`Explain valuation for ${stockData.symbol}. P/E:${stockData.pe} P/B:${stockData.pb} Sector:${stockData.sector} Score:${analysis.valuation.score}`, 500);
    }, () => this.fallback.generateValuationExplanation(stockData, analysis));
  }

  async generateEarningsSummary(symbol: string, financialData: Record<string, unknown>): Promise<string> {
    return this.withFallback(async () => {
      return this.generateText(`Summarize earnings for ${symbol}. ${JSON.stringify(financialData)}`, 500);
    }, () => this.fallback.generateEarningsSummary(symbol, financialData));
  }

  async generateWatchlistAlert(symbol: string, reason: string, context: string): Promise<string> {
    return this.withFallback(async () => {
      return this.generateText(`Alert for ${symbol}: ${reason}. Context: ${context}`, 300);
    }, () => this.fallback.generateWatchlistAlert(symbol, reason, context));
  }

  async explainFactorScore(factorName: string, score: number, data: Record<string, unknown>): Promise<string> {
    return this.withFallback(async () => {
      return this.generateText(`Explain ${factorName} score ${score}/100. Data: ${JSON.stringify(data)}`, 300);
    }, () => this.fallback.explainFactorScore(factorName, score, data));
  }

  private buildAnalysisPrompt(data: StockData, depth: string): string {
    return `Analyze ${data.symbol} (${data.name}). Sector:${data.sector} Industry:${data.industry} MarketCap:${data.marketCap} Price:${data.price}(${data.changePercent}%)
P/E:${data.pe} P/B:${data.pb} ROE:${data.roe}% Debt/Equity:${data.debtToEquity} Current:${data.currentRatio} RevGrowth:${data.revenueGrowth}% Margin:${data.profitMargin}%
RSI:${data.rsi} MACD:${data.macd} Bollinger:${data.bollingerWidth} 52WH:${data.high52w} 52WL:${data.low52w}
Return JSON with quality/valuation/growth/technicals/risk each having score(0-100), reasoning, factors[].
${depth === 'detailed' ? 'Comprehensive analysis.' : 'Concise.'}`;
  }

  private buildThesisPrompt(data: StockData, analysis: StockAnalysis): string {
    return `Thesis for ${data.symbol}. Q:${analysis.quality.score} V:${analysis.valuation.score} G:${analysis.growth.score} T:${analysis.technicals.score} R:${analysis.risk.score}
Return JSON: { "bullCase":"", "bearCase":"", "investmentHorizon":"", "keyRisks":[], "catalysts":[] }`;
  }

  private buildRecommendationPrompt(data: StockData, analysis: StockAnalysis, thesis: Thesis): string {
    const overall = (analysis.quality.score + analysis.valuation.score + analysis.growth.score) / 3;
    return `Rec for ${data.symbol}. Score:${overall.toFixed(0)} Bull:${thesis.bullCase} Bear:${thesis.bearCase} Risks:${(thesis.keyRisks ?? []).join(', ')}
Return JSON: { "action":"BUY|HOLD|SELL", "rating":0-100, "conviction":0-100, "timeframe":"", "riskReward":"favorable|neutral|unfavorable" }`;
  }

  private buildComparisonPrompt(stocks: StockData[]): string {
    return `Compare: ${stocks.map(s => `${s.symbol} P/E:${s.pe} ROE:${s.roe}% Growth:${s.revenueGrowth}%`).join('; ')}
Return JSON: { "ranking":[{"symbol":"","score":0,"reasoning":""}], "winner":"", "summary":"" }`;
  }
}
