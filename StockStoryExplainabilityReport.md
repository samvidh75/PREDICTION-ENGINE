# StockStory Explainability & Ranking Attribution Report

This report integrates the multi-factor ranking analysis, driver attributions, sector profiles, and confidence validations of the StockStory universe.

## 1. Top 20 Healthiest Companies

- **500189**: Health Score 98 (Excellent)
- **500100**: Health Score 97 (Excellent)
- **ULTRACEMCO**: Health Score 95 (Excellent)
- **SUZLON**: Health Score 94 (Excellent)
- **BIRLASOFT**: Health Score 94 (Excellent)
- **500089**: Health Score 94 (Excellent)
- **HEG**: Health Score 92 (Excellent)
- **COALINDIA**: Health Score 91 (Excellent)
- **BPCL**: Health Score 91 (Excellent)
- **WOCKPHARM**: Health Score 91 (Excellent)
- **500155**: Health Score 91 (Excellent)
- **500221**: Health Score 91 (Excellent)
- **LT**: Health Score 90 (Excellent)
- **TATACHEM**: Health Score 90 (Excellent)
- **NOCIL**: Health Score 90 (Excellent)
- **THERMAX**: Health Score 90 (Excellent)
- **IDFCFIRSTB**: Health Score 89 (Excellent)
- **MANAPPURAM**: Health Score 89 (Excellent)
- **BAJAJHLDNG**: Health Score 89 (Excellent)
- **TRITURBINE**: Health Score 89 (Excellent)

## 2. Bottom 20 Companies

- **HCLTECH**: Health Score 27 (At Risk)
- **DIVISLAB**: Health Score 30 (At Risk)
- **ADANIGREEN**: Health Score 39 (Weakening)
- **532540**: Health Score 39 (Weakening)
- **TCS**: Health Score 40 (Weakening)
- **COFORGE**: Health Score 42 (Weakening)
- **DRREDDY**: Health Score 42 (Weakening)
- **GLENMARK**: Health Score 42 (Weakening)
- **500012**: Health Score 42 (Weakening)
- **500071**: Health Score 42 (Weakening)
- **500107**: Health Score 43 (Weakening)
- **ADANIPORTS**: Health Score 44 (Weakening)
- **532667**: Health Score 44 (Weakening)
- **500103**: Health Score 44 (Weakening)
- **TATAELXSI**: Health Score 45 (Weakening)
- **500140**: Health Score 45 (Weakening)
- **GODREJPROP**: Health Score 46 (Weakening)
- **GRASIM**: Health Score 46 (Weakening)
- **SJVN**: Health Score 46 (Weakening)
- **EQUITASBNK**: Health Score 46 (Weakening)

## 3. Sector Diagnostics

# Sector Health Report

| Sector | Count | Avg Health | Avg Growth | Avg Quality | Avg Stability | Avg Momentum | Avg Valuation | Avg Risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Banking** | 44 | 71.0 | 69.9 | 69.6 | 86.9 | 62.1 | 28.0 | 20.8 |
| **Information Technology** | 26 | 62.3 | 75.3 | 61.2 | 69.5 | 64.2 | 41.9 | 20.2 |
| **Consumer Goods** | 58 | 69.2 | 75.4 | 69.4 | 75.8 | 60.6 | 34.1 | 21.3 |
| **Pharmaceuticals** | 24 | 64.4 | 68.9 | 62.3 | 78.3 | 58.4 | 43.8 | 19.8 |
| **Automotive** | 23 | 68.9 | 77.9 | 70.9 | 80.7 | 61.3 | 34.5 | 20.7 |
| **Energy** | 32 | 63.5 | 73.3 | 68.7 | 79.4 | 58.6 | 33.5 | 21.6 |

## 4. Confidence Independence Verification

- Pearson correlation of health vs confidence score: **0.3107**
- Distribution: Very High (412), High (93), Medium (0), Low (0)

## 5. Suspicious Rankings & Diagnostics

- No critical score anomalies were flagged. Volatility penalization scaled appropriately to push high-risk assets into Weakening/At Risk classifications.

## 6. Deterministic Explanations Sample

**500189**: *500189 ranks as an Excellent business, showing outstanding fundamentals and robust structural health. The primary driver of strength is Financial Stability (91/100), reflecting robust underlying performance. Valuation is the lowest-performing dimension at 48/100. Overall, 500189 achieves a StockStory Health score of 98/100.*

**500100**: *500100 ranks as an Excellent business, showing outstanding fundamentals and robust structural health. The primary driver of strength is Growth (95/100), reflecting robust underlying performance. Market Momentum is the lowest-performing dimension at 49/100. Overall, 500100 achieves a StockStory Health score of 97/100.*

**ULTRACEMCO**: *ULTRACEMCO ranks as an Excellent business, showing outstanding fundamentals and robust structural health. The primary driver of strength is Financial Stability (93/100), reflecting robust underlying performance. Valuation is the lowest-performing dimension at 67/100. Overall, ULTRACEMCO achieves a StockStory Health score of 95/100.*

