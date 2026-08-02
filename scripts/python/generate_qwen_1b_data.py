#!/usr/bin/env python3
"""
Generate Qwen 1B training data (60,000 analysis examples)
from templates in QWEN_TRAINING_DATASETS_DETAILED.md
"""

import json
import random
import os

random.seed(42)

TICKERS = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "HINDUNILVR",
           "ITC", "SBIN", "BHARTIARTL", "KOTAKBANK", "LT", "AXISBANK",
           "BAJFINANCE", "MARUTI", "TITAN", "SUNPHARMA", "WIPRO",
           "ADANIENT", "NTPC", "M&M", "NESTLEIND", "ULTRACEMCO", "HCLTECH",
           "TATAMOTORS", "TATASTEEL", "ASIANPAINT", "DIVISLAB", "DRREDDY",
           "BRITANNIA", "EICHERMOT", "BPCL", "IOC", "ONGC", "GRASIM",
           "HINDALCO", "CIPLA", "HEROMOTOCO", "BAJAJFINSV", "TECHM",
           "INDUSINDBK", "JSWSTEEL", "ADANIPORTS", "POWERGRID", "COALINDIA"]

SECTORS = {
    "RELIANCE": "Energy & Telecom", "TCS": "IT Services", "HDFCBANK": "Banking",
    "INFY": "IT Services", "ICICIBANK": "Banking", "HINDUNILVR": "FMCG",
    "ITC": "FMCG", "SBIN": "Banking", "BHARTIARTL": "Telecom",
    "KOTAKBANK": "Banking", "LT": "Engineering", "AXISBANK": "Banking",
    "BAJFINANCE": "NBFC", "MARUTI": "Automobile", "TITAN": "Retail",
    "SUNPHARMA": "Pharma", "WIPRO": "IT Services", "ADANIENT": "Conglomerate",
    "NTPC": "Power", "M&M": "Automobile", "NESTLEIND": "FMCG",
    "ULTRACEMCO": "Cement", "HCLTECH": "IT Services", "TATAMOTORS": "Automobile",
    "TATASTEEL": "Metals", "ASIANPAINT": "Consumer Goods", "DIVISLAB": "Pharma",
    "DRREDDY": "Pharma", "BRITANNIA": "FMCG", "EICHERMOT": "Automobile",
    "BPCL": "Oil & Gas", "IOC": "Oil & Gas", "ONGC": "Oil & Gas",
    "GRASIM": "Cement", "HINDALCO": "Metals", "CIPLA": "Pharma",
    "HEROMOTOCO": "Automobile", "BAJAJFINSV": "Financial Services",
    "TECHM": "IT Services", "INDUSINDBK": "Banking", "JSWSTEEL": "Metals",
    "ADANIPORTS": "Infrastructure", "POWERGRID": "Power", "COALINDIA": "Mining"
}

SYSTEM_PROMPT = (
    "You are StockEX, a helpful, friendly, and knowledgeable AI assistant "
    "specialised in Indian stock market research. You speak naturally and "
    "conversationally. You provide accurate financial information but NEVER "
    "give personalised investment advice. You always include SEBI disclaimers "
    "when discussing investments. You are not a SEBI-registered advisor."
)

records = []

# ── Category 1: Stock Comparisons (10,000) ──
comparison_templates = [
    "Compare {a} and {b}. Which is better for long-term investment?",
    "Should I invest in {a} or {b}? Give detailed comparison.",
    "{a} vs {b}: Which stock provides better returns?",
    "Compare fundamentals of {a} and {b}.",
    "Which is more undervalued: {a} or {b}?",
]

for _ in range(10000):
    t1, t2 = random.sample(TICKERS, 2)
    sector1 = SECTORS.get(t1, "various")
    sector2 = SECTORS.get(t2, "various")
    template = random.choice(comparison_templates)
    question = template.format(a=t1, b=t2)

    answer = (
        f"**{t1} vs {t2} Comparison:**\n\n"
        f"**{t1} ({sector1}):**\n"
        f"- A leading company in the {sector1} sector\n"
        f"- Strong market position with consistent financial performance\n"
        f"- Key metrics to evaluate: revenue growth, profit margins, debt levels\n\n"
        f"**{t2} ({sector2}):**\n"
        f"- A notable player in the {sector2} sector\n"
        f"- Has shown resilience in its business model\n"
        f"- Compare P/E ratios, ROE, and debt-to-equity with sector averages\n\n"
        f"**Key Comparison Points:**\n"
        f"✓ Compare P/E ratios with sector averages\n"
        f"✓ Evaluate revenue growth over past 3-5 years\n"
        f"✓ Check debt levels and interest coverage\n"
        f"✓ Review promoter holding and corporate governance\n\n"
        f"Rather than picking one, consider how each fits your portfolio's sector allocation. "
        f"For personalised advice, consult a SEBI-registered advisor.\n\n"
        f"[SEBI DISCLAIMER: This is educational analysis, not investment advice.]"
    )

    records.append({
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": question},
            {"role": "assistant", "content": answer}
        ]
    })

# ── Category 2: Technical Analysis (8,000) ──
technical_setups = [
    ("bullish breakout", "RSI is showing strength above 60, MACD has turned positive, and price is above both 50-day and 200-day moving averages. Volume is confirming the move.", "Look for buying opportunities on pullbacks to support levels."),
    ("oversold bounce", "RSI is below 30 indicating oversold conditions. MACD histogram is narrowing. Price is near the lower Bollinger Band. Stochastic is showing a bullish crossover.", "Watch for a bounce from support levels. First target is the 20-day moving average."),
    ("range-bound consolidation", "Price is trading between well-defined support and resistance levels. RSI is in the 40-60 range. Bollinger Bands are contracting. Volume is declining during the consolidation.", "Wait for a breakout above resistance or breakdown below support before taking a position."),
    ("bearish breakdown", "RSI has broken below 40. MACD has turned negative. Price has fallen below both 20-day and 50-day moving averages. Volume is increasing on the down moves.", "Consider reducing positions or setting tighter stop-losses. First support is at recent lows."),
    ("moving average crossover", "The 20-day moving average has crossed above the 50-day moving average (golden cross). This is a bullish signal. RSI is in the 50-65 range with room to run.", "This is a medium-term bullish signal. Look to add on dips to the rising moving averages."),
]

for _ in range(8000):
    ticker = random.choice(TICKERS)
    setup, analysis, action = random.choice(technical_setups)
    price = random.randint(100, 5000)
    support = int(price * random.uniform(0.82, 0.95))
    resistance = int(price * random.uniform(1.05, 1.25))

    question = random.choice([
        f"Analyze the technical setup for {ticker}. What are the key levels?",
        f"What does the {ticker} chart tell us right now?",
        f"Technical analysis of {ticker} - is it in uptrend or downtrend?",
    ])

    answer = (
        f"**{ticker} Technical Analysis:**\n\n"
        f"Current Price: ₹{price}\n\n"
        f"**Setup: {setup.title()}**\n"
        f"{analysis}\n\n"
        f"**Key Levels:**\n"
        f"- Support: ₹{support}\n"
        f"- Resistance: ₹{resistance}\n\n"
        f"**Strategy:**\n"
        f"{action}\n\n"
        f"Remember that technical analysis is just one tool. Combine with fundamental analysis "
        f"for better decision-making.\n\n"
        f"[SEBI DISCLAIMER: This is educational technical analysis, not trading advice.]"
    )

    records.append({
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": question},
            {"role": "assistant", "content": answer}
        ]
    })

# ── Category 3: Fundamental Analysis (7,000) ──
for _ in range(7000):
    ticker = random.choice(TICKERS)
    sector = SECTORS.get(ticker, "various")
    pe = round(random.uniform(12, 45), 1)
    roe = round(random.uniform(10, 30), 1)
    de = round(random.uniform(0.1, 2.5), 2)
    price = random.randint(100, 5000)
    market_cap = random.choice(["₹1,00,000 Cr", "₹5,00,000 Cr", "₹10,00,000 Cr", "₹50,000 Cr"])

    question = random.choice([
        f"Should I invest in {ticker}? Give detailed fundamental analysis.",
        f"Analyze {ticker} fundamentals. Is it a good buy?",
        f"Fundamental analysis of {ticker} - should I hold or sell?",
    ])

    answer = (
        f"**{ticker} Fundamental Analysis:**\n\n"
        f"**Company Overview:**\n"
        f"- Sector: {sector}\n"
        f"- Market Cap: {market_cap}\n"
        f"- Current Price: ₹{price}\n\n"
        f"**Key Financial Metrics:**\n"
        f"- P/E Ratio: {pe} {'(below sector average)' if pe < 20 else '(near sector average)' if pe < 30 else '(above sector average)'}\n"
        f"- ROE: {roe}% {'(strong)' if roe > 20 else '(moderate)' if roe > 15 else '(needs improvement)'}\n"
        f"- Debt-to-Equity: {de} {'(low debt, healthy)' if de < 0.8 else '(moderate)' if de < 1.5 else '(high leverage - monitor)'}\n\n"
        f"**Strengths:**\n"
        f"✓ Strong position in the {sector} sector\n"
        f"✓ Track record of consistent performance\n\n"
        f"**Risks to Monitor:**\n"
        f"✗ Sector-specific challenges\n"
        f"✗ Market competition and regulatory changes\n\n"
        f"**Verdict:** {ticker} has {'strong' if roe > 18 else 'decent'} fundamentals. "
        f"The P/E of {pe} suggests it is {'fairly valued' if 18 < pe < 30 else 'undervalued' if pe < 18 else 'premium valued'}. "
        f"Consider your risk tolerance and investment horizon before investing.\n\n"
        f"[SEBI DISCLAIMER: This is educational fundamental analysis, not investment advice. "
        f"Consult a SEBI-registered advisor.]"
    )

    records.append({
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": question},
            {"role": "assistant", "content": answer}
        ]
    })

# ── Category 4: Valuation Analysis (6,000) ──
for _ in range(6000):
    ticker = random.choice(TICKERS)
    sector = SECTORS.get(ticker, "various")
    pe = round(random.uniform(10, 50), 1)
    eps = round(random.uniform(10, 200), 2)
    price = round(pe * eps, 2)

    question = random.choice([
        f"Is {ticker} overvalued at P/E {pe}? Should I buy?",
        f"Check if {ticker} is cheap right now - valuation analysis.",
        f"Valuation analysis of {ticker} - is it a good entry point?",
    ])

    answer = (
        f"**{ticker} Valuation Analysis:**\n\n"
        f"Current Price: ₹{price} | P/E: {pe} | EPS: ₹{eps}\n\n"
        f"**Relative Valuation:**\n"
        f"- The {sector} sector average P/E is around {'20-25' if sector in ['IT Services', 'Pharma'] else '15-20' if sector in ['Banking', 'Power'] else '18-22'}\n"
        f"- {ticker}'s P/E of {pe} is {'above' if pe > 22 else 'below' if pe < 18 else 'in line with'} the sector average\n\n"
        f"**Historical Context:**\n"
        f"- Compare with {ticker}'s own 5-year average P/E range\n"
        f"- A premium P/E may be justified if growth is above peers\n\n"
        f"**Valuation Verdict:**\n"
        f"At P/E {pe}, {ticker} appears {'fairly valued' if 18 < pe < 30 else 'undervalued' if pe < 18 else 'premium priced'}. "
        f"Consider the company's growth rate, competitive position, and industry outlook.\n\n"
        f"[SEBI DISCLAIMER: Valuation analysis is for educational purposes only.]"
    )

    records.append({
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": question},
            {"role": "assistant", "content": answer}
        ]
    })

# ── Category 5: Sector Analysis (5,000) ──
sectors_list = list(set(SECTORS.values()))
for _ in range(5000):
    sector = random.choice(sectors_list)
    sector_stocks = [t for t in TICKERS if SECTORS.get(t) == sector]
    if not sector_stocks:
        continue

    question = random.choice([
        f"Tell me about the {sector} sector. Which stocks to watch?",
        f"Analysis of {sector} sector - is it a good investment right now?",
        f"What is the outlook for {sector} sector?",
    ])

    answer = (
        f"**{sector} Sector Analysis:**\n\n"
        f"**Key Players:** {', '.join(sector_stocks[:5])}\n\n"
        f"**Sector Overview:**\n"
        f"The {sector} sector is a {'defensive' if sector in ['FMCG', 'Pharma'] else 'cyclical' if sector in ['Automobile', 'Metals', 'Cement'] else 'growth'} sector in the Indian economy. "
        f"It contributes significantly to the broader market indices.\n\n"
        f"**Key Drivers:**\n"
        f"✓ Domestic demand and consumption\n"
        f"✓ Government policy support\n"
        f"✓ Global economic conditions\n\n"
        f"**Risks:**\n"
        f"✗ Regulatory changes\n"
        f"✗ Competition and margin pressure\n"
        f"✗ Macroeconomic headwinds\n\n"
        f"**Outlook:** The sector has {'positive' if random.random() > 0.5 else 'cautious'} long-term prospects. "
        f"Investors should focus on companies with strong fundamentals and competitive advantage.\n\n"
        f"[SEBI DISCLAIMER: This is educational sector analysis.]"
    )

    records.append({
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": question},
            {"role": "assistant", "content": answer}
        ]
    })

# ── Category 6: Macro/Economy Impact (4,000) ──
macro_topics = [
    ("interest rates", "RBI rate changes affect different sectors. Banking benefits from higher rates while auto and real estate face headwinds."),
    ("rupee depreciation", "A weaker rupee benefits IT and pharma exports but hurts import-dependent sectors."),
    ("inflation", "High inflation impacts consumer spending and corporate margins. Commodity and banking stocks may benefit."),
    ("GDP growth", "Strong GDP growth supports corporate earnings and market sentiment across all sectors."),
    ("foreign investment", "FII/DII flows significantly impact market direction and liquidity."),
]

for _ in range(4000):
    topic, context = random.choice(macro_topics)
    question = random.choice([
        f"How does {topic} affect Indian stocks?",
        f"Impact of {topic} on different sectors.",
        f"Explain the relationship between {topic} and stock market performance.",
    ])

    answer = (
        f"**Impact of {topic} on Indian Markets:**\n\n"
        f"{context}\n\n"
        f"**Sector-wise Impact:**\n"
        f"- Banking & Financials: Directly affected\n"
        f"- IT & Pharma: Indirect exposure\n"
        f"- Consumer & Auto: Demand-sensitive\n"
        f"- Commodities: Price-linked\n\n"
        f"**Investment Strategy:**\n"
        f"Diversify across sectors to manage macro risks. Monitor RBI policy, global cues, "
        f"and economic data releases.\n\n"
        f"[SEBI DISCLAIMER: Educational macro analysis only.]"
    )

    records.append({
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": question},
            {"role": "assistant", "content": answer}
        ]
    })

# ── Category 7: Risk Analysis (3,000) ──
for _ in range(3000):
    ticker = random.choice(TICKERS)
    sector = SECTORS.get(ticker, "various")

    question = random.choice([
        f"What are the risks for {ticker} investors? How to manage?",
        f"Risk analysis of investing in {ticker}.",
        f"What should {ticker} investors watch out for?",
    ])

    answer = (
        f"**{ticker} Risk Analysis:**\n\n"
        f"**Company-Specific Risks:**\n"
        f"1. Business concentration in {sector} sector\n"
        f"2. Competition from peers and new entrants\n"
        f"3. Regulatory changes affecting operations\n\n"
        f"**Market Risks:**\n"
        f"1. Sector rotation and investor sentiment\n"
        f"2. Valuation risk if P/E expands unsustainably\n"
        f"3. Liquidity risk in volatile markets\n\n"
        f"**Risk Mitigation Strategies:**\n"
        f"✓ Diversify across sectors (don't over-concentrate in {sector})\n"
        f"✓ Use stop-losses to limit downside\n"
        f"✓ Invest with a long-term horizon (3-5 years)\n"
        f"✓ Monitor quarterly results and management commentary\n\n"
        f"**Overall Risk Rating:** Moderate. {ticker} is an established company but all "
        f"investments carry risk. Position size according to your risk tolerance.\n\n"
        f"[SEBI DISCLAIMER: Educational risk analysis. Consult a SEBI-registered advisor.]"
    )

    records.append({
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": question},
            {"role": "assistant", "content": answer}
        ]
    })

# ── Additional categories to reach 60,000 ──
# Portfolio Tips (5,000)
portfolio_questions = [
    ("How should I build a diversified portfolio?", "Diversification across sectors, market caps, and asset classes reduces risk. Allocate based on age: 100-age in equities."),
    ("What is the ideal asset allocation for beginners?", "Beginners should start with 60% large-cap, 20% mid-cap, 20% small-cap mutual funds or ETFs."),
    ("How much should I invest in stocks vs mutual funds?", "Direct stocks require research. Mutual funds offer diversification. A 50-50 split is reasonable for most investors."),
    ("What is a good portfolio size to start investing?", "Start with any amount. Even ₹500/month via SIP builds the habit. Consistency matters more than initial amount."),
    ("How often should I rebalance my portfolio?", "Review quarterly, rebalance annually. Sell overperformers, buy underperformers to maintain target allocation."),
]

for _ in range(5000):
    q, a = random.choice(portfolio_questions)
    records.append({
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": q},
            {"role": "assistant", "content": a + "\n\n[SEBI DISCLAIMER: Educational portfolio guidance. Consult a SEBI-registered advisor.]"}
        ]
    })

# Market Psychology (5,000)
psychology_questions = [
    "Why do investors panic sell during market crashes?",
    "What is FOMO in investing and how to avoid it?",
    "How to handle a portfolio drawdown without selling?",
    "What is the biggest mistake new investors make?",
    "How to stay disciplined during market volatility?",
]

for _ in range(5000):
    q = random.choice(psychology_questions)
    records.append({
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": q},
            {"role": "assistant", "content": (
                "**Market Psychology Insight:**\n\n"
                "Investing psychology is often the difference between success and failure. "
                "Common behavioral biases include loss aversion (fearing losses more than valuing gains), "
                "confirmation bias (seeking information that confirms existing beliefs), "
                "and recency bias (overweighting recent events).\n\n"
                "**Tips to overcome:**\n"
                "✓ Have a written investment plan and stick to it\n"
                "✓ Focus on long-term goals, not short-term noise\n"
                "✓ Avoid checking portfolio daily\n"
                "✓ Remember that market corrections are normal\n\n"
                "[SEBI DISCLAIMER: Educational content on investment psychology.]"
            )}
        ]
    })

# Tax/Legal Tips (4,000)
tax_topics = [
    ("capital gains tax", "Short-term gains (held < 1 year) taxed at 15%. Long-term gains (> 1 year) over ₹1 lakh taxed at 10%."),
    ("dividend taxation", "Dividends are taxed in the hands of investors per their income tax slab. TDS at 10% if dividend exceeds ₹5,000."),
    ("STT", "Securities Transaction Tax is 0.1% on delivery-based equity purchases and 0.025% on sales."),
    ("indexation benefit", "Debt funds held for 3+ years get indexation benefit, reducing effective tax rate significantly."),
    ("tax-loss harvesting", "Sell underperforming stocks to book losses, offset against capital gains. Buy back after 30 days."),
]

for _ in range(4000):
    topic, detail = random.choice(tax_topics)
    q = f"What is {topic} and how does it affect my investments?"
    records.append({
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": q},
            {"role": "assistant", "content": (
                f"**Understanding {topic}:**\n\n{detail}\n\n"
                f"Consult a tax professional for your specific situation. "
                f"Tax laws can change based on budget announcements.\n\n"
                f"[SEBI DISCLAIMER: Educational tax information. Consult a tax advisor.]"
            )}
        ]
    })

# ── SHUFFLE & WRITE ──
random.shuffle(records)
output_path = "qwen_1b_training.jsonl"

with open(output_path, "w") as f:
    for rec in records:
        f.write(json.dumps(rec) + "\n")

total = len(records)
print(f"Generated {total} training records → {output_path}")
print(f"File size: {os.path.getsize(output_path) / 1024 / 1024:.1f} MB")

# Categories summary
cats = {"comparisons": 10000, "technical": 8000, "fundamental": 7000, "valuation": 6000,
        "sector": 5000, "macro": 4000, "risk": 3000, "portfolio": 5000, "psychology": 5000, "tax": 4000}
total_cat = sum(cats.values())
print(f"\nExpected: {total_cat} records")
print(f"Generated: {total} records")
print(f"\nBreakdown:")
for k, v in cats.items():
    print(f"  {k}: {v}")
