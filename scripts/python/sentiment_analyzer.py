#!/usr/bin/env python3
"""
Sentiment Analysis Engine
AI-powered sentiment analysis for news articles and social media
"""

import json
import sys
from typing import Dict, Any, List, Tuple
from dataclasses import dataclass
import re


@dataclass
class SentimentResult:
    sentiment: str  # BULLISH, NEUTRAL, BEARISH
    confidence: float  # 0-1
    score: float  # -1 to +1


class SentimentAnalyzer:
    """
    AI-powered sentiment analysis
    Can be enhanced with ML models (BERT, DistilBERT, etc.)
    """

    def __init__(self):
        # Sentiment dictionaries for keyword-based analysis
        self.bullish_keywords = {
            "strong": 0.8, "excellent": 0.9, "beat": 0.85, "outperform": 0.8,
            "growth": 0.7, "expand": 0.75, "record": 0.85, "surge": 0.8,
            "rally": 0.8, "gain": 0.7, "profit": 0.75, "success": 0.8,
            "upgrade": 0.85, "buy": 0.8, "bullish": 0.9, "positive": 0.7,
            "innovation": 0.75, "breakthrough": 0.9, "win": 0.8, "contract": 0.7
        }

        self.bearish_keywords = {
            "weak": -0.8, "poor": -0.85, "miss": -0.85, "underperform": -0.8,
            "decline": -0.7, "drop": -0.75, "loss": -0.8, "fail": -0.85,
            "crash": -0.9, "plunge": -0.85, "downgrade": -0.85, "sell": -0.8,
            "bearish": -0.9, "negative": -0.7, "challenge": -0.6, "risk": -0.65,
            "warning": -0.75, "concern": -0.65, "decrease": -0.7, "down": -0.65
        }

        self.neutral_keywords = {
            "stable": 0.0, "flat": 0.0, "mixed": 0.0, "unchanged": 0.0,
            "expects": 0.0, "guidance": 0.0, "announce": 0.0
        }

    def extract_entities(self, text: str) -> List[str]:
        """Extract entities from text"""
        # Simple entity extraction
        entities = []

        # Company names/tickers
        ticker_pattern = r'\b[A-Z]{1,5}\b'
        entities.extend(re.findall(ticker_pattern, text))

        # Numbers and percentages
        number_pattern = r'\d+(?:\.\d+)?%?'
        entities.extend(re.findall(number_pattern, text)[:10])  # Top 10

        return list(set(entities))

    def calculate_sentiment_score(self, text: str) -> SentimentResult:
        """
        Calculate sentiment score from text
        Can be enhanced with ML models for better accuracy
        """
        text_lower = text.lower()
        words = text_lower.split()

        total_score = 0.0
        matching_words = 0

        # Keyword matching
        for word in words:
            if word in self.bullish_keywords:
                total_score += self.bullish_keywords[word]
                matching_words += 1
            elif word in self.bearish_keywords:
                total_score += self.bearish_keywords[word]
                matching_words += 1

        # Calculate average sentiment
        if matching_words == 0:
            sentiment_score = 0.0
            confidence = 0.3  # Low confidence if no keywords found
        else:
            sentiment_score = total_score / matching_words
            confidence = min(0.95, matching_words / len(words))  # More words = higher confidence

        # Determine sentiment
        if sentiment_score > 0.3:
            sentiment = "BULLISH"
        elif sentiment_score < -0.3:
            sentiment = "BEARISH"
        else:
            sentiment = "NEUTRAL"

        return SentimentResult(
            sentiment=sentiment,
            confidence=confidence,
            score=sentiment_score
        )

    def analyze_articles(self, articles: List[str]) -> Dict[str, Any]:
        """
        Analyze multiple articles and aggregate sentiment
        """
        sentiments = []
        all_entities = []
        article_results = []

        for article in articles:
            result = self.calculate_sentiment_score(article)
            sentiments.append(result.score)
            entities = self.extract_entities(article)
            all_entities.extend(entities)

            article_results.append({
                "sentiment": result.sentiment,
                "confidence": round(result.confidence, 2),
                "score": round(result.score, 3),
                "entities": entities
            })

        # Aggregate results
        avg_sentiment_score = sum(sentiments) / len(sentiments) if sentiments else 0

        if avg_sentiment_score > 0.3:
            overall_sentiment = "BULLISH"
        elif avg_sentiment_score < -0.3:
            overall_sentiment = "BEARISH"
        else:
            overall_sentiment = "NEUTRAL"

        # Count occurrences
        from collections import Counter
        top_entities = Counter(all_entities).most_common(10)

        return {
            "overall_sentiment": overall_sentiment,
            "average_score": round(avg_sentiment_score, 3),
            "confidence": round(np.mean([r.confidence for r in sentiments]) if sentiments else 0, 2),
            "sentiment_distribution": {
                "bullish": sum(1 for s in sentiments if s > 0.3),
                "neutral": sum(1 for s in sentiments if -0.3 <= s <= 0.3),
                "bearish": sum(1 for s in sentiments if s < -0.3)
            },
            "top_entities": [entity for entity, _ in top_entities],
            "articles": article_results,
            "recommendations": self._generate_recommendations(overall_sentiment)
        }

    def _generate_recommendations(self, sentiment: str) -> List[str]:
        """Generate trading recommendations based on sentiment"""
        if sentiment == "BULLISH":
            return [
                "Positive sentiment: Consider increasing position",
                "Monitor for pullback opportunities",
                "Set stop-loss to protect gains"
            ]
        elif sentiment == "BEARISH":
            return [
                "Negative sentiment: Consider reducing position",
                "Watch for technical support levels",
                "Set tight stop-loss orders"
            ]
        else:
            return [
                "Mixed sentiment: Wait for clear signals",
                "Monitor for trend reversal",
                "Maintain current position"
            ]

    def analyze_trend(self, historical_sentiments: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze sentiment trend over time
        """
        if not historical_sentiments:
            return {"trend": "INSUFFICIENT_DATA"}

        scores = [s.get('score', 0) for s in historical_sentiments]
        dates = [s.get('date') for s in historical_sentiments]

        # Calculate trend
        if len(scores) >= 2:
            recent_avg = sum(scores[-5:]) / len(scores[-5:])
            older_avg = sum(scores[:5]) / len(scores[:5])
            trend_direction = "IMPROVING" if recent_avg > older_avg else "DETERIORATING"
        else:
            trend_direction = "UNCLEAR"

        return {
            "trend": trend_direction,
            "current_score": scores[-1] if scores else 0,
            "average_score": sum(scores) / len(scores) if scores else 0,
            "volatility": np.std(scores) if len(scores) > 1 else 0
        }


def main():
    """Process input and output sentiment analysis"""
    try:
        import numpy as np

        if len(sys.argv) > 1:
            data = json.loads(sys.argv[1])
        else:
            data = json.load(sys.stdin)

        articles = data.get('articles', [])
        ticker = data.get('ticker', 'UNKNOWN')

        if not articles:
            raise ValueError("No articles provided")

        analyzer = SentimentAnalyzer()
        result = analyzer.analyze_articles(articles)

        output = {
            'ticker': ticker,
            'analysis': result
        }

        print(json.dumps(output, indent=2))

    except Exception as e:
        print(json.dumps({
            'error': str(e),
            'status': 'failed'
        }, indent=2), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
