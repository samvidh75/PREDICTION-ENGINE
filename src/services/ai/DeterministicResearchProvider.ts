import type { AIProvider, StockData, StockAnalysis, Thesis, Recommendation, StockComparison, ThesisValidity } from './AIProvider';

function scoreToLabel(score: number): string {
  if (score >= 75) return 'Strong';
  if (score >= 60) return 'Favorable';
  if (score >= 40) return 'Neutral';
  if (score >= 25) return 'Caution';
  return 'Weak';
}

function defaultAnalysis(symbol: string): StockAnalysis {
  return {
    symbol,
    quality: { score: 50, reasoning: 'Insufficient data for quality assessment.', factors: [] },
    valuation: { score: 50, reasoning: 'Insufficient data for valuation assessment.', factors: [] },
    growth: { score: 50, reasoning: 'Insufficient data for growth assessment.', factors: [] },
    technicals: { score: 50, reasoning: 'Insufficient data for technical assessment.', factors: [] },
    risk: { score: 50, reasoning: 'Insufficient data for risk assessment.', factors: [] },
  };
}

function buildFactors(label: string, score: number, positive: string[], negative: string[]): string[] {
  const factors: string[] = [];
  if (score >= 60) factors.push(...positive.slice(0, 2));
  else factors.push(...negative.slice(0, 2));
  return factors;
}

export class DeterministicResearchProvider implements AIProvider {
  private computeQuality(data: StockData) {
    let score = 50;
    const pos: string[] = [];
    const neg: string[] = [];
    if (data.roe > 15) { score += 15; pos.push(`ROE of ${data.roe}% indicates strong returns`); }
    else if (data.roe < 5) { score -= 15; neg.push(`ROE of ${data.roe}% is below threshold`); }
    if (data.debtToEquity < 0.5) { score += 10; pos.push('Low debt-to-equity ratio'); }
    else if (data.debtToEquity > 1.5) { score -= 10; neg.push('High debt-to-equity ratio'); }
    if (data.profitMargin > 15) { score += 10; pos.push(`Profit margin of ${data.profitMargin}% is healthy`); }
    else if (data.profitMargin < 5) { score -= 10; neg.push(`Low profit margin of ${data.profitMargin}%`); }
    return { score: Math.min(100, Math.max(0, score)), pos, neg };
  }

  private computeValuation(data: StockData) {
    let score = 50;
    const pos: string[] = [];
    const neg: string[] = [];
    if (data.pe > 0 && data.pe < 15) { score += 15; pos.push(`P/E of ${data.pe} suggests undervaluation`); }
    else if (data.pe > 30) { score -= 15; neg.push(`P/E of ${data.pe} suggests premium valuation`); }
    if (data.pb > 0 && data.pb < 2) { score += 10; pos.push(`P/B of ${data.pb} is reasonable`); }
    else if (data.pb > 5) { score -= 10; neg.push(`P/B of ${data.pb} indicates high valuation`); }
    return { score: Math.min(100, Math.max(0, score)), pos, neg };
  }

  private computeGrowth(data: StockData) {
    let score = 50;
    const pos: string[] = [];
    const neg: string[] = [];
    if (data.revenueGrowth > 20) { score += 20; pos.push(`Revenue growing at ${data.revenueGrowth}%`); }
    else if (data.revenueGrowth > 10) { score += 10; pos.push(`Revenue growth of ${data.revenueGrowth}%`); }
    else if (data.revenueGrowth < 0) { score -= 20; neg.push('Revenue declining'); }
    return { score: Math.min(100, Math.max(0, score)), pos, neg };
  }

  private computeTechnicals(data: StockData) {
    let score = 50;
    const pos: string[] = [];
    const neg: string[] = [];
    if (data.rsi >= 30 && data.rsi <= 70) { score += 10; pos.push(`RSI of ${data.rsi} is in neutral zone`); }
    else if (data.rsi < 30) { score += 15; pos.push(`RSI of ${data.rsi} indicates oversold`); }
    else if (data.rsi > 70) { score -= 10; neg.push(`RSI of ${data.rsi} indicates overbought`); }
    return { score: Math.min(100, Math.max(0, score)), pos, neg };
  }

  private computeRisk(data: StockData) {
    let score = 50;
    const pos: string[] = [];
    const neg: string[] = [];
    if (data.debtToEquity > 1.5) { score -= 15; neg.push('Elevated debt levels increase risk'); }
    else if (data.debtToEquity < 0.3) { score += 10; pos.push('Conservative debt profile'); }
    if (data.currentRatio < 1) { score -= 10; neg.push('Current ratio below 1 indicates liquidity risk'); }
    else if (data.currentRatio > 2) { score += 10; pos.push('Strong liquidity position'); }
    if (data.profitMargin < 0) { score -= 15; neg.push('Negative profit margins'); }
    return { score: Math.min(100, Math.max(0, score)), pos, neg };
  }

  async analyzeStock(stockData: StockData, _depth?: 'quick' | 'detailed'): Promise<StockAnalysis> {
    const q = this.computeQuality(stockData);
    const v = this.computeValuation(stockData);
    const g = this.computeGrowth(stockData);
    const t = this.computeTechnicals(stockData);
    const r = this.computeRisk(stockData);
    return {
      symbol: stockData.symbol,
      quality: { score: q.score, reasoning: `${scoreToLabel(q.score)} quality based on fundamentals.`, factors: buildFactors('Quality', q.score, q.pos, q.neg) },
      valuation: { score: v.score, reasoning: `${scoreToLabel(v.score)} valuation based on multiples.`, factors: buildFactors('Valuation', v.score, v.pos, v.neg) },
      growth: { score: g.score, reasoning: `${scoreToLabel(g.score)} growth trajectory.`, factors: buildFactors('Growth', g.score, g.pos, g.neg) },
      technicals: { score: t.score, reasoning: `${scoreToLabel(t.score)} technical setup.`, factors: buildFactors('Technicals', t.score, t.pos, t.neg) },
      risk: { score: r.score, reasoning: `${scoreToLabel(r.score)} risk profile.`, factors: buildFactors('Risk', r.score, r.pos, r.neg) },
    };
  }

  async generateThesis(stockData: StockData, analysis: StockAnalysis): Promise<Thesis> {
    const overall = (analysis.quality.score + analysis.valuation.score + analysis.growth.score) / 3;
    const horizon = overall >= 60 ? '6-12 months' : overall >= 40 ? '3-6 months' : '1-2 years';
    const risks: string[] = [];
    if (analysis.risk.score < 40) risks.push(`Risk score of ${analysis.risk.score} suggests elevated uncertainty`);
    if (stockData.debtToEquity > 1.5) risks.push('High debt levels could pressure margins');
    if (stockData.revenueGrowth < 5) risks.push('Slowing revenue growth may limit upside');
    const catalysts: string[] = [];
    if (stockData.revenueGrowth > 15) catalysts.push('Strong revenue growth trajectory');
    if (stockData.roe > 15) catalysts.push('High return on equity indicates competitive advantage');
    if (analysis.valuation.score > 60) catalysts.push('Attractive valuation relative to fundamentals');
    return {
      bullCase: analysis.quality.score >= 60
        ? `${stockData.symbol} shows ${scoreToLabel(analysis.quality.score)} fundamentals with ${scoreToLabel(analysis.growth.score)} growth. Current valuation ${analysis.valuation.score >= 60 ? 'appears reasonable' : 'requires monitoring'}.`
        : `Research indicates ${stockData.symbol} has areas to monitor. Key metrics suggest watching for catalysts to build conviction.`,
      bearCase: analysis.risk.score < 40
        ? `${stockData.symbol} faces headwinds. Risk score of ${analysis.risk.score} suggests caution. Monitor debt levels and margin trends.`
        : `No significant bearish signals detected. Continue monitoring sector trends and quarterly results.`,
      investmentHorizon: horizon,
      keyRisks: risks.length > 0 ? risks : ['Broad market or sector downturns could affect performance'],
      catalysts: catalysts.length > 0 ? catalysts : ['Continued execution on business strategy'],
    };
  }

  async generateRecommendation(stockData: StockData, analysis: StockAnalysis, thesis: Thesis): Promise<Recommendation> {
    const overall = (analysis.quality.score + analysis.valuation.score + analysis.growth.score) / 3;
    const rating = Math.round(overall);
    const action = rating >= 65 ? 'BUY' : rating >= 40 ? 'HOLD' : 'SELL';
    const conviction = Math.round(Math.min(100, Math.abs(rating - 50) * 2 + 30));
    return {
      action,
      rating,
      conviction,
      timeframe: thesis.investmentHorizon,
      riskReward: rating >= 60 ? 'favorable' : rating >= 40 ? 'neutral' : 'unfavorable',
    };
  }

  async compareStocks(stocks: StockData[]): Promise<StockComparison> {
    const analyzed = await Promise.all(stocks.map(s => this.analyzeStock(s)));
    const scoring = analyzed.map(a => ({
      symbol: a.symbol,
      score: Math.round((a.quality.score + a.valuation.score + a.growth.score + a.technicals.score) / 4),
      reasoning: `${a.quality.reasoning} ${a.growth.reasoning}`,
    }));
    scoring.sort((a, b) => b.score - a.score);
    return {
      ranking: scoring,
      winner: scoring[0]?.symbol || '',
      summary: `Comparison across ${stocks.length} stocks. Top pick: ${scoring[0]?.symbol} with composite score of ${scoring[0]?.score}.`,
    };
  }

  async chat(_symbol: string, question: string, _context: string): Promise<string> {
    return `Research basis: ${question}. Please refer to the fundamental data and analysis tabs for detailed insights.`;
  }

  async checkThesisValidity(_symbol: string, originalThesis: Thesis, currentAnalysis: StockAnalysis): Promise<ThesisValidity> {
    const avgOld = 50;
    const avgNew = (currentAnalysis.quality.score + currentAnalysis.valuation.score + currentAnalysis.growth.score) / 3;
    const scoreChange = avgNew - avgOld;
    return {
      stillValid: Math.abs(scoreChange) < 15,
      changes: {
        bullCaseStatus: scoreChange > 5 ? 'Strengthened' : scoreChange < -5 ? 'Weakened' : 'Still holding',
        newRisks: currentAnalysis.risk.score < 40 ? ['Deteriorating risk metrics'] : [],
        mitigatedRisks: [],
        recommendation: scoreChange > 10 ? 'continue' : scoreChange < -15 ? 'exit' : 'continue',
        updateRequired: Math.abs(scoreChange) > 10,
      },
    };
  }

  async generateMarketCommentary(topStocks: StockData[], marketTrend: string): Promise<string> {
    return `Market trend: ${marketTrend}. Top movers include ${topStocks.slice(0, 3).map(s => `${s.symbol} (${s.changePercent}%)`).join(', ')}.`;
  }

  async generateBullBearCase(stockData: StockData, analysis: StockAnalysis): Promise<{ bullCase: string; bearCase: string }> {
    const bull: string[] = [];
    const bear: string[] = [];
    if (analysis.quality.score >= 60) bull.push(`Quality score of ${analysis.quality.score} suggests strong fundamentals`);
    if (analysis.growth.score >= 60) bull.push(`Growth score of ${analysis.growth.score} reflects revenue momentum`);
    if (analysis.valuation.score >= 60) bull.push(`Valuation score of ${analysis.valuation.score} indicates room for upside`);
    if (analysis.risk.score < 40) bear.push(`Risk score of ${analysis.risk.score} signals caution`);
    if (stockData.debtToEquity > 1.5) bear.push('High debt levels may constrain growth');
    if (stockData.revenueGrowth < 0) bear.push('Declining revenue needs monitoring');
    return {
      bullCase: bull.length > 0 ? bull.join('. ') : 'Fundamental metrics indicate a neutral outlook. Monitor for catalysts.',
      bearCase: bear.length > 0 ? bear.join('. ') : 'No significant bearish signals detected.',
    };
  }

  async generateRiskTriggers(stockData: StockData, analysis: StockAnalysis): Promise<string[]> {
    const triggers: string[] = [];
    if (analysis.quality.score < 40) triggers.push(`Quality score dropped to ${analysis.quality.score}`);
    if (analysis.risk.score > 70) triggers.push(`Risk score elevated at ${analysis.risk.score}`);
    if (stockData.debtToEquity > 2) triggers.push('Debt-to-equity crossed 2x threshold');
    if (stockData.currentRatio < 0.8) triggers.push('Current ratio below 0.8x');
    if (triggers.length === 0) triggers.push('No active risk triggers at this time');
    return triggers;
  }

  async generateWhatChanged(symbol: string, _oldAnalysis: StockAnalysis, _newAnalysis: StockAnalysis): Promise<string> {
    return `${symbol}: Key metrics show change. Review the score breakdown for details.`;
  }

  async generatePeerComparison(stockData: StockData, peers: StockData[]): Promise<string> {
    const allPeers = [stockData, ...peers];
    const byPE = [...allPeers].sort((a, b) => a.pe - b.pe);
    const byGrowth = [...allPeers].sort((a, b) => b.revenueGrowth - a.revenueGrowth);
    return `${stockData.symbol} ranks ${byPE.findIndex(p => p.symbol === stockData.symbol) + 1}/${allPeers.length} by P/E and ${byGrowth.findIndex(p => p.symbol === stockData.symbol) + 1}/${allPeers.length} by revenue growth among peers.`;
  }

  async generateValuationExplanation(stockData: StockData, analysis: StockAnalysis): Promise<string> {
    return `${stockData.symbol} trades at P/E of ${stockData.pe} and P/B of ${stockData.pb}. Valuation score of ${analysis.valuation.score}/100. ${analysis.valuation.score >= 60 ? 'Valuation appears reasonable' : 'Valuation suggests caution'}.`;
  }

  async generateEarningsSummary(symbol: string, _financialData: Record<string, unknown>): Promise<string> {
    return `${symbol}: Earnings data available in financial statements. Check quarterly reports for detailed analysis.`;
  }

  async generateWatchlistAlert(symbol: string, reason: string, _context: string): Promise<string> {
    return `${symbol}: ${reason}`;
  }

  async explainFactorScore(factorName: string, score: number, _data: Record<string, unknown>): Promise<string> {
    return `${factorName} score of ${score}/100. This reflects the current assessment based on available fundamental data.`;
  }
}
