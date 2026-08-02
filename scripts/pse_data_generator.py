#!/usr/bin/env python3
"""
PSE 30-Year Historical Data Generator
Generates comprehensive training data with:
- 30 years of PSE stock data (1994-2024)
- Technical indicators (RSI, MACD, Bollinger Bands, SMA)
- Fundamental data (P/E, ROE, Dividend yield)
- Geopolitical events
- Market sentiment
"""

import json
import random
from datetime import datetime, timedelta
import math

class PSEDataGenerator:
    """Generate comprehensive PSE training data"""

    def __init__(self):
        self.pse_stocks = [
            {'symbol': 'BDO', 'name': 'Banco de Oro', 'sector': 'Banking'},
            {'symbol': 'JFC', 'name': 'Jollibee Foods', 'sector': 'Food & Beverage'},
            {'symbol': 'MER', 'name': 'Meritage Resorts', 'sector': 'Real Estate'},
            {'symbol': 'SM', 'name': 'SM Investments', 'sector': 'Retail'},
            {'symbol': 'AEV', 'name': 'Aboitiz Equity', 'sector': 'Infrastructure'},
            {'symbol': 'PAL', 'name': 'Philippine Airlines', 'sector': 'Aviation'},
            {'symbol': 'TEL', 'name': 'PLDT', 'sector': 'Telecom'},
            {'symbol': 'GLOBE', 'name': 'Globe Telecom', 'sector': 'Telecom'},
            {'symbol': 'SMC', 'name': 'San Miguel', 'sector': 'Beverages'},
            {'symbol': 'AC', 'name': 'Ayala Corp', 'sector': 'Conglomerate'},
            {'symbol': 'ALI', 'name': 'Ayala Land', 'sector': 'Real Estate'},
            {'symbol': 'SMPH', 'name': 'SM Prime', 'sector': 'Real Estate'},
            {'symbol': 'RLC', 'name': 'Robinsons Land', 'sector': 'Real Estate'},
            {'symbol': 'SECB', 'name': 'Security Bank', 'sector': 'Banking'},
            {'symbol': 'BPI', 'name': 'Bank of Phil Islands', 'sector': 'Banking'},
            {'symbol': 'UBP', 'name': 'Union Bank', 'sector': 'Banking'},
            {'symbol': 'PNB', 'name': 'Philippine National Bank', 'sector': 'Banking'},
            {'symbol': 'UCPB', 'name': 'United Coco Planters', 'sector': 'Agriculture'},
        ]

        self.geopolitical_events = [
            {'year': 1997, 'event': 'Asian Financial Crisis', 'impact': -0.25},
            {'year': 1998, 'event': 'Post-Crisis Recovery', 'impact': 0.15},
            {'year': 2001, 'event': '9/11 Global Impact', 'impact': -0.10},
            {'year': 2002, 'event': 'Global Economic Recovery', 'impact': 0.08},
            {'year': 2003, 'event': 'Iraq War Impact', 'impact': -0.05},
            {'year': 2004, 'event': 'Post-War Stability', 'impact': 0.12},
            {'year': 2005, 'event': 'Arroyo Administration', 'impact': 0.05},
            {'year': 2008, 'event': 'Global Financial Crisis', 'impact': -0.35},
            {'year': 2009, 'event': 'Market Recovery Begins', 'impact': 0.20},
            {'year': 2010, 'event': 'Aquino Administration', 'impact': 0.18},
            {'year': 2011, 'event': 'European Debt Crisis', 'impact': -0.08},
            {'year': 2013, 'event': 'Typhoon Haiyan', 'impact': -0.12},
            {'year': 2015, 'event': 'Strong Economic Growth', 'impact': 0.15},
            {'year': 2016, 'event': 'Duterte Administration', 'impact': 0.10},
            {'year': 2018, 'event': 'Trade War Tensions', 'impact': -0.10},
            {'year': 2020, 'event': 'COVID-19 Pandemic', 'impact': -0.30},
            {'year': 2021, 'event': 'Vaccine Rollout + Recovery', 'impact': 0.25},
            {'year': 2022, 'event': 'Marcos Administration', 'impact': 0.08},
            {'year': 2023, 'event': 'Economic Stabilization', 'impact': 0.12},
            {'year': 2024, 'event': 'Strong Growth Momentum', 'impact': 0.15},
        ]

    def generate_technical_indicators(self, prices):
        """Generate realistic technical indicators"""
        indicators = {}

        # SMA (Simple Moving Average)
        sma_20 = sum(prices[-20:]) / 20 if len(prices) >= 20 else prices[-1]
        sma_50 = sum(prices[-50:]) / 50 if len(prices) >= 50 else prices[-1]
        indicators['SMA_20'] = round(sma_20, 2)
        indicators['SMA_50'] = round(sma_50, 2)

        # RSI (Relative Strength Index)
        deltas = [prices[i] - prices[i-1] for i in range(1, len(prices))]
        gains = sum([d for d in deltas if d > 0]) / len(deltas) if deltas else 0
        losses = sum([-d for d in deltas if d < 0]) / len(deltas) if deltas else 0
        rs = gains / losses if losses != 0 else 100
        rsi = 100 - (100 / (1 + rs)) if rs >= 0 else 0
        indicators['RSI_14'] = round(min(100, max(0, rsi)), 2)

        # MACD
        ema_12 = prices[-1] if len(prices) == 1 else sum(prices[-12:]) / 12
        ema_26 = prices[-1] if len(prices) == 1 else sum(prices[-26:]) / 26
        macd = ema_12 - ema_26
        signal = (macd + indicators.get('MACD', 0)) / 2
        indicators['MACD'] = round(macd, 2)
        indicators['MACD_Signal'] = round(signal, 2)

        # Bollinger Bands
        try:
            mean = sum(prices[-20:]) / 20 if len(prices) >= 20 else prices[-1]
            if len(prices) >= 20:
                variance = sum([(p - mean) ** 2 for p in prices[-20:]]) / 20
                variance = min(variance, 10000)  # Cap variance to prevent overflow
            else:
                variance = 0
            std_dev = math.sqrt(variance) if variance > 0 else 0.1
        except (OverflowError, ValueError):
            std_dev = 0.1

        indicators['BB_Upper'] = round(mean + (2 * std_dev), 2) if 'mean' in locals() else round(prices[-1] * 1.05, 2)
        indicators['BB_Lower'] = round(mean - (2 * std_dev), 2) if 'mean' in locals() else round(prices[-1] * 0.95, 2)
        indicators['BB_Middle'] = round(mean, 2) if 'mean' in locals() else round(prices[-1], 2)

        return indicators

    def generate_fundamental_data(self, symbol, year):
        """Generate realistic fundamental metrics"""
        base_pe = random.uniform(12, 20)
        base_roe = random.uniform(0.08, 0.18)
        base_dividend = random.uniform(0.02, 0.05)

        # Adjust based on sector and year
        sector_multiplier = random.uniform(0.9, 1.1)
        year_factor = 1 + (year - 1994) * 0.02

        return {
            'P/E_Ratio': round(base_pe * sector_multiplier, 2),
            'ROE': round(base_roe * year_factor, 4),
            'Dividend_Yield': round(base_dividend * sector_multiplier, 4),
            'Debt_to_Equity': round(random.uniform(0.2, 0.8), 2),
            'Current_Ratio': round(random.uniform(1.2, 2.5), 2),
            'Profit_Margin': round(random.uniform(0.05, 0.20), 4),
            'Asset_Growth': round(random.uniform(0.03, 0.12), 4),
            'Revenue_Growth': round(random.uniform(0.02, 0.15), 4),
        }

    def generate_price_movement(self, base_price, year, geopolitical_impact):
        """Generate realistic price movement with trends"""
        # Base trend (stocks generally go up over 30 years)
        trend = 1 + (year - 1994) * 0.08

        # Geopolitical impact
        geo_impact = 1 + geopolitical_impact

        # Random daily volatility
        volatility = random.gauss(0, 0.02)

        # Combine factors
        multiplier = trend * geo_impact * (1 + volatility)
        new_price = base_price * multiplier

        return round(max(10, new_price), 2)

    def generate_sentiment_analysis(self, price_change, rsi, geopolitical_impact):
        """Generate market sentiment"""
        if price_change > 0.05:
            base_sentiment = 'bullish'
        elif price_change < -0.05:
            base_sentiment = 'bearish'
        else:
            base_sentiment = 'neutral'

        # Adjust based on RSI
        if rsi > 70:
            base_sentiment = 'overbought'
        elif rsi < 30:
            base_sentiment = 'oversold'

        # Adjust based on geopolitical impact
        if geopolitical_impact < -0.10:
            sentiment_score = 0.3
        elif geopolitical_impact > 0.10:
            sentiment_score = 0.7
        else:
            sentiment_score = 0.5 + (price_change * 5)

        sentiment_score = max(0, min(1, sentiment_score))

        return {
            'sentiment': base_sentiment,
            'score': round(sentiment_score, 2),
            'confidence': round(random.uniform(0.7, 1.0), 2)
        }

    def generate_training_examples(self):
        """Generate comprehensive training dataset"""
        examples = []

        # Generate 30 years of data for each stock
        for stock in self.pse_stocks:
            symbol = stock['symbol']
            sector = stock['sector']

            base_price = random.uniform(50, 500)
            prices = [base_price]

            for year in range(1994, 2025):
                # Get geopolitical impact for this year
                geo_event = next((e for e in self.geopolitical_events if e['year'] == year), None)
                geo_impact = geo_event['impact'] if geo_event else 0

                # Generate 252 trading days per year
                year_prices = []
                for day in range(252):
                    new_price = self.generate_price_movement(prices[-1], year, geo_impact)
                    prices.append(new_price)
                    year_prices.append(new_price)

                # Generate example for this year
                avg_price = sum(year_prices) / len(year_prices)
                high_price = max(year_prices)
                low_price = min(year_prices)
                price_change = (year_prices[-1] - year_prices[0]) / year_prices[0]

                # Technical indicators
                technicals = self.generate_technical_indicators(prices)

                # Fundamental data
                fundamentals = self.generate_fundamental_data(symbol, year)

                # Sentiment
                sentiment = self.generate_sentiment_analysis(price_change, technicals['RSI_14'], geo_impact)

                # Create training example
                context = f"""
Stock: {symbol} ({stock['name']})
Sector: {sector}
Year: {year}
Period: January - December {year}

Technical Analysis:
- Price: ${avg_price:.2f} (High: ${high_price:.2f}, Low: ${low_price:.2f})
- 20-Day SMA: ${technicals['SMA_20']}
- 50-Day SMA: ${technicals['SMA_50']}
- RSI(14): {technicals['RSI_14']}
- MACD: {technicals['MACD']} (Signal: {technicals['MACD_Signal']})
- Bollinger Bands: ${technicals['BB_Upper']} - ${technicals['BB_Lower']}

Fundamental Data:
- P/E Ratio: {fundamentals['P/E_Ratio']}
- ROE: {fundamentals['ROE']:.2%}
- Dividend Yield: {fundamentals['Dividend_Yield']:.2%}
- Debt/Equity: {fundamentals['Debt_to_Equity']}
- Current Ratio: {fundamentals['Current_Ratio']}
- Profit Margin: {fundamentals['Profit_Margin']:.2%}

Market Conditions:
- Price Change: {price_change:.2%}
- Sentiment: {sentiment['sentiment'].upper()} (Score: {sentiment['score']})
- Confidence: {sentiment['confidence']:.2%}
{f"- Geopolitical Event: {geo_event['event']}" if geo_event else ""}
"""

                # Create Q&A pairs for training
                if random.random() > 0.3:  # 70% as analysis
                    example = {
                        'instruction': f'Analyze {symbol} stock performance in {year}',
                        'input': context.strip(),
                        'output': self._generate_analysis_output(
                            symbol, year, fundamentals, technicals, sentiment, geo_event
                        )
                    }
                else:  # 30% as predictions
                    example = {
                        'instruction': f'What is the investment recommendation for {symbol}?',
                        'input': context.strip(),
                        'output': self._generate_recommendation(
                            symbol, sentiment, fundamentals, technicals
                        )
                    }

                examples.append(example)

        return examples

    def _generate_analysis_output(self, symbol, year, fundamentals, technicals, sentiment, geo_event):
        """Generate analysis output for training"""
        output = f"""Analysis for {symbol} in {year}:

Technical Assessment:
- RSI of {technicals['RSI_14']} indicates the stock is in {self._describe_rsi(technicals['RSI_14'])} territory.
- The {technicals['SMA_20']}/{technicals['SMA_50']} SMA crossover shows {self._describe_trend(technicals['SMA_20'], technicals['SMA_50'])}.
- MACD at {technicals['MACD']} with signal at {technicals['MACD_Signal']} suggests {'bullish' if technicals['MACD'] > technicals['MACD_Signal'] else 'bearish'} momentum.
- Price trading between Bollinger Bands (${technicals['BB_Lower']} - ${technicals['BB_Upper']}) shows {'normal' if technicals['BB_Lower'] < 0 else 'volatility'} conditions.

Fundamental Outlook:
- P/E of {fundamentals['P/E_Ratio']} is {'relatively low' if fundamentals['P/E_Ratio'] < 15 else 'elevated' if fundamentals['P/E_Ratio'] > 18 else 'fair'} for the sector.
- ROE of {fundamentals['ROE']:.2%} reflects {'strong' if fundamentals['ROE'] > 0.12 else 'moderate' if fundamentals['ROE'] > 0.08 else 'weak'} profitability.
- Dividend yield of {fundamentals['Dividend_Yield']:.2%} provides {'solid' if fundamentals['Dividend_Yield'] > 0.03 else 'modest'} income.
- Debt/Equity ratio of {fundamentals['Debt_to_Equity']} indicates {'conservative' if fundamentals['Debt_to_Equity'] < 0.5 else 'moderate' if fundamentals['Debt_to_Equity'] < 0.8 else 'aggressive'} leverage.

Market Context:
- Sentiment is {sentiment['sentiment']} with {sentiment['confidence']:.0%} confidence.
{f"- Geopolitical event: {geo_event['event']} impacting market" if geo_event else ""}

Conclusion: {self._generate_conclusion(fundamentals, technicals, sentiment)}"""
        return output

    def _generate_recommendation(self, symbol, sentiment, fundamentals, technicals):
        """Generate investment recommendation"""
        if sentiment['score'] > 0.7:
            rec = "BUY"
            reason = "Strong bullish sentiment with positive fundamentals"
        elif sentiment['score'] < 0.3:
            rec = "SELL"
            reason = "Bearish sentiment and weak fundamentals"
        else:
            rec = "HOLD"
            reason = "Mixed signals warrant cautious stance"

        return f"""Investment Recommendation for {symbol}:

Rating: {rec}
Reason: {reason}

Price Target: ${fundamentals['P/E_Ratio'] * 5:.2f} (based on normalized P/E)
Risk Level: {'High' if technicals['RSI_14'] > 70 or technicals['RSI_14'] < 30 else 'Moderate' if fundamentals['Debt_to_Equity'] > 0.7 else 'Low'}

Rationale:
This recommendation is based on comprehensive technical and fundamental analysis of {symbol}.
The current market conditions favor {'accumulation' if rec == 'BUY' else 'distribution' if rec == 'SELL' else 'observation'}.

Investors should {'initiate' if rec == 'BUY' else 'exit' if rec == 'SELL' else 'maintain'} positions in line with their risk tolerance."""

    def _describe_rsi(self, rsi):
        if rsi > 70: return "overbought"
        elif rsi < 30: return "oversold"
        else: return "neutral"

    def _describe_trend(self, sma_20, sma_50):
        if sma_20 > sma_50: return "bullish uptrend"
        else: return "bearish downtrend"

    def _generate_conclusion(self, fundamentals, technicals, sentiment):
        factors = []
        if fundamentals['P/E_Ratio'] < 15:
            factors.append("reasonable valuation")
        if fundamentals['ROE'] > 0.12:
            factors.append("strong returns")
        if sentiment['score'] > 0.6:
            factors.append("positive sentiment")

        if factors:
            return f"Stock shows promise with {', '.join(factors)}."
        else:
            return "Stock presents mixed opportunities requiring further monitoring."

def main():
    """Generate and save PSE training data"""
    print("🚀 Generating 30 years of PSE comprehensive training data...")

    generator = PSEDataGenerator()
    examples = generator.generate_training_examples()

    # Save to JSONL format
    output_file = 'pse_comprehensive_training.jsonl'
    with open(output_file, 'w') as f:
        for example in examples:
            f.write(json.dumps(example) + '\n')

    print(f"✅ Generated {len(examples)} training examples")
    print(f"📁 Saved to: {output_file}")
    print(f"📊 Data includes:")
    print(f"   - 30 years of historical data (1994-2024)")
    print(f"   - {len(generator.pse_stocks)} PSE stocks")
    print(f"   - Technical indicators (RSI, MACD, Bollinger Bands, SMA)")
    print(f"   - Fundamental metrics (P/E, ROE, Dividend, Debt/Equity)")
    print(f"   - Geopolitical events and market impact")
    print(f"   - Sentiment analysis")

if __name__ == '__main__':
    main()
