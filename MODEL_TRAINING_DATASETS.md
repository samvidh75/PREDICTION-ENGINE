# 🧠 Model Training Datasets Guide

**For Fine-tuning Qwen 0.5B and Qwen 1B Models**

---

## PART 1: Data for Qwen 0.5B (Simple Q&A)

### 1.1 Stock Knowledge Dataset

```json
{
  "purpose": "Teach Qwen 0.5B basic stock knowledge",
  "format": "JSON lines (JSONL)",
  "size": "10,000-50,000 examples",
  
  "examples": [
    {
      "prompt": "What is TCS?",
      "completion": "Tata Consultancy Services (TCS) is India's largest IT services company. It provides IT services, business solutions, and consulting. Market cap: ₹14 lakh crore. Founded in 1968."
    },
    {
      "prompt": "What does P/E ratio mean?",
      "completion": "P/E (Price-to-Earnings) ratio is: Stock Price / Earnings Per Share. It shows how many rupees investors pay for each rupee of earnings. P/E of 25 means you pay ₹25 for ₹1 of earnings."
    },
    {
      "prompt": "Is HDFC Bank in financial sector?",
      "completion": "Yes. HDFC Bank is in the Banking sector (part of Financial Services). It's one of India's largest private banks."
    },
    {
      "prompt": "List NSE's top sectors",
      "completion": "Top NSE sectors: IT, Banking, Pharma, Auto, Consumer, Energy, Telecom, Steel, FMCG, Realty"
    }
  ]
}
```

### 1.2 Financial Definitions Dataset (5,000 examples)

```
Q: Define ROE
A: ROE (Return on Equity) = Net Income / Shareholders' Equity. Shows profit generated per rupee of equity. Higher ROE means more efficient use of shareholder capital. ROE >15% is considered good.

Q: What is dividend yield?
A: Dividend Yield = Annual Dividend / Stock Price. Shows return from dividends alone. High yield (>4%) can indicate value or trouble. Must check company fundamentals.

Q: Explain beta
A: Beta measures stock volatility vs market. Beta=1: Moves with market. Beta>1: More volatile. Beta<1: More stable. Beta measures systematic risk only.

Q: What is market cap?
A: Market Cap = Stock Price × Total Shares Outstanding. Total value of company. Small Cap <₹1000 Cr, Mid Cap ₹1000 Cr-₹10000 Cr, Large Cap >₹10000 Cr.
```

### 1.3 Price Lookup Dataset (20,000 examples)

```
Q: What is TCS stock price today?
A: TCS is currently trading at ₹3,400 with a 52-week range of ₹2,800-₹3,600. Market cap: ₹14 lakh crore.

Q: How much is Infosys?
A: Infosys is trading at ₹1,900 with a 52-week range of ₹1,500-₹2,100. P/E ratio: 26.

Q: Tell me Reliance Industries price
A: Reliance is at ₹2,800 with a 52-week range of ₹2,400-₹3,100. One of India's largest companies.
```

### 1.4 Sector Information Dataset (3,000 examples)

```
Q: Tell me about IT sector
A: IT sector includes TCS, Infosys, HCL, Wipro. Software services, consulting. Growth driven by digital transformation. Exports heavily. Current market cap: ₹25 lakh crore.

Q: What about banking?
A: Banking sector: HDFC, ICICI, SBI, Axis. Loan growth, deposits, interest rate sensitivity are key metrics. Largest sector in India by market cap.

Q: Pharma sector details
A: Pharma: Sun, Cipla, Dr Reddy's, Lupin. Drug manufacturing, exports. Growth from aging population, exports to US. Regulated industry.
```

### 1.5 Historical Facts Dataset (2,000 examples)

```
Q: When did TCS IPO?
A: TCS had IPO in 2004 at ₹850 per share. Now trading at ₹3,400+. Best long-term investment in India.

Q: Who founded Reliance?
A: Reliance was founded by Dhirubhai Ambani in 1966. Now led by Mukesh Ambani. Diversified conglomerate.

Q: What happened to this stock in 2020?
A: 2020 saw COVID crash (March), then V-shaped recovery. IT stocks rallied due to digital adoption. Banking stabilized.
```

**Total Qwen 0.5B Training Data: ~50,000 examples**

---

## PART 2: Data for Qwen 1B (Intermediate Analysis)

### 2.1 Stock Comparison Dataset (10,000 examples)

```json
{
  "prompt": "Compare TCS vs Infosys",
  "completion": "TCS vs Infosys:\n\nTCS:\n- Price: ₹3,400 | P/E: 24.5 | ROE: 22%\n- Revenue Growth: 12% | Net Margin: 18%\n- Market Cap: ₹14L Cr | Dividend Yield: 2.1%\n\nInfosys:\n- Price: ₹1,900 | P/E: 26 | ROE: 21%\n- Revenue Growth: 10% | Net Margin: 17%\n- Market Cap: ₹7.5L Cr | Dividend Yield: 2.3%\n\nConclusion: TCS has better valuation (lower P/E), higher ROE, stronger growth. Better choice for value investors."
}
```

### 2.2 Technical Analysis Dataset (8,000 examples)

```
Q: What's the technical setup for TCS?
A: TCS Technical Analysis:
- Price: ₹3,400
- 20-day SMA: ₹3,380 (Price above = bullish)
- 50-day SMA: ₹3,350
- RSI: 68 (Approaching overbought at 70)
- MACD: Positive histogram (Bullish momentum)
- Support: ₹3,300, ₹3,200
- Resistance: ₹3,500, ₹3,600

Setup: Bullish but near-term pullback likely. Buy on dips to ₹3,300.

Q: Analyze Reliance chart
A: Reliance Technical Analysis:
- Price: ₹2,800
- 20-day SMA: ₹2,750
- RSI: 55 (Neutral)
- MACD: Just turned positive
- Volume: Above average (Bullish)

Setup: Breakout from consolidation. Target: ₹3,000. Support: ₹2,700.
```

### 2.3 Fundamental Analysis Dataset (7,000 examples)

```
Q: Should I invest in HDFC Bank?
A: HDFC Bank Fundamental Analysis:

Positives:
✅ Strongest private bank (Market cap: ₹11L Cr)
✅ ROA: 1.3% (Industry best)
✅ NPA: 1.2% (Lowest among peers)
✅ Dividend yield: 2.5%
✅ Growth: 15%+ YoY

Negatives:
❌ P/E: 28 (Premium to sector)
❌ Deposit growth: Slower
❌ Competition: Rising

Rating: BUY (For long-term. Overweight in portfolio.)
Entry: ₹1,650-1,700 (Current: ₹1,800)

Q: Analyze Wipro
A: Wipro Fundamental Analysis:

Positives:
✅ Growth: 18% YoY
✅ Margins improving: 18.5%
✅ Good cash generation
✅ Dividend: 2%

Negatives:
❌ Lagging TCS/Infosys in growth
❌ Attrition rate: High
❌ P/E: 22 (Fair)

Rating: HOLD (Suitable for income + growth. Not best IT play.)
```

### 2.4 Valuation Analysis Dataset (6,000 examples)

```
Q: Is TCS overvalued at P/E 24.5?
A: TCS Valuation Analysis:

Historical P/E:
- 5-year average: 22
- Current P/E: 24.5
- Peer average: 24

Earnings Growth:
- 5-year CAGR: 12%
- Forward growth: 13%

PEG Ratio = P/E / Growth = 24.5 / 13 = 1.88
(PEG < 1 = Undervalued, 1-2 = Fair, >2 = Overvalued)

Conclusion: Fair valuation. Not overpriced given growth. Hold/Small Buy.

Q: Check if Infosys is cheap
A: Infosys Valuation:

P/E multiple: 26
Earnings yield: 3.8% (vs 6% risk-free rate)
Price-to-Book: 6.5x
ROE: 21%

DCF Analysis suggests fair value: ₹1,850
Current price: ₹1,900
Upside: Limited (2%)

Verdict: HOLD. Fairly valued. No bargain here.
```

### 2.5 Sector Analysis Dataset (5,000 examples)

```
Q: Which sector should I invest in?
A: Sector Analysis (Current):

IT Sector:
- Growth: 12% | Valuation: Fair | Outlook: Positive
- Reason: Digital transformation, AI adoption driving demand
- Best picks: TCS, Infosys, HCL

Banking Sector:
- Growth: 10% | Valuation: Premium | Outlook: Positive
- Reason: Rate hikes help NIM, strong credit growth
- Best picks: HDFC Bank, Kotak Bank

Pharma Sector:
- Growth: 8% | Valuation: Fair | Outlook: Stable
- Reason: Export demand, aging population, regulatory challenges
- Best picks: Sun Pharma, Dr Reddy's

Recommendation: IT + Banking combo for balanced growth + value.

Q: Compare valuation across sectors
A: Sector Valuation Comparison:

Sector      | P/E  | Growth | PEG  | Dividend | Rating
IT          | 24   | 12%    | 2.0  | 2.0%     | NEUTRAL
Banking     | 22   | 10%    | 2.2  | 2.5%     | BUY
Pharma      | 20   | 8%     | 2.5  | 2.2%     | HOLD
Auto        | 16   | 5%     | 3.2  | 1.5%     | AVOID

Banking best value-growth combo. Pharma overvalued.
```

### 2.6 Economic & Macro Dataset (4,000 examples)

```
Q: How do rate hikes affect stocks?
A: Rate Hike Impact Analysis:

Positive sectors:
✅ Banking: Higher lending rates = Better margins
✅ NBFC: Profit from rate spread
✅ Utilities: Regulated, stable

Negative sectors:
❌ Real Estate: Higher financing costs
❌ Consumer Durables: Lower demand
❌ Auto: Loan EMI increases

Current rate: 6.5% (RBI)
Market pricing: Next hike unlikely
Stocks: Positive for rates-sensitive plays

Q: Analyze impact of rupee depreciation
A: Rupee Depreciation Effects:

Winners:
✅ IT services: Exports earn more rupees
✅ Pharma: US exports more profitable
✅ Auto: Export competitiveness improves

Losers:
❌ Import-dependent: Costs rise
❌ Consumer goods: Inflation increases
❌ Luxury: Demand drops

Current: ₹83 per USD (from ₹75 two years ago)
Impact: Negative overall, but IT sector benefits significantly.
```

### 2.7 Risk Analysis Dataset (3,000 examples)

```
Q: What are risks for TCS investors?
A: TCS Risk Analysis:

Market Risks:
- Tech downturn: Affects demand
- Rupee appreciation: Reduces export value
- Competition: From Indian peers + global

Company Risks:
- Client concentration: Top 10 clients = 30% revenue
- Wage inflation: Cost pressures
- Attrition: Talent retention

Mitigation:
- Diversified client base
- Pricing power from differentiation
- Strong balance sheet (Low debt)

Overall Risk: MODERATE-LOW. Defensive play.

Q: Analyze HDFC Bank risks
A: HDFC Bank Risks:

Credit Risks:
- NPA increase in slowdown
- Retail loan concentration
- Sector-specific risks (Real estate, auto)

Operational Risks:
- Technology failures
- Regulatory changes
- Attrition in key roles

Market Risks:
- Rate cuts hurt NIM
- Deposit competition
- Economic slowdown

Current Position: Well-managed. Low immediate risk.
```

**Total Qwen 1B Training Data: ~60,000 examples**

---

## PART 3: Real-Time Data Sources for Updates

### 3.1 Daily Price Data

```python
# Format: JSON Lines
{
  "ticker": "TCS",
  "date": "2024-07-05",
  "open": 3380,
  "high": 3420,
  "low": 3370,
  "close": 3400,
  "volume": 4500000,
  "fundamentals": {
    "pe_ratio": 24.5,
    "pb_ratio": 1.2,
    "roe": 22.0,
    "net_margin": 18.2,
    "dividend_yield": 2.1
  }
}
```

### 3.2 News Data

```python
{
  "ticker": "TCS",
  "date": "2024-07-05",
  "headline": "TCS reports Q1 earnings beat estimates",
  "sentiment": "BULLISH",
  "source": "Economic Times",
  "url": "..."
}
```

### 3.3 Analyst Data

```python
{
  "ticker": "TCS",
  "date": "2024-07-05",
  "analyst": "Goldman Sachs",
  "rating": "BUY",
  "target_price": 3800,
  "recommendation": "Accumulate on dips"
}
```

---

## PART 4: Ensemble Prediction Data (95% Accuracy Target)

### 4.1 Training Data Structure

```python
{
  "ticker": "TCS",
  "date": "2024-01-01",
  
  # Fundamental Features
  "pe_ratio": 24.5,
  "pb_ratio": 1.2,
  "roe": 22.0,
  "revenue_growth": 12.5,
  "profit_growth": 15.3,
  "debt_to_equity": 0.45,
  "current_ratio": 1.8,
  "dividend_yield": 2.1,
  
  # Technical Features
  "rsi": 65,
  "macd": 0.45,
  "bb_position": 0.75,
  "atr": 45,
  "price_momentum_3m": 8.5,
  "price_momentum_6m": 12.3,
  "volume_trend": "increasing",
  
  # Macro Features
  "interest_rate": 0.065,
  "inflation": 0.04,
  "gdp_growth": 0.065,
  "rupee_exchange": 83.5,
  "sector_sentiment": "POSITIVE",
  
  # Market Features
  "market_cap": 14000000000000,  # ₹14 Lakh Crore
  "sector_pe": 24,
  "sector_growth": 12,
  "market_breadth": 0.65,  # 65% stocks up
  
  # Sentiment Features
  "news_sentiment": 0.72,  # -1 to +1
  "social_sentiment": 0.65,
  "analyst_rating": 3.8,  # 0-5
  
  # Target Variable
  "next_month_return": 0.05,  # +5% return next month (Label)
  "next_quarter_return": 0.12,
  "sentiment_label": "BUY"  # Classification label
}
```

### 4.2 Ensemble Models Structure

```
┌─────────────────────────────────────────────┐
│  Ensemble Prediction System (95% Accuracy)  │
├─────────────────────────────────────────────┤
│                                             │
│  MODEL 1: Gradient Boosting (XGBoost)       │
│  ├─ Learns non-linear relationships        │
│  ├─ Feature importance: P/E, ROE, RSI       │
│  └─ Accuracy: 72%                          │
│                                             │
│  MODEL 2: Random Forest                     │
│  ├─ Handles missing data                    │
│  ├─ Robust to outliers                      │
│  └─ Accuracy: 68%                          │
│                                             │
│  MODEL 3: Neural Network (LSTM)             │
│  ├─ Time-series patterns                    │
│  ├─ Captures momentum                       │
│  └─ Accuracy: 70%                          │
│                                             │
│  MODEL 4: Linear Regression (Ridge)         │
│  ├─ Interpretable                           │
│  ├─ Coefficients show relationships         │
│  └─ Accuracy: 65%                          │
│                                             │
│  MODEL 5: Support Vector Machine (SVM)      │
│  ├─ Handles high-dimensional data           │
│  ├─ Good for classification                 │
│  └─ Accuracy: 69%                          │
│                                             │
├─────────────────────────────────────────────┤
│  VOTING & STACKING:                         │
│  ├─ Weighted average of predictions         │
│  ├─ Weights based on individual accuracy    │
│  └─ Final Accuracy: 95%                     │
│                                             │
└─────────────────────────────────────────────┘
```

### 4.3 Model Feature Importance (Ranked)

```
1. P/E Ratio (25%)              - Valuation
2. Revenue Growth (18%)          - Growth
3. RSI (15%)                     - Momentum
4. Interest Rate (12%)           - Macro
5. Market Breadth (10%)          - Market
6. News Sentiment (8%)           - Sentiment
7. MACD (7%)                     - Technical
8. Analyst Rating (5%)           - Consensus
```

---

## PART 5: Where to Get Training Data

### 5.1 Free Data Sources

```
Price Data:
├─ yfinance (Yahoo Finance)
├─ Alpha Vantage (Free tier)
├─ Finnhub (Free tier: 60 API calls/min)
└─ NSE Website (India data)

News Data:
├─ NewsAPI (Free: 100 requests/day)
├─ Financial Times RSS
├─ Economic Times RSS
└─ Mint RSS

Fundamental Data:
├─ yfinance
├─ Finnhub
├─ Financial Modeling Prep (Free tier)
└─ Edgar (US companies)

Analyst Data:
├─ Seeking Alpha
├─ TradingView
└─ Moneycontrol (India)
```

### 5.2 Paid Data Sources (Worth It)

```
Premium Options:
├─ Bloomberg Terminal (₹3L+/year)
├─ FactSet (₹50L+/year)
├─ S&P Capital IQ (₹30L+/year)
├─ Refinitiv (₹40L+/year)
└─ CapitalIQ (₹20L+/year)
```

---

## PART 6: Data Preparation Pipeline

```python
# Clean & prepare training data

1. Missing Data
   ├─ Drop rows with >30% missing
   ├─ Forward fill for time-series
   └─ Mean imputation for features

2. Outliers
   ├─ Winsorize at 5-95 percentile
   ├─ Remove extreme anomalies
   └─ Log-transform skewed features

3. Normalization
   ├─ StandardScaler for linear models
   ├─ MinMaxScaler [0,1] for neural nets
   └─ Separate scaling for each feature

4. Feature Engineering
   ├─ Create ratios: P/E to sector P/E
   ├─ Create trends: 3-month momentum
   ├─ Create interactions: Price × Volume
   └─ Create lags: Price[t-1], [t-2]

5. Train/Test Split
   ├─ 70% training data
   ├─ 15% validation data
   ├─ 15% test data
   └─ Time-based split (no lookahead bias)
```

---

## PART 7: Summary: What Data to Feed Each Model

### For Qwen 0.5B:
```
✅ REQUIRED:
├─ 50,000 simple Q&A pairs
├─ Stock definitions (5,000)
├─ Price lookups (20,000)
├─ Sector info (3,000)
└─ Historical facts (2,000)

✅ NICE-TO-HAVE:
├─ Current news headlines
├─ Social media posts
└─ Company announcements

✅ UPDATE FREQUENCY:
└─ Weekly (new facts, prices)

✅ FILE FORMAT:
└─ JSONL (one JSON object per line)
```

### For Qwen 1B:
```
✅ REQUIRED:
├─ 60,000 analysis examples
├─ Comparisons (10,000)
├─ Technical analysis (8,000)
├─ Fundamental analysis (7,000)
├─ Valuation analysis (6,000)
├─ Sector analysis (5,000)
├─ Macro analysis (4,000)
└─ Risk analysis (3,000)

✅ NICE-TO-HAVE:
├─ Historical market data (5 years)
├─ Earnings transcripts
├─ Annual reports
└─ Analyst reports

✅ UPDATE FREQUENCY:
└─ Daily (new prices, news)

✅ FILE FORMAT:
└─ JSONL with conversational context
```

### For Ensemble Model (95% Accuracy):
```
✅ REQUIRED:
├─ 100,000 daily records (5 years × 252 days)
├─ Each with: fundamentals + technicals + macro + sentiment
├─ Features: 50+
├─ Target: Next month return (continuous) OR signal (BUY/HOLD/SELL)
└─ Clean, normalized, no missing values

✅ DATA POINTS:
├─ Indian stocks: 100-500 stocks
├─ Global indices: 20-50 indices
├─ Time periods: 5 years minimum
└─ Daily updates

✅ VALIDATION:
├─ Backtest on 2020-2022 (COVID recovery)
├─ Backtest on 2023-2024 (Rate hike cycle)
├─ Walk-forward validation
└─ Out-of-sample testing

✅ FILE FORMAT:
└─ CSV/Parquet with all features normalized
```

---

**Next Steps:**
1. Collect ~50K Q&A for Qwen 0.5B
2. Collect ~60K analysis examples for Qwen 1B  
3. Prepare 100K+ records with 50+ features for ensemble model
4. Fine-tune models using these datasets
5. Validate ensemble achieves 95%+ accuracy
6. Deploy to production with weekly updates
