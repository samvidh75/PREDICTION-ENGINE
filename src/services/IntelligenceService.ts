import axios, { type AxiosInstance } from 'axios';

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  pe: number;
  pb: number;
  roe: number;
  marketCap: string;
  sector: string;
  industry: string;
  revenueGrowth: number;
  profitMargin: number;
  debtToEquity: number;
  currentRatio: number;
  rsi: number;
  macd: number;
  bollingerWidth: number;
  high52w: number;
  low52w: number;
}

interface AnalysisScore {
  score: number;
  reasoning: string;
  factors: string[];
}

interface StockAnalysis {
  symbol: string;
  quality: AnalysisScore;
  valuation: AnalysisScore;
  growth: AnalysisScore;
  technicals: AnalysisScore;
  risk: AnalysisScore;
}

interface Thesis {
  bullCase: string;
  bearCase: string;
  investmentHorizon: '3-6 months' | '6-12 months' | '1-2 years';
  keyRisks: string[];
  catalysts: string[];
}

interface Recommendation {
  action: 'BUY' | 'HOLD' | 'SELL';
  rating: number;
  conviction: number;
  targetPrice?: number;
  timeframe: string;
  riskReward: 'favorable' | 'neutral' | 'unfavorable';
}

export class IntelligenceService {
  private client: AxiosInstance;
  private modelName = process.env.OLLAMA_MODEL || 'mistral';

  constructor() {
    const url = process.env.SGLANG_INTELLIGENCE_URL || process.env.SGLANG_URL || process.env.OLLAMA_URL || 'http://localhost:11434';
    this.client = axios.create({
      baseURL: url,
      timeout: 60000,
    });
  }

  async analyzeStock(
    stockData: StockData,
    depth: 'quick' | 'detailed' = 'quick'
  ): Promise<StockAnalysis> {
    const prompt = this.buildAnalysisPrompt(stockData, depth);
    const response = await this.generateStructuredOutput(
      prompt,
      depth === 'quick' ? 1000 : 2000
    );
    return this.parseAnalysis(response, stockData.symbol);
  }

  async generateThesis(
    stockData: StockData,
    analysis: StockAnalysis
  ): Promise<Thesis> {
    const prompt = this.buildThesisPrompt(stockData, analysis);
    const response = await this.generateStructuredOutput(prompt, 1500);
    return JSON.parse(response);
  }

  async generateRecommendation(
    stockData: StockData,
    analysis: StockAnalysis,
    thesis: Thesis
  ): Promise<Recommendation> {
    const prompt = this.buildRecommendationPrompt(stockData, analysis, thesis);
    const response = await this.generateStructuredOutput(prompt, 800);
    return JSON.parse(response);
  }

  async compareStocks(
    stocks: StockData[]
  ): Promise<{
    ranking: Array<{ symbol: string; score: number; reasoning: string }>;
    winner: string;
    summary: string;
  }> {
    const prompt = this.buildComparisonPrompt(stocks);
    const response = await this.generateStructuredOutput(prompt, 1500);
    return JSON.parse(response);
  }

  async chat(
    symbol: string,
    question: string,
    context: string
  ): Promise<string> {
    const prompt = `You are a financial analyst expert in Indian stocks.

Stock: ${symbol}
Context:
${context}

User Question: ${question}

Provide a clear, informative answer based on the context. Be concise but comprehensive.`;

    const response = await this.generateText(prompt, 1000, 0.5);
    return response.trim();
  }

  async checkThesisValidity(
    symbol: string,
    originalThesis: Thesis,
    currentAnalysis: StockAnalysis
  ): Promise<{
    stillValid: boolean;
    changes: {
      bullCaseStatus: string;
      newRisks: string[];
      mitigatedRisks: string[];
      recommendation: 'continue' | 'reconsider' | 'exit';
      updateRequired: boolean;
    };
  }> {
    const prompt = `Original Investment Thesis for ${symbol}:
Bull Case: ${originalThesis.bullCase}
Bear Case: ${originalThesis.bearCase}
Key Risks: ${originalThesis.keyRisks.join(', ')}

Current Analysis Scores:
Quality: ${currentAnalysis.quality.score}/100
Valuation: ${currentAnalysis.valuation.score}/100
Growth: ${currentAnalysis.growth.score}/100
Technicals: ${currentAnalysis.technicals.score}/100
Risk: ${currentAnalysis.risk.score}/100

Assess if original thesis remains valid. Return JSON:
{
  "stillValid": true/false,
  "changes": {
    "bullCaseStatus": "Still holding/Weakened/Strengthened",
    "newRisks": ["risk1", "risk2"],
    "mitigatedRisks": ["risk1"],
    "recommendation": "continue|reconsider|exit",
    "updateRequired": true/false
  }
}`;

    const response = await this.generateStructuredOutput(prompt, 1000);
    return JSON.parse(response);
  }

  async generateMarketCommentary(
    topStocks: StockData[],
    marketTrend: 'bullish' | 'bearish' | 'neutral'
  ): Promise<string> {
    const prompt = `Market Trend: ${marketTrend}

Top Stocks:
${topStocks.map((s) => `${s.symbol}: ${s.price} (${s.changePercent}%)`).join('\n')}

Generate a brief market commentary highlighting key insights and opportunities.`;

    return this.generateText(prompt, 800, 0.6);
  }

  private buildAnalysisPrompt(data: StockData, depth: string): string {
    return `Analyze the stock ${data.symbol} (${data.name}) comprehensively.

Company Information:
- Sector: ${data.sector}
- Industry: ${data.industry}
- Market Cap: ${data.marketCap}
- Current Price: ₹${data.price} (${data.changePercent}%)

Financial Metrics:
- P/E Ratio: ${data.pe}
- P/B Ratio: ${data.pb}
- ROE: ${data.roe}%
- Debt to Equity: ${data.debtToEquity}
- Current Ratio: ${data.currentRatio}
- Revenue Growth: ${data.revenueGrowth}%
- Profit Margin: ${data.profitMargin}%

Technical Analysis:
- RSI (14): ${data.rsi}
- MACD: ${data.macd}
- Bollinger Width: ${data.bollingerWidth}
- 52W High/Low: ₹${data.high52w} / ₹${data.low52w}

Provide a JSON analysis with these exact fields:
{
  "quality": {
    "score": 0-100,
    "reasoning": "Why quality is [score]",
    "factors": ["positive_factor1", "negative_factor1"]
  },
  "valuation": {
    "score": 0-100,
    "reasoning": "Why valuation is [score]",
    "factors": ["factor1", "factor2"]
  },
  "growth": {
    "score": 0-100,
    "reasoning": "Why growth is [score]",
    "factors": ["factor1", "factor2"]
  },
  "technicals": {
    "score": 0-100,
    "reasoning": "Why technicals are [score]",
    "factors": ["factor1"]
  },
  "risk": {
    "score": 0-100,
    "reasoning": "Why risk is [score]",
    "factors": ["risk1", "risk2"]
  }
}

${depth === 'detailed' ? 'Provide comprehensive analysis.' : 'Keep analysis concise.'}`;
  }

  private buildThesisPrompt(data: StockData, analysis: StockAnalysis): string {
    return `Based on this analysis of ${data.symbol}:

Quality Score: ${analysis.quality.score}/100 - ${analysis.quality.reasoning}
Valuation Score: ${analysis.valuation.score}/100 - ${analysis.valuation.reasoning}
Growth Score: ${analysis.growth.score}/100 - ${analysis.growth.reasoning}
Technicals Score: ${analysis.technicals.score}/100 - ${analysis.technicals.reasoning}
Risk Score: ${analysis.risk.score}/100 - ${analysis.risk.reasoning}

Generate an investment thesis. Return JSON:
{
  "bullCase": "Why to buy this stock (2-3 sentences)",
  "bearCase": "Why to avoid or sell (2-3 sentences)",
  "investmentHorizon": "3-6 months|6-12 months|1-2 years",
  "keyRisks": ["risk1", "risk2", "risk3"],
  "catalysts": ["catalyst1", "catalyst2"]
}`;
  }

  private buildRecommendationPrompt(
    data: StockData,
    analysis: StockAnalysis,
    thesis: Thesis
  ): string {
    const overallScore =
      (analysis.quality.score +
        analysis.valuation.score +
        analysis.growth.score) /
      3;

    return `Based on comprehensive analysis of ${data.symbol}:

Overall Analysis Score: ${overallScore.toFixed(0)}/100
Bull Case: ${thesis.bullCase}
Bear Case: ${thesis.bearCase}
Key Risks: ${thesis.keyRisks.join(', ')}

Generate a recommendation. Return JSON:
{
  "action": "BUY|HOLD|SELL",
  "rating": 0-100,
  "conviction": 0-100,
  "timeframe": "3-6 months",
  "riskReward": "favorable|neutral|unfavorable"
}`;
  }

  private buildComparisonPrompt(stocks: StockData[]): string {
    return `Compare these Indian stocks:

${stocks
  .map(
    (s) => `
${s.symbol}:
- Price: ₹${s.price}
- P/E: ${s.pe}
- ROE: ${s.roe}%
- Growth: ${s.revenueGrowth}%
- Debt/Equity: ${s.debtToEquity}
`
  )
  .join('\n')}

Rank these stocks for investment. Return JSON:
{
  "ranking": [
    { "symbol": "X", "score": 85, "reasoning": "..." },
    { "symbol": "Y", "score": 72, "reasoning": "..." }
  ],
  "winner": "SYMBOL",
  "summary": "Overall comparison insights"
}`;
  }

  private async generateText(
    prompt: string,
    maxTokens = 1000,
    temperature = 0.7
  ): Promise<string> {
    try {
      const response = await this.client.post('/api/generate', {
        model: this.modelName,
        prompt,
        options: {
          num_predict: maxTokens,
          temperature,
          top_p: 0.9,
        },
        stream: false,
      });
      return response.data.response;
    } catch (error: any) {
      const detail = error?.response?.data || error?.message || String(error);
      console.error('Ollama generation error:', JSON.stringify(detail));
      throw new Error(`Failed to generate text: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
    }
  }

  private async generateStructuredOutput(
    prompt: string,
    maxTokens = 1000
  ): Promise<string> {
    const structuredPrompt = `${prompt}

IMPORTANT: Return ONLY valid JSON, no other text.`;

    const response = await this.generateText(structuredPrompt, maxTokens, 0.3);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from response');
    }
    return jsonMatch[0];
  }

  private parseAnalysis(jsonString: string, symbol: string): StockAnalysis {
    try {
      const data = JSON.parse(jsonString);
      return {
        symbol,
        quality: {
          score: Math.min(100, Math.max(0, data.quality.score || 50)),
          reasoning: data.quality.reasoning || 'Analysis pending',
          factors: data.quality.factors || [],
        },
        valuation: {
          score: Math.min(100, Math.max(0, data.valuation.score || 50)),
          reasoning: data.valuation.reasoning || 'Analysis pending',
          factors: data.valuation.factors || [],
        },
        growth: {
          score: Math.min(100, Math.max(0, data.growth.score || 50)),
          reasoning: data.growth.reasoning || 'Analysis pending',
          factors: data.growth.factors || [],
        },
        technicals: {
          score: Math.min(100, Math.max(0, data.technicals.score || 50)),
          reasoning: data.technicals.reasoning || 'Analysis pending',
          factors: data.technicals.factors || [],
        },
        risk: {
          score: Math.min(100, Math.max(0, data.risk.score || 50)),
          reasoning: data.risk.reasoning || 'Analysis pending',
          factors: data.risk.factors || [],
        },
      };
    } catch (error) {
      console.error('Parse error:', error);
      return {
        symbol,
        quality: { score: 50, reasoning: 'Analysis error', factors: [] },
        valuation: { score: 50, reasoning: 'Analysis error', factors: [] },
        growth: { score: 50, reasoning: 'Analysis error', factors: [] },
        technicals: { score: 50, reasoning: 'Analysis error', factors: [] },
        risk: { score: 50, reasoning: 'Analysis error', factors: [] },
      };
    }
  }
}

export const intelligenceService = new IntelligenceService();
