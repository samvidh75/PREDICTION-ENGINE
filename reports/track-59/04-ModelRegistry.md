# Agent D — Model Registry V3

## Registered Models
### SSI-V1 v1.0.0
- **Status**: RETIRED
- **Created**: 2024-Q1
- **Features**: quality_factor, value_factor, momentum_factor, growth_factor, risk_factor
- **Weights**: Equal-weight composite, intuition-based
- **Validation**: TRACK-47: A+ underperforms D, Future Health disproven
- **Retired because**: Intuition-based scoring. Future Health showed near-zero predictive power. Quality grades inverted.

### SSI-V2 v2.0.0
- **Status**: DEPLOYED (with known issues)
- **Created**: 2025-Q1 (TRACK-51)
- **Features**: quality_factor (25.3%), growth_factor (28.1%), value_factor (18.8%), risk_factor (15.7%), momentum_factor (12.0%)
- **Weights**: Empirical correlation from TRACK-48, PE+ROE composite for Quality V4
- **Validation**: 365d hit rate 69.8%, walk-forward 2021-2024 consistent, short-term (30d/90d) anti-predictive


### SSI-V3 v3.0.0
- **Status**: DESIGN PHASE
- **Created**: 2026-06-07
- **Features**: quality_v5_score (PE/ROE/ROCE/Dividend composite), value_factor (sector-relative), sector_factor (for banking/IT/energy), momentum_factor (365d only, down-weighted at shorter horizons)
- **Weights**: Long-horizon weighted: Quality 40%, Value 30%, Sector 20%, Momentum 10% (365d only)
- **Validation**: Pending — walk-forward 2021-2024 baseline established in TRACK-54


## Model Lineage
SSI-V1 (Intuition) → SSI-V2 (Empirical, TRACK-48/51) → SSI-V3 (Temporal-integrity + long-horizon focus)

## Audit Trail
TRACK-47: V1 validation | TRACK-48: Factor discovery | TRACK-51: V2 build | TRACK-53: Scientific audit | TRACK-54: Survival test | TRACK-59: V3 design
