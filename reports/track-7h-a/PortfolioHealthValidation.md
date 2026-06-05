# Portfolio Health Validation Report — TRACK-7H-A

**Generated:** 2026-06-05T16:26:14.081Z

---

## Health Score Pipeline

### From Portfolio to Score

```
PortfolioSnapshot
    ↓
PortfolioIntelligenceEngine.evaluate(snapshot)
    ↓
Health Score (0-100)
  - Weighted by position size
  - Includes PnL performance
  - Includes sector stability bonus
    ↓
Risk Score (0-100, higher = riskier)
  - Single stock concentration (>40% = +30 risk)
  - Sector concentration (>60% = +25 risk)
  - Under-diversification (<5 stocks = +15 risk)
    ↓
Quality Score (0-100)
  - Large-cap premium (marketCap > 200B INR)
  - Known sector ratio
  - Position count bonus
    ↓
Diversification Score (0-100)
  - Sector count (≥5 = +30)
  - Stock count (≥15 = +25)
  - Concentration penalties
    ↓
Composite: Health×0.35 + Quality×0.30 + Diversification×0.20 - Risk×0.15
    ↓
Classification: Excellent (≥85) → Strong (≥70) → Healthy (≥55) → Stable (≥40) → Weakening (≥25) → At Risk
```

### Expected Output

```typescript
{
  healthScore: 72,
  riskScore: 25,
  qualityScore: 68,
  diversificationScore: 75,
  sectorConcentrationWarnings: [],
  healthClassification: "Strong"
}
```

### Score Mapping: Upstox Holdings → StockStory Health

| Upstox Field | Used For | Impact on Score |
|:-------------|:---------|:----------------|
| symbol → RELIANCE | Sector lookup, registry enrichment | +10 if defensive sector, -5 if cyclical |
| quantity × lastPrice | Position weight | Higher weight = more impact on weighted avg |
| pnl / pnlPercent | Individual holding score | +20 if >20% gain, -30 if >20% loss |
| sector → Energy | Sector concentration risk | >60% allocation = +25 risk penalty |
| marketCap → ₹15T | Quality score (large cap) | +20% large cap premium |
| totalMarketValue | Risk concentration calc | Single stock >40% = +30 risk |

### Sample Scoring: 5-Stock Portfolio

| Symbol | Sector | Value (₹) | % of Portfolio | PnL% | Individual Score |
|:-------|:--------|:----------|:---------------|:-----|:-----------------|
| RELIANCE | Energy | ₹25,000 | 35% | +12% | 75 |
| HDFCBANK | Banking | ₹18,000 | 25% | +8% | 70 |
| TCS | IT | ₹15,000 | 21% | +15% | 80 |
| INFY | IT | ₹8,000 | 11% | -3% | 55 |
| SBIN | Banking | ₹5,500 | 8% | +5% | 65 |

**Weighted Health:** (75×0.35 + 70×0.25 + 80×0.21 + 55×0.11 + 65×0.08) = 70.8  
**Risk:** IT sector = 32% → moderate (+5) → Risk = 35  
**Quality:** 3 large caps → +15, 2 known sectors → +15 → Quality = 65  
**Diversification:** 2 sectors → +10, 5 stocks → +10 → Diversification = 50  
**Composite:** 70.8×0.35 + 65×0.30 + 50×0.20 - 35×0.15 = **58.8 → Healthy**

---

## Health Validation Checklist

- [x] PortfolioIntelligenceEngine accepts PortfolioSnapshot
- [x] Weighted health score calculated from position sizes
- [x] Risk score detects concentration
- [x] Quality score factors in large-cap presence
- [x] Diversification score counts sectors and stocks
- [x] Sector concentration warnings generated
- [x] Classification maps to 6 tiers
- [x] Individual holding scores include PnL + sector stability
- [x] All 4 sub-scores are 0-100
- [x] Composite uses stated weights (35/30/20/15)

## Status: ✅ Health Pipeline Ready

