/**
 * News Context Builder
 * Enhances AI prompts with latest market news and sentiment
 */

import { newsService } from './newsService';

export interface EnhancedNewsContext {
  ticker: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  sentimentScore: number;
  newsHeadlines: string[];
  newsAnalysis: string;
  buySignal: boolean;
  sellSignal: boolean;
}

/**
 * Build news context for a ticker
 */
export async function buildNewsContextForTicker(ticker: string): Promise<EnhancedNewsContext> {
  try {
    const newsContext = await newsService.getNewsForTicker(ticker);

    const headlines = newsContext.recentNews.map((article) => `${article.title} (${article.source})`);

    // Generate news analysis
    let newsAnalysis = '';
    if (newsContext.newsCount > 0) {
      newsAnalysis = `Recent News for ${ticker}:\n`;
      newsAnalysis += `Sentiment: ${newsContext.sentiment.toUpperCase()} (${(newsContext.sentimentScore * 100).toFixed(0)}%)\n`;
      newsAnalysis += `Headlines:\n`;
      headlines.slice(0, 3).forEach((h) => {
        newsAnalysis += `- ${h}\n`;
      });
    } else {
      newsAnalysis = `No recent news for ${ticker}`;
    }

    // Determine buy/sell signals based on sentiment
    const buySignal = newsContext.sentiment === 'bullish' && newsContext.sentimentScore > 0.3;
    const sellSignal = newsContext.sentiment === 'bearish' && newsContext.sentimentScore < -0.3;

    return {
      ticker,
      sentiment: newsContext.sentiment,
      sentimentScore: newsContext.sentimentScore,
      newsHeadlines: headlines,
      newsAnalysis,
      buySignal,
      sellSignal,
    };
  } catch (error) {
    console.warn(`Failed to build news context for ${ticker}:`, error);
    return {
      ticker,
      sentiment: 'neutral',
      sentimentScore: 0,
      newsHeadlines: [],
      newsAnalysis: `Unable to fetch news for ${ticker}`,
      buySignal: false,
      sellSignal: false,
    };
  }
}

/**
 * Enhance AI system prompt with news context
 */
export function enhanceSystemPromptWithNews(basePrompt: string, newsContexts: EnhancedNewsContext[]): string {
  if (newsContexts.length === 0 || newsContexts.every((n) => n.newsHeadlines.length === 0)) {
    return basePrompt;
  }

  let newsSection = '\n\nRECENT MARKET NEWS & SENTIMENT:';

  const bullishStocks = newsContexts.filter((n) => n.buySignal).map((n) => n.ticker);
  const bearishStocks = newsContexts.filter((n) => n.sellSignal).map((n) => n.ticker);

  if (bullishStocks.length > 0) {
    newsSection += `\n📈 Bullish Sentiment: ${bullishStocks.join(', ')}`;
  }

  if (bearishStocks.length > 0) {
    newsSection += `\n📉 Bearish Sentiment: ${bearishStocks.join(', ')}`;
  }

  newsContexts.forEach((news) => {
    if (news.newsHeadlines.length > 0) {
      newsSection += `\n\n${news.ticker}:`;
      newsSection += `\n- Sentiment: ${news.sentiment} (${(news.sentimentScore * 100).toFixed(0)}%)`;
      news.newsHeadlines.slice(0, 2).forEach((h) => {
        newsSection += `\n- ${h}`;
      });
    }
  });

  newsSection += '\n\nIncorporate this news sentiment into your analysis.';
  newsSection += '\nIf asking about price predictions, consider recent news trends.';
  newsSection += '\nBullish news supports higher valuations, bearish news warrants caution.';

  return basePrompt + newsSection;
}

/**
 * Get news-based trading signals
 */
export function generateNewsTradingSignals(newsContexts: EnhancedNewsContext[]): string {
  const bullish = newsContexts.filter((n) => n.buySignal);
  const bearish = newsContexts.filter((n) => n.sellSignal);

  if (bullish.length === 0 && bearish.length === 0) {
    return '';
  }

  let signals = '\n\n💡 NEWS-BASED TRADING SIGNALS:\n';

  if (bullish.length > 0) {
    signals += `\n🟢 BULLISH (positive news sentiment):\n`;
    bullish.forEach((stock) => {
      signals += `  ${stock.ticker}: ${stock.newsHeadlines[0]}\n`;
    });
  }

  if (bearish.length > 0) {
    signals += `\n🔴 BEARISH (negative news sentiment):\n`;
    bearish.forEach((stock) => {
      signals += `  ${stock.ticker}: ${stock.newsHeadlines[0]}\n`;
    });
  }

  signals += '\n⚠️ Disclaimer: News sentiment is one factor. Always verify with fundamentals.';

  return signals;
}
