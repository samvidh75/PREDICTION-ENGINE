# Portfolio Health Report — TRACK-7H

**Generated:** 2026-06-05T15:21:29.486Z

---

## Portfolio Intelligence Engine

StockStory's portfolio health model evaluates 4 dimensions:

| Dimension | Weight | Description |
|:----------|:-------|:------------|
| Health Score | 35% | Weighted average of individual holding health, scaled by position size |
| Quality Score | 30% | Large-cap premium, sector visibility, diversification bonus |
| Diversification Score | 20% | Sector and stock count, concentration detection |
| Risk Penalty | -15% | Concentration risk, sector concentration, single-stock domination |

---

## Score Interpretation

| Classification | Range | Description |
|:---------------|:------|:------------|
| Excellent | 85-100 | Well-diversified, quality holdings, low concentration, positive momentum |
| Strong | 70-84 | Solid portfolio with minor concentration or risk concerns |
| Healthy | 55-69 | Adequate diversification; some concentration in sectors |
| Stable | 40-54 | Acceptable but concentrated; limited sector exposure |
| Weakening | 25-39 | High concentration risk; limited diversification |
| At Risk | 0-24 | Extreme concentration or poor quality holdings |

---

## Sub-Score Calculation Details

### Weighted Health Score

```
For each holding:
  value = lastPrice × quantity
  holdingScore = 60 + PnL adjustment + sector stability bonus
  weightedHealth += holdingScore × value

finalHealth = weightedHealth / totalValue
```

### Risk Score

Component checks:
- **Single stock concentration:** >40% = +30 risk, >25% = +20, >15% = +10
- **Sector concentration:** >60% = +25 risk, >40% = +15, >25% = +5
- **Under-diversification:** <5 stocks = +15 risk

### Quality Score

- Large cap ratio (marketCap > 200B INR) × 20
- Known sector ratio × 15
- Holding count bonus (min +2/holding, max +15)

### Diversification Score

- Sector count: ≥5 = +30, ≥3 = +20, ≥2 = +10
- Stock count: ≥15 = +25, ≥10 = +15, ≥5 = +10
- Concentration penalties for >40% single position or >50% single sector

---

## Example Scoring

| Portfolio | Holdings | Sectors | Top Weight | Health | Risk | Quality | Diversification |
|:----------|:---------|:--------|:-----------|:-------|:-----|:--------|:---------------|
| Balanced 15-stock | 15 | 6 sectors | 12% | 82 | 15 | 85 | 88 |
| Concentrated 5-stock | 5 | 2 sectors | 35% | 58 | 55 | 60 | 42 |
| All-in-one | 1 | 1 sector | 100% | 35 | 95 | 40 | 15 |
| Sector-heavy (IT) | 8 | 1 sector | 25% | 52 | 65 | 45 | 30 |

