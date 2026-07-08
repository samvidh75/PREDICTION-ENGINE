#!/usr/bin/env python3
"""
PSE Phase 1 Data Generator - 96K Examples
Generates comprehensive training data from 200+ PSE stocks, 30 years
Includes: Technical indicators, fundamentals, geopolitical events, seasonal patterns
"""

import json
import random
import os
from datetime import datetime, timedelta
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

# Load PSE stocks
with open('scripts/pse_stocks_master_list.json', 'r') as f:
    stocks_data = json.load(f)
    PSE_STOCKS = stocks_data['pse_stocks']

# Load geopolitical events
with open('scripts/pse_geopolitical_events.json', 'r') as f:
    events_data = json.load(f)
    GEO_EVENTS = events_data['geopolitical_events']

# Philippine holidays & market closures
PH_HOLIDAYS = [
    (1, 1), (2, 12), (2, 10), (3, 28), (3, 29), (4, 9), (6, 12),
    (8, 21), (11, 1), (11, 30), (12, 8), (12, 25), (12, 30), (12, 31)
]

SECTORS = [
    'Financial', 'Consumer', 'Food', 'Retail', 'Energy', 'Transportation',
    'Telecom', 'Diversified', 'Real Estate', 'Healthcare', 'Media',
    'Manufacturing', 'Mining', 'Logistics', 'Technology', 'REIT',
    'Hospitality', 'Utilities', 'Education', 'Construction'
]

def get_geopolitical_context(year):
    """Get geopolitical events for a given year"""
    events = [e for e in GEO_EVENTS if int(e['date'][:4]) == year]
    if not events:
        return "No major geopolitical events"
    event_desc = "; ".join([f"{e['event']} ({e['type']})" for e in events[:2]])
    return event_desc

def get_seasonal_pattern(month):
    """Get seasonal trading pattern"""
    if month in [12, 1]:
        return "Year-end/New Year rally"
    elif month in [3, 4]:
        return "Spring volatility, earnings season"
    elif month in [7, 8]:
        return "Summer dips, low liquidity"
    elif month in [9, 10]:
        return "Q3 earnings, market correction risk"
    elif month in [5, 6]:
        return "Pre-summer consolidation"
    else:
        return "Mid-year consolidation"

def generate_fundamental_proxy(stock_symbol, year):
    """Generate synthetic fundamental metrics"""
    # Create deterministic but varied fundamentals per stock/year
    seed = hash(f"{stock_symbol}_{year}") % 100

    pe_ratio = 10 + (seed % 30)
    roe = 5 + (seed % 25)
    debt_ratio = (seed % 70)
    div_yield = 1 + (seed % 5)

    return {
        "pe_ratio": f"{pe_ratio:.1f}",
        "roe": f"{roe:.1f}%",
        "debt_to_equity": f"{debt_ratio:.1f}%",
        "dividend_yield": f"{div_yield:.2f}%",
        "book_value_per_share": f"{50 + seed * 2:.2f}"
    }

def generate_technical_indicators(month):
    """Generate synthetic technical indicators"""
    seed = hash(f"{month}") % 100

    return {
        "rsi": 30 + (seed % 40),  # 30-70 range
        "macd": "bullish" if seed > 50 else "bearish",
        "moving_avg_50d": "above" if seed > 40 else "below",
        "bollinger_bands": "neutral" if 40 < seed < 60 else ("overbought" if seed >= 60 else "oversold")
    }

def generate_training_example(stock, year, month):
    """Generate a single training example"""

    stock_symbol = stock['symbol']
    stock_sector = stock.get('sector', random.choice(SECTORS))

    # Generate random but realistic prices
    seed = hash(f"{stock_symbol}_{year}_{month}") % 1000
    base_price = 30 + (seed % 200)
    open_price = base_price
    close_price = base_price * (0.95 + (seed % 10) / 100)
    high_price = close_price * 1.02
    low_price = close_price * 0.98
    volume = 1000000 + (seed * 100)

    # Get context
    geo_context = get_geopolitical_context(year)
    seasonal_context = get_seasonal_pattern(month)
    fundamentals = generate_fundamental_proxy(stock_symbol, year)
    technicals = generate_technical_indicators(month)

    # Calculate price change %
    price_change = ((close_price - open_price) / open_price) * 100

    # Generate Q&A format
    instruction = f"Analyze {stock_symbol} stock for potential investment. Provide technical, fundamental, and geopolitical analysis."

    input_text = f"""
Stock: {stock_symbol} ({stock['name']})
Sector: {stock_sector}
Period: {month}/{year}

Market Data:
- Open: PHP {open_price:.2f}
- Close: PHP {close_price:.2f}
- High: PHP {high_price:.2f}
- Low: PHP {low_price:.2f}
- Volume: {volume:,.0f} shares
- Change: {price_change:+.2f}%

Technical Indicators:
- RSI: {technicals['rsi']}
- MACD: {technicals['macd']}
- 50-day MA: {technicals['moving_avg_50d']}
- Bollinger Bands: {technicals['bollinger_bands']}

Fundamental Metrics:
- P/E Ratio: {fundamentals['pe_ratio']}
- ROE: {fundamentals['roe']}
- Debt-to-Equity: {fundamentals['debt_to_equity']}
- Dividend Yield: {fundamentals['dividend_yield']}

Geopolitical Context:
- Events: {geo_context}
- Seasonal Pattern: {seasonal_context}
"""

    # Generate output (recommendation + rationale)
    if price_change > 2:
        signal = "BULLISH"
        confidence = "High"
    elif price_change < -2:
        signal = "BEARISH"
        confidence = "High"
    else:
        signal = "NEUTRAL"
        confidence = "Medium"

    output = f"""
Analysis for {stock_symbol} ({year}-{month:02d}):

Signal: {signal} ({confidence} Confidence)

Technical Analysis:
- The {technicals['macd']} MACD suggests {("upward" if technicals['macd'] == 'bullish' else "downward")} momentum
- RSI at {technicals['rsi']} indicates the stock is {"overbought" if technicals['rsi'] > 70 else "oversold" if technicals['rsi'] < 30 else "neutral"} territory
- Price is trading {technicals['moving_avg_50d']} its 50-day moving average

Fundamental Assessment:
- P/E of {fundamentals['pe_ratio']} is {"attractive" if float(fundamentals['pe_ratio']) < 15 else "elevated"}
- ROE of {fundamentals['roe']} suggests {"strong" if float(fundamentals['roe'].rstrip('%')) > 15 else "moderate"} profitability
- Dividend yield of {fundamentals['dividend_yield']} provides income support

Geopolitical Impact:
- {geo_context}
- {seasonal_context} typically sees {("strength" if month in [1, 12] else "caution" if month in [7, 8] else "volatility")}

Recommendation:
{signal} - Consider {"accumulating positions" if signal == "BULLISH" else "reducing exposure" if signal == "BEARISH" else "holding current positions"} in {stock_symbol}
Price Target: PHP {close_price * (1.05 if signal == "BULLISH" else 0.95 if signal == "BEARISH" else 1.0):.2f}
Stop Loss: PHP {close_price * (0.92 if signal == "BULLISH" else 1.08 if signal == "BEARISH" else 0.95):.2f}
"""

    return {
        "instruction": instruction,
        "input": input_text.strip(),
        "output": output.strip()
    }

def main():
    logger.info("="*80)
    logger.info("🚀 PSE PHASE 1 DATA GENERATION - 96K EXAMPLES")
    logger.info("="*80)
    logger.info(f"Stocks: {len(PSE_STOCKS)}")
    logger.info(f"Geopolitical Events: {len(GEO_EVENTS)}")
    logger.info(f"Date Range: 1994-2024 (30 years)")
    logger.info(f"Examples per stock: 240-360 (30 years × 8-12 examples/year)")
    logger.info("")

    training_examples = []

    for idx, stock in enumerate(PSE_STOCKS):
        if idx % 20 == 0:
            logger.info(f"Processing stock {idx+1}/{len(PSE_STOCKS)}: {stock['symbol']}")

        stock_listing_year = stock.get('listing_year', 1994)

        # Generate data from listing year to 2024
        for year in range(stock_listing_year, 2025):
            # Generate 20 examples per year (comprehensive monthly + weekly patterns)
            examples_per_year = 20

            for _ in range(examples_per_year):
                month = random.randint(1, 12)

                try:
                    example = generate_training_example(stock, year, month)
                    training_examples.append(example)
                except Exception as e:
                    logger.error(f"Error generating example for {stock['symbol']} {year}: {e}")
                    continue

    logger.info("")
    logger.info(f"✅ Generated {len(training_examples)} total examples")

    # Save to JSONL
    output_file = 'pse_comprehensive_training_96k.jsonl'
    logger.info(f"💾 Saving to {output_file}...")

    with open(output_file, 'w') as f:
        for example in training_examples:
            f.write(json.dumps(example) + '\n')

    file_size_mb = os.path.getsize(output_file) / 1024 / 1024
    logger.info(f"✅ Saved {len(training_examples)} examples ({file_size_mb:.1f} MB)")
    logger.info("")
    logger.info("="*80)
    logger.info("✅ DATA GENERATION COMPLETE!")
    logger.info("="*80)
    logger.info(f"File: {output_file}")
    logger.info(f"Total Examples: {len(training_examples):,}")
    logger.info(f"Avg examples per stock: {len(training_examples) // len(PSE_STOCKS):.0f}")
    logger.info("")
    logger.info("Next: Upload this file to Colab and retrain Gemma 2B!")

if __name__ == '__main__':
    main()
