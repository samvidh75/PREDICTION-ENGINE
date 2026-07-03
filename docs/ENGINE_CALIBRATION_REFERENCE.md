# Engine Calibration Reference

## Current Thresholds (to validate/tune)

### Quality Engine
| Threshold | Current | Recommendation |
|-----------|---------|-----------------|
| ROE (excellent) | >20% | Validate against avg returns |
| ROE (good) | 15-20% | — |
| Consistency CV | <0.25 | Check if consistent = outperform |
| Op Margin (high) | >15% | — |

### Valuation Engine
| Factor | Threshold | Action |
|--------|-----------|--------|
| P/E vs sector median | <1.0x | Check if beats market |
| P/B | <2.0x | — |
| EV/EBITDA | <15x | — |

### Risk Engine
| Factor | Score | Meaning |
|--------|-------|---------|
| D/E < 0.5 | 10 (low risk) | Safe capital structure |
| Volatility < 15% | 15 (low risk) | Stable |
| Max drawdown < 10% | 15 (low risk) | — |
| Overall < 25 | LOW_RISK | Green flag |
| Overall 25-45 | MODERATE | Yellow flag |
| Overall > 65 | HIGH | Red flag |

## Validation Results (Update after running analyze_score_distribution.py)

### Conviction Scores Predictivity
- **Q4 vs Q1 3-month return spread:** ___ %
- **P-value:** ___
- **Signal strength:** [Weak / Moderate / Strong]

### Per-Factor Correlations
- Quality → Returns: ___ (should be +0.10+)
- Growth → Returns: ___ (should be +0.15+)
- Risk → Returns: ___ (should be -0.08+, inverse)
- Valuation → Returns: ___ (should be +0.12+)

### Recommendation
If p-value > 0.05: Adjust engine weights or add new features.
If p-value < 0.05: Engine is predictive, ship as-is.
