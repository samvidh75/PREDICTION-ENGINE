# AGENT F — Prediction Engine V2 Candidates

## Factor Correlations
| Pair | Correlation |
|---|---|
| quality_value | -0.39 |
| quality_growth | 0.38 |
| quality_momentum | 0.27 |
| value_growth | -0.56 |
| value_momentum | -0.85 |

## Candidate Models
| Model | Factors | Diversity | Risk | Est. Sharpe | Winner? |
|---|---|---|---|---|---|
| Quality Only | q | 1 | Pure quality — low diversification | 1.5 |  |
| Value Only | v | 0.8 | Value may underperform in growth markets | 1.5 |  |
| Quality + Value (Cheap Quality) | q+v | 0.9 | Best documented alpha (TRACK-48), limited to value | 1.5 | RECOMMENDED — backed by TRACK-48 findings |
| Quality + Value + Growth | q+v+g | 0.85 | Adds growth but quality-value dominates | 1.3 |  |
| All 5 Factors (Current SSI) | q+v+g+m+rk | 1 | Maximum diversification but noise from momentum &  | 1 |  |

**Recommendation:** Quality + Value (Cheap Quality) shows highest alpha with fewest factors
