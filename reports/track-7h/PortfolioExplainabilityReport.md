# Portfolio Explainability Report — TRACK-7H

**Generated:** 2026-06-05T15:21:29.488Z

---

## Explainability Engine

`PortfolioExplanationEngine` converts raw portfolio scores into plain-English insights.

### Output Dimensions

| Insight Type | Description | Trigger Conditions |
|:-------------|:------------|:-------------------|
| **Summary** | One-line portfolio assessment | Always generated |
| **Strongest holdings** | Top 3 by PnL% | At least 1 holding with PnL data |
| **Weakest holdings** | Bottom 3 by PnL% | At least 1 holding with PnL data |
| **Top risks** | Risk factors requiring attention | Risk score > 60, diversification < 40, single stock > 35% |
| **Sector warnings** | Concentration alerts | Sector > 50%, stock > 40% |
| **Diversification insights** | Quality of spread | Diversification score thresholds |
| **Health drivers** | What's driving the score | Overall score thresholds |
| **Recommendation count** | Total action items | Sum of all warnings |

### Sample Output

For a concentrated 5-stock IT portfolio:

```
Summary: "Stable portfolio of 5 holdings with room for diversification improvement"

Strongest holdings:
  - TCS: +12.3% (₹45,000)
  - INFY: +8.7% (₹32,000)
  
Weakest holdings:
  - WIPRO: -5.2% (₹18,000)

Top risks:
  - IT sector: 85% allocation — excessive concentration
  - Low diversification — add stocks from underrepresented sectors
  
Sector warnings:
  - IT sector: 85% allocation — excessive concentration

Diversification insights:
  - Portfolio needs better diversification — spread investments across 3+ sectors

Health drivers:
  - Moderate health — diversification and quality improvements would strengthen the portfolio
  - High quality: strong large-cap presence

Recommendations: 3
```

---

## Integration with StockStory UI

Explanations are designed to render in:
- Portfolio dashboard cards
- Healthometer visualization
- Risk radar chart labels
- Tooltip content on sector concentration charts

All output is plain text arrays (no React components in the engine), enabling reuse across pages.

