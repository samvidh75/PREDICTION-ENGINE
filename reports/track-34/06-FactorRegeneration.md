# TRACK-34 AGENT-6: Factor Regeneration
**Generated:** 2026-06-06T18:39:26.581Z

## Target
Recompute `factor_snapshots` with monthly point-in-time factor scores.

## Factors Generated (by FactorEngine)

| Factor | Weight | Input |
|--------|--------|-------|
| Growth | ~20% | financial_snapshots (revenue growth, EPS growth) |
| Quality | ~25% | financial_snapshots (ROE, ROIC, debt) |
| Value | ~15% | financial_snapshots (PE, PB, dividend yield) |
| Momentum | ~15% | feature_snapshots (returns, MA) |
| Risk | ~10% | feature_snapshots (volatility, beta) |
| Sector Strength | ~15% | SectorPercentileEngine |

## Monthly Snapshots Target

| Period | Expected Snapshots | Status |
|--------|--------------------|--------|
| 2021 | 12 monthly | NOT GENERATED |
| 2022 | 12 monthly | NOT GENERATED |
| 2023 | 12 monthly | NOT GENERATED |
| 2024 | 12 monthly | NOT GENERATED |
| 2025 | 12 monthly | NOT GENERATED |
| 2026 | 6 monthly (partial) | NOT GENERATED |
| **Total ~60 months x ~500 symbols** | **~30,000 snapshots** | **0 actual** |

## Verdict

**INSUFFICIENT EVIDENCE** — Factor regeneration depends on `financial_snapshots` and `feature_snapshots`, both of which have 0 rows. The FactorEngine is coded in `src/services/FactorEngine.ts` but has no input data.
