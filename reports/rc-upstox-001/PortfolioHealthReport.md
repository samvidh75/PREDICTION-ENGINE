# Portfolio Health Report — RC-UPSTOX-001

**Generated:** 2026-06-05T15:44:28.895Z

---

## Engine Inventory (Built in TRACK-7H)

| Engine | File | Purpose |
|:-------|:-----|:--------|
| PortfolioIntelligenceEngine | `portfolioIntelligenceEngine.ts` | 4-factor weighted health model |
| PortfolioExplanationEngine | `PortfolioExplanationEngine.ts` | Natural language explainability |
| PortfolioHealthEngine | `PortfolioHealthEngine.ts` | Basic health scoring |
| PortfolioRiskEngine | `PortfolioRiskEngine.ts` | Risk analysis |
| PortfolioSnapshotFactory | `PortfolioSnapshotFactory.ts` | Snapshot aggregation |

---

## Health Score Model

| Factor | Weight | Calculation |
|:-------|:-------|:------------|
| Health Score | 35% | Weighted average of individual holding scores (PnL + sector stability) |
| Quality Score | 30% | Large-cap premium + sector visibility + size bonus |
| Diversification Score | 20% | Sector count + stock count + concentration penalties |
| Risk Penalty | -15% | Single-stock domination + sector concentration |

## Risk Calculation

- **Single stock > 40%**: +30 risk
- **Single stock > 25%**: +20 risk
- **Sector > 60%**: +25 risk
- **< 5 stocks**: +15 risk

## Diversification Warnings

- Single sector concentration
- Fewer than 5 unique stocks
- Single position > 40% of portfolio
- Sector > 50% allocation

---

## What's New in RC-UPSTOX-001

The portfolio health engines (built in TRACK-7H) now receive **real portfolio data from Upstox** instead of manual or synthetic data. The normalization pipeline (Phase 4) feeds real holdings, positions, and funds into the same engines.

**No engine logic changes needed** — only the data source changed from manual entry to Upstox API.

