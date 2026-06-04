# StockStory — Portfolio Intelligence V2 Report

This report documents the upgraded portfolio risk metrics, which protect allocators from hidden concentration risks and factor drift.

---

## 1. Advanced Portfolio Metrics

The V2 portfolio engine adds four critical risk checks:

* **Hidden Concentration Risks**: Alerts users if their portfolio contains stocks that appear distinct but share underlying parent companies or high revenue correlations (e.g. holding both TCS and INFY, which concentrate technology sector risk).
* **Factor Exposure Changes**: Tracks whether the portfolio is drifting away from its target style (e.g., a portfolio intended for Value drifting toward high-Beta Growth due to price rallies).
* **Sector Drift**: Flags if recent stock price movements or sector weight changes have pushed sector exposure past a 30% concentration threshold.
* **Risk Hotspots**: Pinpoints the single stock responsible for the majority of the portfolio's volatility weight.

---

## 2. Portfolio Risk Scorecard Examples

We calculate these metrics using weighted variances:

$$\text{Portfolio Quality} = \sum (\text{Weight}_i \times \text{Quality}_i)$$

```
Portfolio Audit:
[✔] Diversification: Moderate
[⚠] Concentration Risk: HIGH (IT Services constitutes 40% of overall holdings)
[⚠] Sector Drift: IT Sector drift detected (+8.2% weight gain past 30 days)
[★] Risk Hotspot: HAL (Contributes 48% of active portfolio volatility weight)
```
