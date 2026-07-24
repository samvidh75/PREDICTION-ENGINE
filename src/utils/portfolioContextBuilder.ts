/**
 * Portfolio Context Builder
 * Enhances AI prompts with user's portfolio holdings and analysis
 */

import { portfolioStorage } from './portfolioStorage';

export interface PortfolioContext {
  hasPortfolio: boolean;
  totalInvested: number;
  currentValue: number;
  totalReturn: number;
  holdings: Array<{ ticker: string; quantity: number; allocation: number }>;
  riskAnalysis: string;
  concentrationWarning?: string;
}

/**
 * Build portfolio context for AI
 */
export async function buildPortfolioContext(userId: string = 'default'): Promise<PortfolioContext> {
  try {
    const portfolio = await portfolioStorage.getPortfolio(userId);

    if (!portfolio || portfolio.holdings.length === 0) {
      return {
        hasPortfolio: false,
        totalInvested: 0,
        currentValue: 0,
        totalReturn: 0,
        holdings: [],
        riskAnalysis: '',
      };
    }

    const stats = await portfolioStorage.getPortfolioStats(userId);

    // Generate risk analysis
    let riskAnalysis = `Portfolio Overview:\n`;
    riskAnalysis += `- Invested: ₱${stats.totalInvested.toLocaleString('en-PH')}\n`;
    riskAnalysis += `- Current Value: ₱${stats.currentValue.toLocaleString('en-PH')}\n`;
    riskAnalysis += `- Total Return: ${stats.totalReturnPercent > 0 ? '+' : ''}${stats.totalReturnPercent.toFixed(2)}%\n`;
    riskAnalysis += `- Holdings: ${stats.holdings.length} stocks\n`;

    if (stats.topGainer) {
      riskAnalysis += `- Top Gainer: ${stats.topGainer.ticker} (${stats.topGainer.gainPercent > 0 ? '+' : ''}${stats.topGainer.gainPercent.toFixed(2)}%)\n`;
    }
    if (stats.topLoser) {
      riskAnalysis += `- Top Loser: ${stats.topLoser.ticker} (${stats.topLoser.gainPercent.toFixed(2)}%)\n`;
    }

    // Concentration warning
    let concentrationWarning: string | undefined;
    if (stats.concentration.length > 0) {
      const concentrated = stats.concentration[0];
      concentrationWarning = `⚠️ CONCENTRATION RISK: ${concentrated.ticker} is ${concentrated.allocation.toFixed(1)}% of portfolio. Consider diversifying.`;
      riskAnalysis += `\n${concentrationWarning}`;
    }

    return {
      hasPortfolio: true,
      totalInvested: stats.totalInvested,
      currentValue: stats.currentValue,
      totalReturn: stats.totalReturn,
      holdings: stats.holdings.map((h) => ({
        ticker: h.ticker,
        quantity: h.quantity,
        allocation: h.allocation,
      })),
      riskAnalysis,
      concentrationWarning,
    };
  } catch (error) {
    console.warn('Failed to build portfolio context:', error);
    return {
      hasPortfolio: false,
      totalInvested: 0,
      currentValue: 0,
      totalReturn: 0,
      holdings: [],
      riskAnalysis: '',
    };
  }
}

/**
 * Enhance AI system prompt with portfolio context
 */
export function enhanceSystemPromptWithPortfolio(basePrompt: string, portfolioContext: PortfolioContext): string {
  if (!portfolioContext.hasPortfolio) {
    return basePrompt;
  }

  return (
    basePrompt +
    `\n\nUSER PORTFOLIO CONTEXT:
${portfolioContext.riskAnalysis}

When analyzing stocks, consider how they fit with the user's existing holdings:
- Risk level: ${portfolioContext.totalReturn > 0 ? 'Profitable portfolio, focus on growth' : 'Recovering portfolio, focus on stability'}
- Concentration: ${portfolioContext.holdings.length > 5 ? 'Well diversified' : 'Limited holdings, consider diversification'}
- Allocation: ${portfolioContext.holdings.map((h) => `${h.ticker} ${h.allocation.toFixed(1)}%`).join(', ')}

Provide personalized recommendations based on their existing holdings.`
  );
}

/**
 * Generate portfolio rebalancing suggestions
 */
export function generateRebalancingSuggestions(context: PortfolioContext): string {
  if (!context.hasPortfolio || context.holdings.length === 0) {
    return '';
  }

  let suggestions = '\n💡 PORTFOLIO REBALANCING SUGGESTIONS:\n';

  // Concentration risk
  const highAllocation = context.holdings.filter((h) => h.allocation > 20);
  if (highAllocation.length > 0) {
    suggestions += `\n⚠️ Over-concentrated: ${highAllocation.map((h) => `${h.ticker} (${h.allocation.toFixed(1)}%)`).join(', ')}\n`;
    suggestions += '   → Consider trimming to 15% or less\n';
  }

  // Diversification opportunity
  if (context.holdings.length < 5) {
    suggestions += `\n📊 Limited diversification (only ${context.holdings.length} holdings)\n`;
    suggestions += '   → Consider adding 5-10 holdings across sectors\n';
  }

  // Sector analysis placeholder
  suggestions += '\n📈 Next: Ask about specific sectors (IT, Banking, Pharma) to balance your portfolio\n';

  return suggestions;
}
