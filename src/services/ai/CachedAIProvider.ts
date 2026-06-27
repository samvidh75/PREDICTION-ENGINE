import type { AIProvider, StockData, StockAnalysis, Thesis, Recommendation, StockComparison, ThesisValidity } from './AIProvider';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

function cacheKey(prefix: string, id: string): string {
  return `ai:${prefix}:${id}`;
}

export class CachedAIProvider implements AIProvider {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly defaultTTL: number;

  constructor(
    private inner: AIProvider,
    ttlMs = 5 * 60 * 1000,
  ) {
    this.defaultTTL = ttlMs;
  }

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private setCached<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, { data, expiresAt: Date.now() + (ttl ?? this.defaultTTL) });
  }

  private async withCache<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.getCached<T>(key);
    if (cached !== null) return cached;
    const result = await fn();
    this.setCached(key, result, ttl);
    return result;
  }

  async analyzeStock(stockData: StockData, depth?: 'quick' | 'detailed'): Promise<StockAnalysis> {
    return this.withCache(
      cacheKey('analyze', `${stockData.symbol}:${depth}`),
      () => this.inner.analyzeStock(stockData, depth),
      depth === 'quick' ? 10 * 60 * 1000 : 30 * 60 * 1000,
    );
  }

  async generateThesis(stockData: StockData, analysis: StockAnalysis): Promise<Thesis> {
    return this.withCache(
      cacheKey('thesis', stockData.symbol),
      () => this.inner.generateThesis(stockData, analysis),
      60 * 60 * 1000,
    );
  }

  async generateRecommendation(stockData: StockData, analysis: StockAnalysis, thesis: Thesis): Promise<Recommendation> {
    return this.withCache(
      cacheKey('rec', stockData.symbol),
      () => this.inner.generateRecommendation(stockData, analysis, thesis),
      60 * 60 * 1000,
    );
  }

  async compareStocks(stocks: StockData[]): Promise<StockComparison> {
    const ids = stocks.map(s => s.symbol).sort().join(',');
    return this.withCache(
      cacheKey('compare', ids),
      () => this.inner.compareStocks(stocks),
      30 * 60 * 1000,
    );
  }

  async chat(symbol: string, question: string, context: string): Promise<string> {
    return this.inner.chat(symbol, question, context);
  }

  async checkThesisValidity(symbol: string, originalThesis: Thesis, currentAnalysis: StockAnalysis): Promise<ThesisValidity> {
    return this.withCache(
      cacheKey('validity', symbol),
      () => this.inner.checkThesisValidity(symbol, originalThesis, currentAnalysis),
      15 * 60 * 1000,
    );
  }

  async generateMarketCommentary(topStocks: StockData[], marketTrend: string): Promise<string> {
    return this.inner.generateMarketCommentary(topStocks, marketTrend);
  }

  async generateBullBearCase(stockData: StockData, analysis: StockAnalysis): Promise<{ bullCase: string; bearCase: string }> {
    return this.withCache(
      cacheKey('bullbear', stockData.symbol),
      () => this.inner.generateBullBearCase(stockData, analysis),
      60 * 60 * 1000,
    );
  }

  async generateRiskTriggers(stockData: StockData, analysis: StockAnalysis): Promise<string[]> {
    return this.withCache(
      cacheKey('risktriggers', stockData.symbol),
      () => this.inner.generateRiskTriggers(stockData, analysis),
      30 * 60 * 1000,
    );
  }

  async generateWhatChanged(symbol: string, oldAnalysis: StockAnalysis, newAnalysis: StockAnalysis): Promise<string> {
    return this.inner.generateWhatChanged(symbol, oldAnalysis, newAnalysis);
  }

  async generatePeerComparison(stockData: StockData, peers: StockData[]): Promise<string> {
    return this.withCache(
      cacheKey('peers', stockData.symbol),
      () => this.inner.generatePeerComparison(stockData, peers),
      60 * 60 * 1000,
    );
  }

  async generateValuationExplanation(stockData: StockData, analysis: StockAnalysis): Promise<string> {
    return this.withCache(
      cacheKey('valuation', stockData.symbol),
      () => this.inner.generateValuationExplanation(stockData, analysis),
      60 * 60 * 1000,
    );
  }

  async generateEarningsSummary(symbol: string, financialData: Record<string, unknown>): Promise<string> {
    return this.withCache(
      cacheKey('earnings', symbol),
      () => this.inner.generateEarningsSummary(symbol, financialData),
      24 * 60 * 60 * 1000,
    );
  }

  async generateWatchlistAlert(symbol: string, reason: string, context: string): Promise<string> {
    return this.inner.generateWatchlistAlert(symbol, reason, context);
  }

  async explainFactorScore(factorName: string, score: number, data: Record<string, unknown>): Promise<string> {
    return this.withCache(
      cacheKey('factor', `${factorName}:${score}`),
      () => this.inner.explainFactorScore(factorName, score, data),
      60 * 60 * 1000,
    );
  }
}
