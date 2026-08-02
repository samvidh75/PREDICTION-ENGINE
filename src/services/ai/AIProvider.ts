export interface StockData {
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

export interface AnalysisScore {
  score: number;
  reasoning: string;
  factors: string[];
}

export interface StockAnalysis {
  symbol: string;
  quality: AnalysisScore;
  valuation: AnalysisScore;
  growth: AnalysisScore;
  technicals: AnalysisScore;
  risk: AnalysisScore;
}

export interface Thesis {
  bullCase: string;
  bearCase: string;
  investmentHorizon: string;
  keyRisks: string[];
  catalysts: string[];
}

export interface Recommendation {
  action: string;
  rating: number;
  conviction: number;
  targetPrice?: number;
  timeframe: string;
  riskReward: string;
}

export interface ThesisValidity {
  stillValid: boolean;
  changes: {
    bullCaseStatus: string;
    newRisks: string[];
    mitigatedRisks: string[];
    recommendation: string;
    updateRequired: boolean;
  };
}

export interface StockComparison {
  ranking: Array<{ symbol: string; score: number; reasoning: string }>;
  winner: string;
  summary: string;
}

export interface AIProvider {
  analyzeStock(stockData: StockData, depth?: 'quick' | 'detailed'): Promise<StockAnalysis>;
  generateThesis(stockData: StockData, analysis: StockAnalysis): Promise<Thesis>;
  generateRecommendation(stockData: StockData, analysis: StockAnalysis, thesis: Thesis): Promise<Recommendation>;
  compareStocks(stocks: StockData[]): Promise<StockComparison>;
  chat(symbol: string, question: string, context: string): Promise<string>;
  checkThesisValidity(symbol: string, originalThesis: Thesis, currentAnalysis: StockAnalysis): Promise<ThesisValidity>;
  generateMarketCommentary(topStocks: StockData[], marketTrend: string): Promise<string>;
  generateBullBearCase(stockData: StockData, analysis: StockAnalysis): Promise<{ bullCase: string; bearCase: string }>;
  generateRiskTriggers(stockData: StockData, analysis: StockAnalysis): Promise<string[]>;
  generateWhatChanged(symbol: string, oldAnalysis: StockAnalysis, newAnalysis: StockAnalysis): Promise<string>;
  generatePeerComparison(stockData: StockData, peers: StockData[]): Promise<string>;
  generateValuationExplanation(stockData: StockData, analysis: StockAnalysis): Promise<string>;
  generateEarningsSummary(symbol: string, financialData: Record<string, unknown>): Promise<string>;
  generateWatchlistAlert(symbol: string, reason: string, context: string): Promise<string>;
  explainFactorScore(factorName: string, score: number, data: Record<string, unknown>): Promise<string>;
}
