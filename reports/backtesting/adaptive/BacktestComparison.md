# Backtest Comparison — Current vs Adaptive Weights

**Generated:** 2026-06-05T10:35:39.227Z

---

## Performance Comparison by Snapshot & Horizon

| Snapshot | Horizon | Metric | Current | Adaptive | Improvement |
|:---------|:--------|:-------|:--------|:---------|:------------|
| 2026-03-05 | 1M | Spearman ρ | -13.08% | -32.88% | -19.80% |
| 2026-03-05 | 1M | Top-Bottom Spread | -3.91% | -5.92% | -2.01% |
| 2026-03-05 | 1M | Top Return | -5.62% | -8.07% | -2.45% |
| 2026-03-05 | 3M | Spearman ρ | -2.01% | -17.08% | -15.07% |
| 2026-03-05 | 3M | Top-Bottom Spread | -1.74% | -9.04% | -7.30% |
| 2026-03-05 | 3M | Top Return | 3.58% | -0.82% | -4.40% |
| 2025-12-05 | 1M | Spearman ρ | 0.48% | 12.10% | +11.63% |
| 2025-12-05 | 1M | Top-Bottom Spread | 1.98% | 1.34% | -0.63% |
| 2025-12-05 | 1M | Top Return | 1.51% | 2.98% | +1.47% |
| 2025-12-05 | 3M | Spearman ρ | 2.42% | 8.77% | +6.35% |
| 2025-12-05 | 3M | Top-Bottom Spread | 6.78% | 3.91% | -2.87% |
| 2025-12-05 | 3M | Top Return | -4.03% | 0.69% | +4.71% |
| 2025-12-05 | 6M | Spearman ρ | 3.71% | -2.47% | -6.18% |
| 2025-12-05 | 6M | Top-Bottom Spread | 4.74% | -4.58% | -9.32% |
| 2025-12-05 | 6M | Top Return | -1.32% | -0.46% | +0.86% |
| 2025-06-05 | 1M | Spearman ρ | -2.46% | 6.31% | +8.77% |
| 2025-06-05 | 1M | Top-Bottom Spread | -1.94% | 1.84% | +3.78% |
| 2025-06-05 | 1M | Top Return | 1.92% | 4.08% | +2.16% |
| 2025-06-05 | 3M | Spearman ρ | 12.63% | 16.34% | +3.71% |
| 2025-06-05 | 3M | Top-Bottom Spread | 4.03% | 3.72% | -0.31% |
| 2025-06-05 | 3M | Top Return | 1.35% | 0.52% | -0.84% |
| 2025-06-05 | 6M | Spearman ρ | -11.13% | 7.97% | +19.10% |
| 2025-06-05 | 6M | Top-Bottom Spread | 2.02% | 8.68% | +6.66% |
| 2025-06-05 | 6M | Top Return | 4.22% | 8.49% | +4.26% |
| 2025-06-05 | 12M | Spearman ρ | -1.97% | 4.15% | +6.12% |
| 2025-06-05 | 12M | Top-Bottom Spread | 5.86% | 2.58% | -3.28% |
| 2025-06-05 | 12M | Top Return | 2.98% | 7.93% | +4.96% |
| 2024-06-05 | 1M | Spearman ρ | -9.64% | -8.23% | +1.41% |
| 2024-06-05 | 1M | Top-Bottom Spread | -3.28% | -0.65% | +2.62% |
| 2024-06-05 | 1M | Top Return | 7.46% | 8.66% | +1.20% |
| 2024-06-05 | 3M | Spearman ρ | -18.22% | -22.60% | -4.38% |
| 2024-06-05 | 3M | Top-Bottom Spread | -12.64% | -8.39% | +4.25% |
| 2024-06-05 | 3M | Top Return | 12.61% | 13.05% | +0.43% |
| 2024-06-05 | 6M | Spearman ρ | -24.32% | -12.44% | +11.88% |
| 2024-06-05 | 6M | Top-Bottom Spread | -24.54% | -6.57% | +17.97% |
| 2024-06-05 | 6M | Top Return | 0.98% | 4.99% | +4.01% |
| 2024-06-05 | 12M | Spearman ρ | -25.42% | -6.49% | +18.93% |
| 2024-06-05 | 12M | Top-Bottom Spread | -19.08% | 1.49% | +20.57% |
| 2024-06-05 | 12M | Top Return | -2.16% | 6.78% | +8.94% |

---

## Summary

| Metric | Current Wins | Adaptive Wins | Tests | Verdict |
|:-------|:-------------|:-------------|:------|:--------|
| Spearman correlation | 4 | 9 | 13 | ✅ Adaptive better |
| Top-Bottom spread | 7 | 6 | 13 | ⚠️ No clear advantage |
