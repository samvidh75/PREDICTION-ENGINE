# Opportunity Class Calibration

**Generated:** 2026-06-28T17:47:14.132Z

**Total Classes:** 10

## Summary Matrix

| # | Class | Quality | Risk | Min Conviction | Horizon |
|---|-------|---------|------|----------------|---------|
| 1 | Compounder | 0.7–1 | low | 0.6 | 3–5+ years |
| 2 | Growth at Reasonable Price (GARP) | 0.55–0.85 | moderate | 0.55 | 2–4 years |
| 3 | Turnaround Play | 0.35–0.65 | high | 0.65 | 1–3 years |
| 4 | Dividend Yield | 0.6–0.9 | low | 0.5 | 2–5 years |
| 5 | Momentum Play | 0.4–0.75 | high | 0.45 | 3–12 months |
| 6 | Deep Value Play | 0.3–0.6 | moderate | 0.6 | 1–3 years |
| 7 | Special Situation | 0.3–0.8 | high | 0.7 | 3–18 months |
| 8 | Defensive / Low Volatility | 0.65–0.95 | low | 0.5 | 2–5 years |
| 9 | Cyclical Play | 0.35–0.65 | high | 0.55 | 6–24 months |
| 10 | Emerging Leader | 0.4–0.7 | high | 0.65 | 2–5 years |

## Quality Score Distribution

```
Compounder                     [████████████████████████████████████████] 0.7–1
Growth at Reasonable Price (GARP) [██████████████████████████████████      ] 0.55–0.85
Turnaround Play                [██████████████████████████              ] 0.35–0.65
Dividend Yield                 [████████████████████████████████████    ] 0.6–0.9
Momentum Play                  [██████████████████████████████          ] 0.4–0.75
Deep Value Play                [████████████████████████                ] 0.3–0.6
Special Situation              [████████████████████████████████        ] 0.3–0.8
Defensive / Low Volatility     [██████████████████████████████████████  ] 0.65–0.95
Cyclical Play                  [██████████████████████████              ] 0.35–0.65
Emerging Leader                [████████████████████████████            ] 0.4–0.7
```

## Detailed Calibration

### Compounder (`compounder`)

**Description:** High-quality businesses with consistent earnings growth, high ROE, and durable moats suitable for long-term wealth creation.

| Parameter | Value |
|-----------|-------|
| Quality Range | 0.7–1 |
| Risk Tolerance | low |
| Min Conviction | 0.6 |
| Holding Horizon | 3–5+ years |
| Typical Market Caps | Large Cap, Mega Cap |
| Typical Sectors | FMCG, IT Services, Pharmaceuticals, Banking |

**Red Flags:**
- 🚩 D/E > 1.5
- 🚩 Promoter pledge > 20%
- 🚩 Declining ROE for 3+ quarters

### Growth at Reasonable Price (GARP) (`growth_at_reasonable_price`)

**Description:** Companies with above-average revenue/EPS growth trading at reasonable valuations relative to growth rate.

| Parameter | Value |
|-----------|-------|
| Quality Range | 0.55–0.85 |
| Risk Tolerance | moderate |
| Min Conviction | 0.55 |
| Holding Horizon | 2–4 years |
| Typical Market Caps | Mid Cap, Large Cap |
| Typical Sectors | IT Services, Chemicals, Retail, Consumer Durables |

**Red Flags:**
- 🚩 PEG > 2.0
- 🚩 Revenue growth < sector median
- 🚩 Customer concentration > 30%

### Turnaround Play (`turnaround`)

**Description:** Companies undergoing operational/financial restructuring with potential for significant re-rating.

| Parameter | Value |
|-----------|-------|
| Quality Range | 0.35–0.65 |
| Risk Tolerance | high |
| Min Conviction | 0.65 |
| Holding Horizon | 1–3 years |
| Typical Market Caps | Mid Cap, Small Cap |
| Typical Sectors | PSU Banks, Steel, Infrastructure, Telecom |

**Red Flags:**
- 🚩 Negative cash flow for 4+ quarters
- 🚩 Debt restructuring history
- 🚩 Management turnover

### Dividend Yield (`dividend_yield`)

**Description:** Mature companies with stable cash flows and consistent dividend payout, suitable for income-oriented portfolios.

| Parameter | Value |
|-----------|-------|
| Quality Range | 0.6–0.9 |
| Risk Tolerance | low |
| Min Conviction | 0.5 |
| Holding Horizon | 2–5 years |
| Typical Market Caps | Large Cap, Mega Cap |
| Typical Sectors | FMCG, Oil & Gas, Power, Mining |

**Red Flags:**
- 🚩 Dividend yield > 7% (sustainability risk)
- 🚩 Payout ratio > 80%
- 🚩 Declining free cash flow

### Momentum Play (`momentum`)

**Description:** Stocks with strong price and earnings momentum; riding the trend with disciplined exits.

| Parameter | Value |
|-----------|-------|
| Quality Range | 0.4–0.75 |
| Risk Tolerance | high |
| Min Conviction | 0.45 |
| Holding Horizon | 3–12 months |
| Typical Market Caps | Mid Cap, Large Cap |
| Typical Sectors | Capital Goods, Defence, Automobile, Real Estate |

**Red Flags:**
- 🚩 RSI > 80
- 🚩 Volume declining on up-moves
- 🚩 FII selling > 5% in quarter

### Deep Value Play (`value_play`)

**Description:** Stocks trading significantly below intrinsic value with catalysts for mean reversion.

| Parameter | Value |
|-----------|-------|
| Quality Range | 0.3–0.6 |
| Risk Tolerance | moderate |
| Min Conviction | 0.6 |
| Holding Horizon | 1–3 years |
| Typical Market Caps | Mid Cap, Small Cap |
| Typical Sectors | PSU Banks, Steel, Metals, Mining |

**Red Flags:**
- 🚩 Value trap (no catalyst)
- 🚩 Book value declining
- 🚩 Industry in secular decline

### Special Situation (`special_situation`)

**Description:** Event-driven opportunities: mergers, demergers, buybacks, new product launches, regulatory changes.

| Parameter | Value |
|-----------|-------|
| Quality Range | 0.3–0.8 |
| Risk Tolerance | high |
| Min Conviction | 0.7 |
| Holding Horizon | 3–18 months |
| Typical Market Caps | Mid Cap, Small Cap |
| Typical Sectors | Diversified, Pharmaceuticals, IT Services, Financial Services |

**Red Flags:**
- 🚩 Event probability < 50%
- 🚩 Regulatory uncertainty
- 🚩 Insider selling pre-event

### Defensive / Low Volatility (`defensive`)

**Description:** Stable businesses with low beta, consistent earnings, and resilience during market downturns.

| Parameter | Value |
|-----------|-------|
| Quality Range | 0.65–0.95 |
| Risk Tolerance | low |
| Min Conviction | 0.5 |
| Holding Horizon | 2–5 years |
| Typical Market Caps | Large Cap, Mega Cap |
| Typical Sectors | FMCG, Healthcare, Power, Pharmaceuticals |

**Red Flags:**
- 🚩 Beta > 1.2
- 🚩 Earnings volatility > 20%
- 🚩 High customer churn

### Cyclical Play (`cyclical_play`)

**Description:** Companies leveraged to economic cycles; buy at cycle trough, sell at peak.

| Parameter | Value |
|-----------|-------|
| Quality Range | 0.35–0.65 |
| Risk Tolerance | high |
| Min Conviction | 0.55 |
| Holding Horizon | 6–24 months |
| Typical Market Caps | Mid Cap, Large Cap |
| Typical Sectors | Steel, Automobile, Cement, Capital Goods |

**Red Flags:**
- 🚩 Cycle peak indicators flashing
- 🚩 Capacity expansion at peak pricing
- 🚩 Input cost inflation

### Emerging Leader (`emerging_leader`)

**Description:** Next-generation leaders in high-growth sectors with scalable business models and strong execution.

| Parameter | Value |
|-----------|-------|
| Quality Range | 0.4–0.7 |
| Risk Tolerance | high |
| Min Conviction | 0.65 |
| Holding Horizon | 2–5 years |
| Typical Market Caps | Small Cap, Mid Cap |
| Typical Sectors | Internet, Chemicals, Retail, Capital Goods |

**Red Flags:**
- 🚩 Cash burn > 2 years runway
- 🚩 Promoter stake < 25%
- 🚩 No path to profitability

## Cross-Validation

| Pair | Risk |
|------|------|
| Compounder vs Defensive | Both low-risk, high-quality; differentiate by ROE trajectory |
| GARP vs Momentum | GARP needs PEG < 1.5; Momentum is purely price/earnings trend |
| Turnaround vs Value Play | Turnaround needs operational catalyst; Value needs price catalyst |