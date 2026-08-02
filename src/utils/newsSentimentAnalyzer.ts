/**
 * News Sentiment Analyzer
 * Analyzes stock-related news sentiment using AI
 */

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: Date;
  stocks: string[];
}

export interface SentimentAnalysis {
  article: NewsArticle;
  sentiment: 'bullish' | 'neutral' | 'bearish';
  score: number; // -1 to +1
  confidence: number; // 0 to 1
  summary: string;
}

class NewsSentimentAnalyzer {
  /**
   * Analyze sentiment of a news article
   */
  async analyzeSentiment(article: NewsArticle): Promise<SentimentAnalysis> {
    try {
      const response = await fetch('/api/analyze-news-sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article.title,
          summary: article.summary,
          stocks: article.stocks,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze sentiment');
      }

      const data = await response.json();

      return {
        article,
        sentiment: data.sentiment,
        score: data.score,
        confidence: data.confidence,
        summary: data.summary,
      };
    } catch (error) {
      // Fallback to basic keyword analysis
      console.error('[Sentiment Analysis Error]', error);
      return this.basicSentimentAnalysis(article);
    }
  }

  /**
   * Basic sentiment analysis using keyword matching
   */
  private basicSentimentAnalysis(article: NewsArticle): SentimentAnalysis {
    const text = `${article.title} ${article.summary}`.toLowerCase();

    const bullishWords = [
      'surge',
      'rally',
      'gain',
      'jump',
      'outperform',
      'growth',
      'profit',
      'strong',
      'positive',
      'beat',
      'upgrade',
    ];
    const bearishWords = [
      'crash',
      'plunge',
      'fall',
      'decline',
      'loss',
      'weak',
      'negative',
      'miss',
      'downgrade',
      'concern',
      'risk',
    ];

    let bullishCount = 0;
    let bearishCount = 0;

    bullishWords.forEach((word) => {
      bullishCount += (text.match(new RegExp(word, 'g')) || []).length;
    });

    bearishWords.forEach((word) => {
      bearishCount += (text.match(new RegExp(word, 'g')) || []).length;
    });

    const total = bullishCount + bearishCount;
    let sentiment: 'bullish' | 'neutral' | 'bearish' = 'neutral';
    let score = 0;

    if (total > 0) {
      score = (bullishCount - bearishCount) / total;
      sentiment = score > 0.2 ? 'bullish' : score < -0.2 ? 'bearish' : 'neutral';
    }

    return {
      article,
      sentiment,
      score,
      confidence: Math.min(total / 5, 1), // Normalize confidence
      summary: this.generateSummary(sentiment, bullishCount, bearishCount),
    };
  }

  /**
   * Generate sentiment summary
   */
  private generateSummary(
    sentiment: 'bullish' | 'neutral' | 'bearish',
    bullish: number,
    bearish: number
  ): string {
    const total = bullish + bearish;
    if (total === 0) return 'No clear sentiment detected.';

    const bullishPct = Math.round((bullish / total) * 100);
    const bearishPct = Math.round((bearish / total) * 100);

    if (sentiment === 'bullish') {
      return `Bullish sentiment detected (${bullishPct}% positive vs ${bearishPct}% negative). Positive news could drive stock appreciation.`;
    } else if (sentiment === 'bearish') {
      return `Bearish sentiment detected (${bearishPct}% negative vs ${bullishPct}% positive). Negative news could create downward pressure.`;
    } else {
      return `Neutral sentiment detected (mixed signals: ${bullishPct}% positive, ${bearishPct}% negative). Market impact unclear.`;
    }
  }

  /**
   * Analyze multiple articles and aggregate sentiment
   */
  async aggregateSentiment(articles: NewsArticle[]): Promise<{
    overallSentiment: 'bullish' | 'neutral' | 'bearish';
    averageScore: number;
    bullishCount: number;
    neutralCount: number;
    bearishCount: number;
    topArticles: SentimentAnalysis[];
  }> {
    const analyses = await Promise.all(articles.map((a) => this.analyzeSentiment(a)));

    const bullishCount = analyses.filter((a) => a.sentiment === 'bullish').length;
    const neutralCount = analyses.filter((a) => a.sentiment === 'neutral').length;
    const bearishCount = analyses.filter((a) => a.sentiment === 'bearish').length;

    const averageScore = analyses.reduce((sum, a) => sum + a.score, 0) / analyses.length;

    let overallSentiment: 'bullish' | 'neutral' | 'bearish' = 'neutral';
    if (averageScore > 0.2) {
      overallSentiment = 'bullish';
    } else if (averageScore < -0.2) {
      overallSentiment = 'bearish';
    }

    // Top 3 most confident articles
    const topArticles = analyses.sort((a, b) => b.confidence - a.confidence).slice(0, 3);

    return {
      overallSentiment,
      averageScore,
      bullishCount,
      neutralCount,
      bearishCount,
      topArticles,
    };
  }

  /**
   * Format sentiment for display
   */
  formatSentiment(
    sentiment: 'bullish' | 'neutral' | 'bearish'
  ): { emoji: string; label: string; color: string } {
    const formats = {
      bullish: { emoji: '📈', label: 'Bullish', color: '#27ae60' },
      neutral: { emoji: '➡️', label: 'Neutral', color: '#f39c12' },
      bearish: { emoji: '📉', label: 'Bearish', color: '#e74c3c' },
    };

    return formats[sentiment];
  }
}

// Export singleton
export const newsSentimentAnalyzer = new NewsSentimentAnalyzer();
