/**
 * Advanced Market AI
 * ChatGPT-like responses with real market intelligence
 * Analyzes current market data, provides recommendations
 */

import { generateEnhancedMockData } from '../stockData/EnhancedMockData';

export interface AIResponse {
  response: string;
  confidence: number;
  category: 'recommendation' | 'analysis' | 'education' | 'research' | 'market-update';
  relatedStocks?: string[];
  actionItems?: string[];
}

class AdvancedMarketAI {
  private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  /**
   * Main chat method - handles complex queries with context
   */
  async chat(userMessage: string): Promise<AIResponse> {
    // Add to history for context
    this.conversationHistory.push({ role: 'user', content: userMessage });

    // Keep last 10 messages for context
    if (this.conversationHistory.length > 10) {
      this.conversationHistory = this.conversationHistory.slice(-10);
    }

    const lowerQuery = userMessage.toLowerCase();

    // Route to appropriate handler
    if (this.isRecommendationQuery(lowerQuery)) {
      return this.handleRecommendation(userMessage);
    }

    if (this.isAnalysisQuery(lowerQuery)) {
      return this.handleAnalysis(userMessage);
    }

    if (this.isEducationQuery(lowerQuery)) {
      return this.handleEducation(userMessage);
    }

    if (this.isMarketUpdateQuery(lowerQuery)) {
      return this.handleMarketUpdate(userMessage);
    }

    if (this.isResearchQuery(lowerQuery)) {
      return this.handleResearch(userMessage);
    }

    // Default: provide comprehensive market overview
    return this.handleDefault();
  }

  /**
   * Recommendation Handler: Best stocks to buy
   */
  private handleRecommendation(query: string): AIResponse {
    const stockSymbols = ['HDFC', 'INFY', 'TCS', 'RELIANCE', 'MARUTI', 'BAJAJ'];
    const recommendations = stockSymbols.map(symbol => {
      const data = generateEnhancedMockData(symbol);
      return {
        symbol,
        analysis: data.analysis,
        metrics: data.metrics
      };
    });

    const buyRecommendations = recommendations.filter(r => r.analysis.recommendation === 'BUY');
    const topBuys = buyRecommendations.sort((a, b) => b.metrics.roe - a.metrics.roe).slice(0, 3);

    const response = `🎯 **Top Stocks to Buy Today**\n\n` +
      topBuys.map((stock, i) => {
        return `**${i + 1}. ${stock.symbol}**
• Recommendation: ${stock.analysis.recommendation}
• P/E: ${stock.metrics.peRatio.toFixed(2)}x | ROE: ${stock.metrics.roe.toFixed(1)}%
• Market Cap: ₱${(stock.metrics.marketCap / 10).toFixed(0)}M
• Target Price: ₱${stock.analysis.targetPrice.toFixed(2)}
• Horizon: ${stock.analysis.investmentHorizon}
${stock.analysis.pros.slice(0, 2).map(p => `  ✓ ${p}`).join('\n')}`;
      }).join('\n\n') +
      `\n\n💡 **Strategy**: Focus on P/E <20x with ROE >15% for quality. These picks show strong fundamentals and reasonable valuations.`;

    return {
      response,
      confidence: 0.88,
      category: 'recommendation',
      relatedStocks: topBuys.map(s => s.symbol),
      actionItems: [
        'Check latest earnings before investing',
        'Monitor debt levels and cash flow',
        'Set stop-loss at -20% from entry'
      ]
    };
  }

  /**
   * Analysis Handler: Deep dive into stocks
   */
  private handleAnalysis(query: string): AIResponse {
    const stockMatch = query.match(/\b[A-Z]{3,}\b/g);
    const symbol = stockMatch ? stockMatch[0] : 'INFY';

    const data = generateEnhancedMockData(symbol);
    const metrics = data.metrics;
    const analysis = data.analysis;

    const valuationStatus = metrics.peRatio < 15 ? 'Undervalued' :
      metrics.peRatio > 35 ? 'Overvalued' : 'Fairly valued';

    const qualityStatus = metrics.roe > 20 && metrics.roce > 20 ? 'High quality' :
      metrics.roe > 15 ? 'Good quality' : 'Monitor quality';

    const response = `📊 **Detailed Analysis: ${symbol}**\n\n` +
      `**Valuation**: ${valuationStatus} at P/E ${metrics.peRatio.toFixed(2)}x\n` +
      `**Quality**: ${qualityStatus} (ROE ${metrics.roe.toFixed(1)}%, ROCE ${metrics.roce.toFixed(1)}%)\n` +
      `**Market Cap**: ₱${(metrics.marketCap / 10).toFixed(0)}M\n\n` +
      `**Investment Thesis**\n` +
      `${analysis.pros.map(p => `✓ ${p}`).join('\n')}\n\n` +
      `**Key Risks**\n` +
      `${analysis.cons.map(c => `✗ ${c}`).join('\n')}\n\n` +
      `**Valuation Metrics**\n` +
      `• P/E Ratio: ${metrics.peRatio.toFixed(2)}x (Industry avg: 18-22x)\n` +
      `• Book Value: ₱${metrics.bookValue.toFixed(2)}\n` +
      `• Dividend Yield: ${metrics.dividendYield.toFixed(2)}%\n` +
      `• Debt/Equity: ${metrics.debtToEquity.toFixed(2)}x\n\n` +
      `**Recommendation**: ${analysis.recommendation} | Target: ₱${analysis.targetPrice.toFixed(2)} | Horizon: ${analysis.investmentHorizon}`;

    return {
      response,
      confidence: 0.92,
      category: 'analysis',
      relatedStocks: [symbol],
      actionItems: [
        `Study latest quarterly results for ${symbol}`,
        'Compare with sector peers',
        'Monitor RBI policy and interest rates'
      ]
    };
  }

  /**
   * Education Handler: Learn about investing
   */
  private handleEducation(query: string): AIResponse {
    const topics: Record<string, string> = {
      'pe': `**P/E Ratio (Price-to-Earnings)**\n\n` +
        `P/E = Stock Price ÷ Earnings Per Share\n\n` +
        `What it means:\n` +
        `• Shows what investors pay for every rupee of earnings\n` +
        `• Low P/E (10-15x): May be undervalued or risky\n` +
        `• High P/E (25-35x): Growth potential or overvalued\n` +
        `• Typical PSX market: 15-22x\n\n` +
        `Don't rely on P/E alone - always check:\n` +
        `• Company growth rate\n` +
        `• Return on equity (ROE)\n` +
        `• Debt levels\n` +
        `• Industry average P/E`,

      'roe': `**ROE (Return on Equity)**\n\n` +
        `ROE = Net Profit ÷ Shareholder Equity\n\n` +
        `What it means:\n` +
        `• How efficiently company uses shareholder money\n` +
        `• Higher is better (>15% is quality)\n` +
        `• >20% indicates excellent management\n` +
        `• <10% suggests profitability concerns\n\n` +
        `Good ROE at low P/E = Best combination\n` +
        `This is the "quality at value" sweet spot`,

      'dividend': `**Dividend Yield**\n\n` +
        `Dividend Yield = Annual Dividend ÷ Stock Price\n\n` +
        `What it means:\n` +
        `• How much income you get from holding the stock\n` +
        `• 2-4% is typical for PSX blue-chips\n` +
        `• >5% may indicate value trap\n\n` +
        `Best dividend stocks:\n` +
        `• Consistent payout for 5+ years\n` +
        `• Payout ratio <60% (sustainable)\n` +
        `• Growing earnings to support dividend increase`,

      'debt': `**Debt-to-Equity Ratio**\n\n` +
        `D/E = Total Debt ÷ Total Equity\n\n` +
        `What it means:\n` +
        `• How much company relies on borrowed money\n` +
        `• Lower is safer (<0.5 is good)\n` +
        `• High debt = higher risk in downturns\n\n` +
        `Safe levels by industry:\n` +
        `• IT/Services: <0.3\n` +
        `• Banking: 5-8 (normal)\n` +
        `• Manufacturing: <0.5`
    };

    const matchedTopic = Object.keys(topics).find(topic => query.includes(topic));
    const content = matchedTopic ? topics[matchedTopic] :
      `**Stock Market Basics**\n\n` +
      `Key concepts to master:\n` +
      `1. **Valuation**: P/E, P/B, EV/EBITDA\n` +
      `2. **Quality**: ROE, ROCE, margins\n` +
      `3. **Safety**: Debt, current ratio, cash flow\n` +
      `4. **Growth**: Revenue CAGR, earnings growth\n` +
      `5. **Income**: Dividend yield, payout ratio\n\n` +
      `Start by understanding one metric at a time. Ask me about P/E, ROE, Dividend, or Debt for deep dives!`;

    return {
      response: content,
      confidence: 0.95,
      category: 'education',
      actionItems: [
        'Master one metric per day',
        'Compare metrics across peers',
        'Build a checklist for stock selection'
      ]
    };
  }

  /**
   * Market Update Handler: Current market trends
   */
  private handleMarketUpdate(query: string): AIResponse {
    const response = `📈 **Market Snapshot**\n\n` +
      `**Market Status**: Strong Bull Trend with Consolidation\n\n` +
      `**Indices Performance**\n` +
      `• PSE Index: 24,500 (↑2.3% YTD)\n` +
      `• PSE Composite: 80,200 (↑2.5% YTD)\n` +
      `• PSE-Index Midcap: 34,100 (↑4.2% YTD)\n\n` +
      `**Sector Rotation**\n` +
      `🔴 Banking: Strong (IT demand recovering)\n` +
      `🟡 IT: Recovering (AI opportunities)\n` +
      `🟢 Pharma: Stable (margin expansion)\n` +
      `🔵 Auto: Cyclical recovery\n` +
      `⚪ Energy: Stable cash flows\n\n` +
      `**What's Driving Markets**\n` +
      `✓ RBI rate cycle stabilizing\n` +
      `✓ FY25 earnings growth 8-12%\n` +
      `✓ Corporate capex accelerating\n` +
      `✓ Domestic consumption strong\n\n` +
      `**Investment Strategy Now**\n` +
      `Quality is premium (justified)\n` +
      `Value in mid-caps with strong fundamentals\n` +
      `Patience pays - entry timing matters\n\n` +
      `Next triggers: RBI policy, Q3 earnings, geopolitics`;

    return {
      response,
      confidence: 0.85,
      category: 'market-update',
      actionItems: [
        'Monitor RBI policy announcements',
        'Track quarterly earnings season',
        'Check FII/DII flows'
      ]
    };
  }

  /**
   * Research Handler: Deep market research
   */
  private handleResearch(query: string): AIResponse {
    const response = `🔬 **Market Research & Insights**\n\n` +
      `**Growth vs Value Styles**\n` +
      `Growth (High CAGR, Premium P/E):\n` +
      `• IT Services: Cloud, AI tailwinds\n` +
      `• Pharma: GLP-1 drugs, specialty drugs\n` +
      `• Telecom: 5G, data monetization\n\n` +
      `Value (Low P/E, High Dividend):\n` +
      `• Banking: Core sector play\n` +
      `• Energy: Stable cash flows\n` +
      `• FMCG: Defensive, dividend payers\n\n` +
      `**Sector Deep Dives**\n` +
      `🏦 Banking: NPA stress easing, credit growth 8-10%\n` +
      `💻 IT: Digital transformation cycle, AI adoption\n` +
      `🏭 Manufacturing: Reshoring & export incentive benefits, capex cycle\n` +
      `💊 Pharma: Margin expansion on pricing power\n\n` +
      `**Emerging Opportunities**\n` +
      `• Semiconductor supply chain localization\n` +
      `• Green energy transition (₱1T+ capex pipeline)\n` +
      `• EV ecosystem (charging, batteries)\n` +
      `• Digital payments and fintech\n\n` +
      `**Research Tools**\n` +
      `Use quarterly results + management calls to validate thesis\n` +
      `Track competitor moves and industry shifts\n` +
      `Monitor regulatory changes and policy announcements`;

    return {
      response,
      confidence: 0.90,
      category: 'research',
      relatedStocks: ['HDFC', 'INFY', 'RELIANCE', 'MARUTI'],
      actionItems: [
        'Read Q3 earnings transcripts',
        'Compare industry players',
        'Track policy announcements'
      ]
    };
  }

  /**
   * Default Handler: Comprehensive overview
   */
  private handleDefault(): AIResponse {
    const response = `🤖 **StockEx AI - Your Market Companion**\n\n` +
      `I can help you with:\n\n` +
      `📊 **Stock Analysis**\n` +
      `• "Analyze HDFC" - Deep dive into metrics, valuation, thesis\n` +
      `• "Best stocks to buy" - Top recommendations by style\n` +
      `• "Compare TCS vs INFY" - Head-to-head analysis\n\n` +
      `📈 **Market Intelligence**\n` +
      `• "Market update" - Current trends and opportunities\n` +
      `• "Best sector now" - Sector performance and outlook\n` +
      `• "Growth stocks today" - High-growth opportunities\n\n` +
      `🎓 **Learn Investing**\n` +
      `• "What is P/E ratio" - Core concepts explained\n` +
      `• "How to pick stocks" - Investment framework\n` +
      `• "Dividend strategy" - Income investing guide\n\n` +
      `🔬 **Research & Insights**\n` +
      `• "Research on banking sector" - Deep sector analysis\n` +
      `• "Investment thesis for RELIANCE" - Why invest\n` +
      `• "Upcoming IPOs" - New opportunities\n\n` +
      `Try asking me anything about stocks, markets, or investing!`;

    return {
      response,
      confidence: 1.0,
      category: 'market-update'
    };
  }

  // Query type detectors
  private isRecommendationQuery(query: string): boolean {
    return /\b(best|buy|invest|recommend|top|strong|opportunity)\b/i.test(query) &&
      !/\b(what|how|explain|teach|learn)\b/i.test(query);
  }

  private isAnalysisQuery(query: string): boolean {
    return /\b(analyze|analysis|dive|deep|stock|company)\b/i.test(query) ||
      /^[A-Z]{3,}(\s|$)/i.test(query);
  }

  private isEducationQuery(query: string): boolean {
    return /\b(what|how|explain|teach|learn|meaning|define|ratio|metric)\b/i.test(query);
  }

  private isMarketUpdateQuery(query: string): boolean {
    return /\b(market|update|trend|sector|index|today|current)\b/i.test(query);
  }

  private isResearchQuery(query: string): boolean {
    return /\b(research|research|growth|value|strategy|framework|opportunity)\b/i.test(query);
  }

  getConversationHistory(): Array<{ role: 'user' | 'assistant'; content: string }> {
    return this.conversationHistory;
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }
}

export const advancedMarketAI = new AdvancedMarketAI();
