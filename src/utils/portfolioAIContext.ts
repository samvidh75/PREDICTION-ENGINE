/**
 * Portfolio-Aware AI Context
 * Builds user portfolio context for personalized AI recommendations
 */

import { portfolioStorage, type Portfolio, type Holding } from './portfolioStorage';

class PortfolioAIContext {
  /**
   * Get portfolio summary for AI context
   */
  async getPortfolioSummary(userId = 'default'): Promise<string> {
    try {
      const portfolio = await portfolioStorage.getPortfolio(userId);

      if (!portfolio || portfolio.holdings.length === 0) {
        return ''; // No portfolio context
      }

      const summary = this.buildPortfolioSummary(portfolio);
      return summary;
    } catch (error) {
      console.error('[Portfolio AI Context Error]', error);
      return '';
    }
  }

  /**
   * Build human-readable portfolio summary
   */
  private buildPortfolioSummary(portfolio: Portfolio): string {
    const holdings = portfolio.holdings;
    const totalInvested = portfolio.totalInvested;

    // Calculate allocation percentages
    const allocations = holdings.map((h) => ({
      ticker: h.ticker,
      percentage: ((h.quantity * h.buyPrice) / totalInvested) * 100,
      quantity: h.quantity,
      value: h.quantity * h.buyPrice,
    }));

    // Sort by allocation
    allocations.sort((a, b) => b.percentage - a.percentage);

    // Build summary
    let summary = 'User Portfolio Context:\n';
    summary += `Total Holdings: ${holdings.length} stocks\n`;
    summary += `Total Invested: ₹${Math.round(totalInvested).toLocaleString('en-IN')}\n\n`;

    summary += 'Current Allocation:\n';
    for (const alloc of allocations.slice(0, 5)) {
      // Top 5 holdings
      summary += `- ${alloc.ticker}: ${alloc.percentage.toFixed(1)}% (${alloc.quantity} shares, ₹${Math.round(alloc.value).toLocaleString('en-IN')})\n`;
    }

    if (allocations.length > 5) {
      const otherPercentage = allocations
        .slice(5)
        .reduce((sum, a) => sum + a.percentage, 0);
      summary += `- Others: ${otherPercentage.toFixed(1)}%\n`;
    }

    // Concentration analysis
    const topHoldingPercentage = allocations[0]?.percentage || 0;
    if (topHoldingPercentage > 40) {
      summary +=
        '\n⚠️ Portfolio is highly concentrated. Consider diversification.\n';
    } else if (topHoldingPercentage < 15) {
      summary += '\n✅ Portfolio is well diversified.\n';
    }

    // Sector analysis (basic, based on ticker patterns)
    const sectors = this.analyzeSectors(holdings);
    if (sectors.length > 0) {
      summary += '\nSector Exposure:\n';
      for (const sector of sectors.slice(0, 5)) {
        summary += `- ${sector.sector}: ${sector.count} holdings\n`;
      }
    }

    return summary;
  }

  /**
   * Basic sector analysis based on ticker
   */
  private analyzeSectors(holdings: Holding[]): Array<{ sector: string; count: number }> {
    const sectorMap: Map<string, number> = new Map();

    // Simplified sector mapping based on common Philippine stock patterns
    const sectorPatterns: Record<string, string> = {
      INFY: 'IT',
      TCS: 'IT',
      WIPRO: 'IT',
      HCLTECH: 'IT',
      HDFC: 'Banking',
      ICICIBANK: 'Banking',
      AXISBANK: 'Banking',
      SBIN: 'Banking',
      RELIANCE: 'Energy',
      ITC: 'FMCG',
      NESTLEIND: 'FMCG',
      LT: 'Infrastructure',
      MARUTI: 'Auto',
      TATAMOTORS: 'Auto',
    };

    for (const holding of holdings) {
      const sector = sectorPatterns[holding.ticker] || 'Other';
      sectorMap.set(sector, (sectorMap.get(sector) || 0) + 1);
    }

    return Array.from(sectorMap.entries())
      .map(([sector, count]) => ({ sector, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Check if user holds a specific stock
   */
  async holdsStock(ticker: string, userId = 'default'): Promise<boolean> {
    try {
      const portfolio = await portfolioStorage.getPortfolio(userId);
      if (!portfolio) return false;
      return portfolio.holdings.some((h) => h.ticker.toUpperCase() === ticker.toUpperCase());
    } catch {
      return false;
    }
  }

  /**
   * Get specific holding info
   */
  async getHolding(ticker: string, userId = 'default'): Promise<Holding | null> {
    try {
      const portfolio = await portfolioStorage.getPortfolio(userId);
      if (!portfolio) return null;
      return (
        portfolio.holdings.find((h) => h.ticker.toUpperCase() === ticker.toUpperCase()) || null
      );
    } catch {
      return null;
    }
  }

  /**
   * Build AI prompt enhancement with portfolio context
   */
  async buildPortfolioAwarePrompt(userQuestion: string, userId = 'default'): Promise<string> {
    const portfolioContext = await this.getPortfolioSummary(userId);

    if (!portfolioContext) {
      return userQuestion;
    }

    return `${portfolioContext}\n\nBased on the above portfolio context, answer the following question:\n${userQuestion}`;
  }

  /**
   * Check if question is about portfolio
   */
  isPortfolioQuestion(question: string): boolean {
    const patterns = [
      'portfolio',
      'my holdings',
      'my stocks',
      'should i buy',
      'should i sell',
      'add to portfolio',
      'remove from portfolio',
      'my allocation',
      'rebalance',
      'diversify',
    ];

    const lowerQuestion = question.toLowerCase();
    return patterns.some((pattern) => lowerQuestion.includes(pattern));
  }
}

// Export singleton
export const portfolioAIContext = new PortfolioAIContext();
