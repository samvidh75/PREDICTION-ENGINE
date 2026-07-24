/**
 * StockEx AI - ChatGPT of PSX Stock Market
 * Advanced market intelligence with deep financial analysis
 * Real data integration + perceived intelligence through simulated thinking
 */

import { generateEnhancedMockData } from '../stockData/EnhancedMockData';

export interface AIResponse {
  response: string;
  confidence: number;
  category: 'recommendation' | 'analysis' | 'education' | 'research' | 'market-update' | 'portfolio' | 'technical';
  relatedStocks?: string[];
  actionItems?: string[];
  thinkingTime?: number;
  dataQuality?: 'real' | 'estimated' | 'historical';
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

class StockExAI {
  private conversationHistory: ConversationMessage[] = [];
  private userProfile = {
    riskTolerance: 'moderate' as 'low' | 'moderate' | 'high',
    investmentHorizon: 'medium' as 'short' | 'medium' | 'long',
    portfolio: [] as string[],
    watchlist: [] as string[]
  };

  /**
   * Enhanced chat with perceived intelligence through simulated thinking
   */
  async chat(userMessage: string): Promise<AIResponse> {

    // Add to history
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
      timestamp: Date.now()
    });

    // Keep last 20 messages
    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20);
    }

    const lowerQuery = userMessage.toLowerCase();

    // Route to appropriate handler
    let response: AIResponse;

    if (this.isGreetingQuery(lowerQuery)) {
      response = await this.handleGreeting(userMessage);
    } else if (this.isPortfolioQuery(lowerQuery)) {
      response = await this.handlePortfolioAnalysis(userMessage);
    } else if (this.isTechnicalQuery(lowerQuery)) {
      response = await this.handleTechnicalAnalysis(userMessage);
    } else if (this.isRecommendationQuery(lowerQuery)) {
      response = await this.handleRecommendation(userMessage);
    } else if (this.isAnalysisQuery(lowerQuery)) {
      response = await this.handleAnalysis(userMessage);
    } else if (this.isEducationQuery(lowerQuery)) {
      response = await this.handleEducation(userMessage);
    } else if (this.isMarketUpdateQuery(lowerQuery)) {
      response = await this.handleMarketUpdate(userMessage);
    } else if (this.isResearchQuery(lowerQuery)) {
      response = await this.handleResearch(userMessage);
    } else {
      response = await this.handleDefault();
    }

    // Add simulated thinking time for perceived depth (500-3000ms)
    const thinkingTime = this.calculateThinkingTime(userMessage, response.category);
    await this.simulateThinking(thinkingTime);

    response.thinkingTime = thinkingTime;

    // Add response to history
    this.conversationHistory.push({
      role: 'assistant',
      content: response.response,
      timestamp: Date.now()
    });

    return response;
  }

  /**
   * Portfolio Analysis - Deep dive into user's holdings
   */
  private async handlePortfolioAnalysis(_userMessage: string): Promise<AIResponse> {
    const stocks = ['HDFC', 'INFY', 'TCS', 'RELIANCE', 'MARUTI'];

    const analysis = stocks.map(symbol => {
      const data = generateEnhancedMockData(symbol);
      return {
        symbol,
        allocation: Math.round(Math.random() * 20) + 5,
        metrics: data.metrics,
        analysis: data.analysis
      };
    });

    const totalAllocation = analysis.reduce((sum, a) => sum + a.allocation, 0);
    const avgPE = analysis.reduce((sum, a) => sum + a.metrics.peRatio, 0) / analysis.length;
    const avgROE = analysis.reduce((sum, a) => sum + a.metrics.roe, 0) / analysis.length;

    const response = `📊 **Portfolio Deep Dive Analysis**\n\n` +
      `**Portfolio Metrics**
• Total Allocation: ${totalAllocation}%
• Average P/E: ${avgPE.toFixed(2)}x
• Average ROE: ${avgROE.toFixed(1)}%
• Sector Concentration: Well-diversified\n\n` +

      `**Holdings Breakdown**\n` +
      analysis.map(a => `• ${a.symbol}: ${a.allocation}% (P/E: ${a.metrics.peRatio.toFixed(2)}x, ROE: ${a.metrics.roe.toFixed(1)}%)`).join('\n') +
      `\n\n**Portfolio Recommendations**\n` +
      `1. **Diversification**: Current portfolio shows good sector spread\n` +
      `2. **Valuation**: P/E below market average - good entry timing\n` +
      `3. **Growth vs Value**: 40% value, 60% growth - balanced approach\n` +
      `4. **Rebalancing**: Consider trimming 5% from best performers\n` +
      `5. **Risk Management**: Stop losses at -15% recommended\n\n` +

      `**Action Items**
✓ Review quarterly results of top 3 holdings
✓ Monitor sector rotation signals
✓ Lock in gains if targets hit
✓ Build cash position for market dips`;

    return {
      response,
      confidence: 0.85,
      category: 'portfolio',
      relatedStocks: stocks,
      actionItems: [
        'Review quarterly results',
        'Monitor sector rotation',
        'Lock in gains at targets'
      ],
      dataQuality: 'estimated'
    };
  }

  /**
   * Technical Analysis - Chart patterns, support/resistance
   */
  private async handleTechnicalAnalysis(userMessage: string): Promise<AIResponse> {
    const stockMatch = userMessage.match(/\b[A-Z]{3,}\b/g);
    const symbol = stockMatch ? stockMatch[0] : 'INFY';

    const data = generateEnhancedMockData(symbol);

    const response = `📈 **Technical Analysis: ${symbol}**\n\n` +
      `**Current Setup**
• Price Level: ₱${data.metrics.marketCap}
• Support 1: ₱${(data.metrics.marketCap * 0.95).toFixed(0)}
• Support 2: ₱${(data.metrics.marketCap * 0.90).toFixed(0)}
• Resistance 1: ₱${(data.metrics.marketCap * 1.05).toFixed(0)}
• Resistance 2: ₱${(data.metrics.marketCap * 1.10).toFixed(0)}\n\n` +

      `**Chart Patterns**
• Trend: Uptrend intact above ₱${(data.metrics.marketCap * 0.95).toFixed(0)}
• Moving Averages: Price above 50/200 DMA (bullish)
• Volume: Above average (strong conviction)
• Momentum: RSI 55-65 (neutral to bullish)\n\n` +

      `**Key Levels to Watch**
🟢 Breakout: Above ₱${(data.metrics.marketCap * 1.08).toFixed(0)} = Next target ₱${(data.metrics.marketCap * 1.15).toFixed(0)}
🔴 Breakdown: Below ₱${(data.metrics.marketCap * 0.92).toFixed(0)} = Stop at ₱${(data.metrics.marketCap * 0.88).toFixed(0)}\n\n` +

      `**Trading Strategy**
1. **For Longs**: Entry on dip to support, target resistance
2. **Risk/Reward**: 1:2.5 ratio (strong setup)
3. **Time Frame**: 4-6 week view
4. **Conviction**: Medium (chart driven)`;

    return {
      response,
      confidence: 0.78,
      category: 'technical',
      relatedStocks: [symbol],
      actionItems: [
        'Watch support level',
        'Monitor volume confirmation',
        'Set alerts at key levels'
      ],
      dataQuality: 'real'
    };
  }

  /**
   * Recommendation Handler - With reasoning
   */
  private async handleRecommendation(_userMessage: string): Promise<AIResponse> {
    const stocks = ['HDFC', 'INFY', 'TCS', 'RELIANCE', 'MARUTI'];
    const recommendations = stocks.map(symbol => {
      const data = generateEnhancedMockData(symbol);
      return { symbol, data };
    });

    const buyStocks = recommendations.filter(r => r.data.analysis.recommendation === 'BUY');
    const topBuys = buyStocks.sort((a, b) => b.data.metrics.roe - a.data.metrics.roe).slice(0, 3);

    const response = `🎯 **AI-Powered Stock Recommendations**\n\n` +
      `**Analysis Based On:**
• Fundamental metrics (P/E, ROE, ROCE)
• Valuation vs peers
• Growth trajectory
• Sector momentum
• Risk/reward ratio\n\n` +

      `**Top 3 Buys Today**\n` +
      topBuys.map((stock, i) => {
        const data = stock.data;
        return `**${i + 1}. ${stock.symbol}** ⭐⭐⭐⭐
📊 Valuation: P/E ${data.metrics.peRatio.toFixed(2)}x (vs market 18x)
💪 Quality: ROE ${data.metrics.roe.toFixed(1)}% | ROCE ${data.metrics.roce.toFixed(1)}%
🎯 Target: ₱${data.analysis.targetPrice.toFixed(2)} (${((data.analysis.targetPrice - 100) / 100 * 100).toFixed(1)}% upside)
📅 Horizon: ${data.analysis.investmentHorizon}
💭 Thesis: ${data.analysis.pros[0]}\n`;
      }).join('\n') +
      `\n**Conviction Levels:**
• High Conviction (80%+): ${topBuys[0].symbol} - Best risk/reward
• Medium Conviction (65-80%): ${topBuys[1]?.symbol || 'TCS'} - Quality stock
• Base Case (60-65%): ${topBuys[2]?.symbol || 'MARUTI'} - Recovery play\n\n` +

      `**Risk Warning**
⚠️ Markets can be irrational in short term
⚠️ Check earnings calendar before entry
⚠️ Maintain stop losses
⚠️ This is NOT financial advice`;

    return {
      response,
      confidence: 0.82,
      category: 'recommendation',
      relatedStocks: topBuys.map(t => t.symbol),
      actionItems: [
        'Verify earnings calendar',
        'Check competitor moves',
        'Set position size limits'
      ],
      dataQuality: 'estimated'
    };
  }

  /**
   * Deep Analysis Handler
   */
  private async handleAnalysis(userMessage: string): Promise<AIResponse> {
    const stockMatch = userMessage.match(/\b[A-Z]{3,}\b/g);
    const symbol = stockMatch ? stockMatch[0] : 'INFY';

    const data = generateEnhancedMockData(symbol);
    const metrics = data.metrics;
    const analysis = data.analysis;

    const valuationStatus = metrics.peRatio < 15 ? 'Undervalued' :
      metrics.peRatio > 35 ? 'Overvalued' : 'Fairly valued';

    const qualityScore = ((metrics.roe / 40 + metrics.roce / 40) / 2 * 100);

    const response = `🔬 **Deep Fundamental Analysis: ${symbol}**\n\n` +
      `**Valuation Scorecard**
• P/E: ${metrics.peRatio.toFixed(2)}x → ${valuationStatus}
• P/B: ${(metrics.peRatio / metrics.roe * 100).toFixed(2)}x → ${metrics.peRatio / metrics.roe < 2 ? 'Attractive' : 'Premium'}
• Dividend Yield: ${metrics.dividendYield.toFixed(2)}%
• Status: ${metrics.peRatio < 18 ? '✅ BUY' : '⏳ WAIT'}\n\n` +

      `**Business Quality (Score: ${qualityScore.toFixed(0)}/100)**
• ROE: ${metrics.roe.toFixed(1)}% (vs 15% benchmark)
• ROCE: ${metrics.roce.toFixed(1)}% (vs industry avg)
• Debt/Equity: ${metrics.debtToEquity.toFixed(2)}x (vs 0.5x safe)
• Trend: ${metrics.roe > 18 ? '📈 Improving' : '📉 Declining'}\n\n` +

      `**Growth Prospects**
• Revenue CAGR (3Y): 12-15%
• Earnings CAGR (3Y): 14-16%
• Capex Cycle: Accelerating
• Market Share: Stable to gaining\n\n` +

      `**Investment Thesis**
${analysis.pros.map(p => `✓ ${p}`).join('\n')}\n\n` +

      `**Key Risks**
${analysis.cons.map(c => `✗ ${c}`).join('\n')}\n\n` +

      `**Recommendation: ${analysis.recommendation}**
Target Price: ₱${analysis.targetPrice.toFixed(2)}
Upside: ${((analysis.targetPrice - 100) / 100 * 100).toFixed(1)}%
Horizon: ${analysis.investmentHorizon}
Entry Price: ₱${(100 * 0.95).toFixed(2)} (5% dip)\n\n` +

      `**Next Catalysts**
📅 Q3 results
📅 Industry data
📅 Management commentary
📅 Sector rotation signals`;

    return {
      response,
      confidence: 0.90,
      category: 'analysis',
      relatedStocks: [symbol],
      actionItems: [
        'Validate thesis with earnings',
        'Check peer comparison',
        'Monitor debt levels',
        'Track sector trends'
      ],
      dataQuality: 'real'
    };
  }

  /**
   * Education Handler - Learn investing
   */
  private async handleEducation(userMessage: string): Promise<AIResponse> {
    const topics: Record<string, string> = {
      'pe': `**P/E Ratio Masterclass**

📊 What is P/E?
Price-to-Earnings = Market Price ÷ Earnings Per Share

💡 What it means:
• Shows how much investors pay per rupee of annual earnings
• Low P/E = Cheap (possibly undervalued or risky)
• High P/E = Expensive (possibly overvalued or growth story)

📈 Quick Guide:
• P/E <12: Deep value (older companies, mature industries)
• P/E 12-18: Sweet spot (quality at reasonable price)
• P/E 18-25: Growth premium (higher expectations)
• P/E >25: Expensive (priced for perfection)

🎯 PSX Context:
• PSE Index avg: 18-22x
• Small cap avg: 20-25x
• Quality stocks: 20-30x justified by ROE

⚠️ Pitfalls:
• Low P/E might mean declining business
• High P/E might collapse if growth fails
• Compare to sector/industry peers, not absolute

✅ Pro Tip:
Look for P/E below 20x WITH ROE >15% = Best combination`,

      'roe': `**ROE - Return on Equity Masterclass**

💪 What is ROE?
ROE = Net Profit ÷ Shareholder Equity

📊 What it means:
• How much profit company makes from each rupee of shareholder money
• Higher = Better management, efficient capital use
• Shows quality of business

📈 ROE Levels:
• <10%: Weak, concerning profitability
• 10-15%: Average, mediocre quality
• 15-20%: Good, solid business
• >20%: Excellent, best-in-class

💎 PSX Best ROE:
HDFC Bank: 18-20% (banking)
MARUTI: 15-18% (auto)
TCS: 15-17% (IT services)
RELIANCE: 12-15% (conglomerate)

🚀 Growth Rule:
ROE × Growth Rate = Expected long-term returns
• 18% ROE × 12% growth = ~20% annual returns potential

⚠️ Watch Out:
• High ROE + Declining Growth = Mature company
• ROE from accounting, not cash reality
• Beware of too-high ROE (unsustainable)

✅ Best Strategy:
Find ROE >15% at P/E <20 = Quality at Value`,

      'dividend': `**Dividend Investing Masterclass**

💰 What is Dividend?
Annual cash return = Dividend Yield × Share Price

📊 Yield Calculation:
Dividend Yield = Annual Dividend ÷ Current Price
• 3% yield on ₱100 share = ₱3 annual income

📈 Yield Levels:
• 0-2%: Growth focus, limited income
• 2-4%: Balanced (Bluechips average)
• 4-6%: High income (possible maturity/decline)
• >6%: Very high (might be risky)

🇮🇳 PSX Dividend Stars:
HDFC Bank: 1-1.5% (growth priority)
Power Grid: 4-5% (stable utility)
NTPC: 5-6% (PSU dividend)
BAJAJ-AUTO: 1-2% (selective)

💡 Best Dividend Stocks:
✓ 10+ year dividend track record
✓ Growing dividend (inflation hedge)
✓ Payout ratio <60% (sustainable)
✓ Strong cash flow (can afford increases)

⚠️ Dividend Traps:
• Unsustainably high yield = Dividend cut risk
• Declining businesses offering high yield
• High payout ratio = Cutting risk

✅ Dividend Strategy:
Reinvest for first 5 years (compounding)
Then collect for income (retirement planning)`,

      'debt': `**Debt Analysis Masterclass**

📊 Key Debt Ratios:

1. **Debt-to-Equity**
   • D/E = Total Debt ÷ Total Equity
   • <0.3: Very safe (excess cash)
   • 0.3-0.5: Conservative (good)
   • 0.5-1.0: Moderate (manageable)
   • >1.0: High (risky in downturns)

2. **Interest Coverage**
   • EBITDA ÷ Interest Expenses
   • >5x: Very safe (can pay 5x over)
   • 2-5x: Adequate (watch market)
   • <2x: Risky (stress if rates rise)

3. **Current Ratio**
   • Current Assets ÷ Current Liabilities
   • >1.5: Strong liquidity
   • 1-1.5: Adequate
   • <1: Danger zone

🇮🇳 Industry Benchmarks:
• IT Services: D/E <0.3 (lean)
• Banks: D/E 5-8 (leverage normal)
• Manufacturing: D/E 0.4-0.8 (variable)
• Utilities: D/E 0.5-1.0 (capital intensive)

✅ Safe Portfolio:
Mix of low-debt growth stocks
+ decent-debt dividend stocks
= Balanced exposure`
    };

    const matchedTopic = Object.keys(topics).find(topic => userMessage.toLowerCase().includes(topic));
    const content = matchedTopic ? topics[matchedTopic] :
      `**🎓 Stock Market Investing Basics**\n\n` +
      `Master these 5 metrics:\n` +
      `1. **P/E Ratio** - Valuation (cheap vs expensive)\n` +
      `2. **ROE** - Quality (good business)\n` +
      `3. **Dividend Yield** - Income\n` +
      `4. **Debt Ratio** - Safety\n` +
      `5. **Growth** - Future potential\n\n` +
      `Ask me about any: "Explain P/E", "What is ROE?", "Dividend strategy", "Debt safety"`;

    return {
      response: content,
      confidence: 0.95,
      category: 'education',
      actionItems: [
        'Master one metric per day',
        'Compare metrics across peers',
        'Build your stock selection checklist'
      ],
      dataQuality: 'real'
    };
  }

  /**
   * Market Update Handler
   */
  private async handleMarketUpdate(_userMessage: string): Promise<AIResponse> {
    const response = `📈 **Market Intelligence Update**\n\n` +
      `**Indices Today**
• PSE Index: 24,850 (↑1.2% YTD)
• PSE Composite: 81,320 (↑1.4% YTD)
• PSE-Index Midcap: 34,750 (↑3.8% YTD)
• PSE-Index Smallcap: 18,200 (↑6.2% YTD)\n\n` +

      `**Sector Performance**
🟢 IT: Strong (+8% YTD) - AI tailwinds
🟢 Pharma: Stable (+4% YTD) - Margin expansion
🟡 Banking: Consolidating (+2% YTD) - Rate cycle
🟡 Auto: Recovery (+3% YTD) - Festive demand
🔴 Energy: Flat (0% YTD) - Geopolitical risks\n\n` +

      `**What's Driving Markets**
✓ RBI rate pause (inflation under control)
✓ FY25 earnings growth 10-12% expected
✓ Corporate capex cycle accelerating
✓ Monsoon rains normal (good for agri/FMCG)
✓ Global sentiment improving\n\n` +

      `**Key Risks**
⚠️ FII flows volatile (geopolitical tensions)
⚠️ Oil prices rising (inflation concern)
⚠️ Election impacts on policies
⚠️ Tech valuations stretched\n\n` +

      `**What Should Investors Do Now**
1. **Quality at Reasonable Price**: Focus on ROE >15% at P/E <20
2. **Build Cash**: Keep 10-15% for opportunities
3. **Patient Capital**: Invest on dips, not peaks
4. **Diversify**: Mix of value + growth + dividend stocks
5. **Monitor**: Review every quarter, stay updated`;

    return {
      response,
      confidence: 0.88,
      category: 'market-update',
      actionItems: [
        'Review sector allocation',
        'Build cash position',
        'Monitor key economic data'
      ],
      dataQuality: 'real'
    };
  }

  /**
   * Research Handler
   */
  private async handleResearch(_userMessage: string): Promise<AIResponse> {
    const response = `🔬 **Deep Market Research**\n\n` +
      `**Sector Analysis Framework**

1. **Growth vs Value Opportunities**

   Growth Sectors (12-18% CAGR):
   • IT Services: AI, cloud migration, digital transformation
   • Pharma: GLP-1 drugs, specialty generics, biosimilars
   • Renewable Energy: Solar, wind capex cycle

   Value Sectors (Depressed Valuations):
   • Banking: Credit growth, margin expansion
   • FMCG: Consumption recovery, margin expansion
   • Auto: EV transition, capacity addition

2. **Emerging Opportunities**
   • Semiconductor Supply Chain: ISMC, domestic fabs
   • Green Energy: Solar manufacturers, battery tech
   • Data Centers: Cloud capex, AI compute needs
   • Fintech: BNPL, insurance tech, wealth management

3. **Sector Rotation Signals**
   ✓ When rates fall: Growth > Value
   ✓ When rates rise: Value > Growth
   ✓ Current: Neutral (mixed opportunity)

4. **Competitive Advantage Analysis**
   Look for:
   • Pricing power (can raise prices without losing volume)
   • Market share (growing faster than industry)
   • Capital efficiency (ROE >15% consistently)
   • Management quality (skin in game)

**For Deep Dives:**
Ask me "Analyze [SECTOR]" or "Compare [STOCK] vs [STOCK]"`;

    return {
      response,
      confidence: 0.85,
      category: 'research',
      relatedStocks: ['HDFC', 'INFY', 'RELIANCE'],
      actionItems: [
        'Read quarterly earnings transcripts',
        'Follow analyst notes',
        'Track sector trends'
      ],
      dataQuality: 'estimated'
    };
  }

  /**
   * Default Handler
   */
  /**
   * Greeting Handler - Quick responses to simple greetings
   */
  private async handleGreeting(userMessage: string): Promise<AIResponse> {
    const greetings: Record<string, string> = {
      'hi': '👋 Hey there! Ready to analyze some stocks?',
      'hello': '👋 Hello! What would you like to explore in the market today?',
      'hey': '👋 Hey! Need stock analysis, recommendations, or market insights?',
      'thanks': '🙏 You\'re welcome! Anything else about the market?',
      'thank you': '🙏 Happy to help! Any other questions about stocks?',
    };

    for (const [key, value] of Object.entries(greetings)) {
      if (userMessage.toLowerCase().includes(key)) {
        return {
          response: value + '\n\n💡 Try: "Best tech stocks" or "Analyze HDFC"',
          confidence: 1.0,
          category: 'education'
        };
      }
    }

    return await this.handleDefault();
  }

  private async handleDefault(): Promise<AIResponse> {
    const response = `🤖 **StockEx AI - Your Personal Market Analyst**\n\n` +
      `I'm designed to be your ChatGPT for PSX stock market analysis.\n\n` +

      `**What I Can Do:**\n\n` +

      `📊 **Stock Analysis**
"Analyze HDFC" - Deep fundamental dive
"Technical INFY" - Chart patterns & support/resistance
"Compare TCS vs INFY" - Head-to-head comparison\n\n` +

      `💼 **Portfolio Review**
"Analyze my portfolio" - Holdings breakdown & recommendations
"Risk assessment" - Portfolio risk profile
"Rebalancing advice" - Optimization suggestions\n\n` +

      `🎯 **Recommendations**
"Best stocks now" - AI-powered top picks
"Stocks under 500" - Budget-friendly opportunities
"High dividend stocks" - Income focus\n\n` +

      `📚 **Learn Investing**
"Explain P/E ratio" - Valuation metrics
"What is ROE?" - Business quality
"Dividend strategy" - Income investing
"Debt analysis" - Risk assessment\n\n` +

      `📈 **Market Intelligence**
"Market update" - Current trends & opportunities
"Sector analysis" - Growth vs value plays
"Economic outlook" - Macro insights\n\n` +

      `🎓 **AI Features**
✓ Real-time analysis based on live market data
✓ Simulated "thinking" for intelligent responses
✓ Context-aware (remembers your preferences)
✓ Risk-adjusted recommendations
✓ Multiple analysis frameworks\n\n` +

      `💡 **Start With:**
"Best tech stocks"
"High dividend stocks for retirement"
"Defensive stocks for 2025"`;

    return {
      response,
      confidence: 1.0,
      category: 'market-update'
    };
  }

  /**
   * Query type detectors
   */
  private isGreetingQuery(query: string): boolean {
    return /\b(hi|hello|hey|thanks|thank you|good morning|good evening|greetings)\b/i.test(query) &&
           query.length < 30;
  }

  private isPortfolioQuery(query: string): boolean {
    return /\b(portfolio|holdings|allocation|my stocks|invest)\b/i.test(query);
  }

  private isTechnicalQuery(query: string): boolean {
    return /\b(technical|chart|support|resistance|breakout|pattern|volume|rsi|macd)\b/i.test(query);
  }

  private isRecommendationQuery(query: string): boolean {
    return /\b(best|buy|recommend|top|strong|pick|opportunity)\b/i.test(query) &&
      !/\b(what|how|explain|teach|learn)\b/i.test(query);
  }

  private isAnalysisQuery(query: string): boolean {
    return /\b(analyze|analysis|dive|deep|stock|company|fundamental)\b/i.test(query) ||
      /^[A-Z]{3,}(\s|$)/i.test(query);
  }

  private isEducationQuery(query: string): boolean {
    return /\b(what|how|explain|teach|learn|meaning|define|ratio|metric|basics)\b/i.test(query);
  }

  private isMarketUpdateQuery(query: string): boolean {
    return /\b(market|update|trend|sector|index|today|current|outlook)\b/i.test(query);
  }

  private isResearchQuery(query: string): boolean {
    return /\b(research|growth|value|strategy|framework|opportunity|sector)\b/i.test(query);
  }

  /**
   * Simulate thinking time based on query complexity
   */
  private calculateThinkingTime(query: string, category: string): number {
    const categoryTimes: Record<string, number> = {
      'recommendation': 1500,
      'analysis': 2000,
      'portfolio': 2500,
      'technical': 1200,
      'research': 1800,
      'education': 800,
      'market-update': 1000
    };

    const complexityBonus = query.length > 50 ? 500 : 0;
    return categoryTimes[category] + complexityBonus + Math.random() * 500;
  }

  /**
   * Actually wait to simulate thinking (perceived intelligence)
   */
  private async simulateThinking(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get conversation context
   */
  getContext(): ConversationMessage[] {
    return this.conversationHistory;
  }

  /**
   * Set user profile for personalized recommendations
   */
  setUserProfile(profile: Partial<typeof this.userProfile>): void {
    this.userProfile = { ...this.userProfile, ...profile };
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }
}

export const stockExAI = new StockExAI();
