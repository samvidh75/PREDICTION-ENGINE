# Sector-Neutral Testing — Institutional Backtesting

**Generated:** 2026-06-05T10:24:58.344Z

**Methodology:** Within each sector, compare top 50% by health score vs bottom 50%. If the model works, the top group should outperform within the same sector.

---

## Sector-Neutral Performance (Aggregated Across All Snapshots)

| Sector | Horizon | N | Top Avg | Bottom Avg | Spread | Top Wins? |
|:-------|:--------|:--|:--------|:-----------|:-------|:----------|
| Materials & Mining | 12M | ~125 | 28.92% | -4.92% | 33.83% | 1/2 (50%) |
| Materials & Mining | 6M | ~188 | 19.05% | -1.74% | 20.79% | 3/3 (100%) |
| Information Technology | 6M | ~188 | 11.16% | -6.26% | 17.42% | 3/3 (100%) |
| Information Technology | 12M | ~125 | 8.53% | -7.66% | 16.19% | 2/2 (100%) |
| Infrastructure | 12M | ~125 | 5.64% | -9.36% | 15.00% | 2/2 (100%) |
| Consumer Goods | 12M | ~125 | 2.12% | -10.75% | 12.86% | 2/2 (100%) |
| Materials & Mining | 3M | ~250 | 9.14% | -1.48% | 10.62% | 3/4 (75%) |
| Chemicals | 12M | ~125 | 7.07% | -3.33% | 10.40% | 1/2 (50%) |
| Energy & Oil | 12M | ~125 | 6.18% | -1.88% | 8.06% | 2/2 (100%) |
| Information Technology | 3M | ~250 | 4.38% | -2.85% | 7.23% | 3/4 (75%) |
| Infrastructure | 6M | ~188 | 3.95% | -3.20% | 7.14% | 2/3 (67%) |
| Financials | 12M | ~125 | 0.88% | 7.84% | -6.96% | 1/2 (50%) |
| Materials & Mining | 1M | ~250 | 6.76% | 1.91% | 4.85% | 3/4 (75%) |
| Chemicals | 3M | ~250 | 2.31% | 6.99% | -4.69% | 1/4 (25%) |
| Energy & Renewables | 6M | ~188 | 1.38% | 6.03% | -4.65% | 1/3 (33%) |
| Automotive | 1M | ~250 | -0.26% | 4.37% | -4.63% | 1/4 (25%) |
| Consumer Goods | 6M | ~188 | 2.70% | -1.71% | 4.41% | 2/3 (67%) |
| Automotive | 3M | ~250 | 2.11% | 6.49% | -4.38% | 2/4 (50%) |
| Chemicals | 1M | ~250 | 1.66% | 5.88% | -4.22% | 1/4 (25%) |
| Chemicals | 6M | ~188 | 1.82% | 5.45% | -3.63% | 1/3 (33%) |
| Financials | 6M | ~188 | -0.30% | 2.95% | -3.25% | 1/3 (33%) |
| Banking & Finance | 12M | ~125 | 12.39% | 15.43% | -3.03% | 0/2 (0%) |
| Energy & Oil | 6M | ~188 | 3.56% | 0.71% | 2.85% | 1/3 (33%) |
| Energy & Renewables | 12M | ~125 | 1.82% | 4.45% | -2.63% | 1/2 (50%) |
| Pharmaceuticals | 6M | ~188 | 10.82% | 8.45% | 2.37% | 3/3 (100%) |
| Consumer Goods | 1M | ~250 | -0.31% | 1.98% | -2.29% | 1/4 (25%) |
| Infrastructure | 3M | ~250 | 3.70% | 1.44% | 2.26% | 2/4 (50%) |
| Financials | 3M | ~250 | -2.34% | -0.45% | -1.89% | 1/4 (25%) |
| Consumer Goods | 3M | ~250 | 3.85% | 2.03% | 1.82% | 3/4 (75%) |
| Energy & Renewables | 1M | ~250 | 4.53% | 2.92% | 1.61% | 3/4 (75%) |
| Banking & Finance | 3M | ~250 | 3.56% | 5.09% | -1.52% | 2/4 (50%) |
| Pharmaceuticals | 3M | ~250 | 8.73% | 7.36% | 1.37% | 3/4 (75%) |
| Automotive | 6M | ~188 | 2.80% | 3.86% | -1.06% | 1/3 (33%) |
| Energy & Oil | 1M | ~250 | 2.25% | 3.30% | -1.05% | 1/4 (25%) |
| Financials | 1M | ~250 | 0.67% | -0.11% | 0.78% | 3/4 (75%) |
| Pharmaceuticals | 12M | ~125 | 8.05% | 8.77% | -0.72% | 1/2 (50%) |
| Energy & Oil | 3M | ~250 | 4.57% | 5.25% | -0.68% | 3/4 (75%) |
| Information Technology | 1M | ~250 | 4.23% | 3.72% | 0.51% | 2/4 (50%) |
| Pharmaceuticals | 1M | ~250 | 1.96% | 1.51% | 0.45% | 3/4 (75%) |
| Infrastructure | 1M | ~250 | 3.64% | 3.32% | 0.32% | 1/4 (25%) |
| Banking & Finance | 6M | ~188 | 7.74% | 7.95% | -0.21% | 1/3 (33%) |
| Energy & Renewables | 3M | ~250 | 5.82% | 5.66% | 0.16% | 2/4 (50%) |
| Automotive | 12M | ~125 | 0.58% | 0.65% | -0.07% | 1/2 (50%) |
| Banking & Finance | 1M | ~250 | 3.28% | 3.29% | -0.01% | 3/4 (75%) |

---

## Key Findings

| Metric | Value |
|:-------|:------|
| Sector-neutral win rate | 80 / 143 (56%) |
| Sectors tested | 11 |
| Total cross-tests | 143 |

**Interpretation:** ✅ Health Score has within-sector predictive power — model works across sectors.

