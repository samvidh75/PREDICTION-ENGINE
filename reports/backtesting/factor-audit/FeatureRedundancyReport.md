# Feature Redundancy Report — Factor Quality Audit

**Generated:** 2026-06-05T10:42:41.060Z

---

## Cross-Feature Redundancy Analysis

Since all features receive neutral defaults, redundancy is structural:

| Feature Pair | Relationship | Redundancy | Issue |
|:-------------|:-------------|:-----------|:------|
| Revenue Growth ↔ EPS Growth | Both = 0.08 always | 100% identical | No differentiation |
| ROE ↔ ROIC | Both = 0.12 / 0.10 always | 100% correlated | No independent signal |
| Debt/Equity ↔ Current Ratio | Both = 0.5 / 1.5 always | 100% correlated | No independent signal |
| Gross Margin ↔ Operating Margin | Both = 0.35 / 0.15 always | 100% correlated | No independent signal |
| PE ↔ PB | Both = 20 / 3 always | 100% correlated | No independent signal |
| FCF Yield (in Growth) ↔ FCF Yield (in Valuation) | Same field, used twice | **Duplicate** | FCF Yield scores in both Growth (as FCF Growth) and Valuation engines |
| Volatility (in Stability) ↔ Volatility (in Risk) | Both use `features.volatility` | **Duplicate** | Same volatility feeds both Stability (inverse) and Risk (direct) scores |
| Operating Margin (in Quality) ↔ Operating Margin (in Stability) | Same field, used twice | **Duplicate** | Operating margin drives Quality margin score AND Stability coverage/ICR proxy |

### Confirmed Duplicates

1. **FCF Yield**: Used in Growth Engine (as FCF Growth) AND Valuation Engine (as FCF Yield score). Same value → double-counted.
2. **Volatility**: Used in Stability Engine (inverse-scored) AND Risk Engine (direct-scored). Correlated but directionally opposite — creates offset.
3. **Operating Margin**: Used in Quality Engine (margin scoring) AND Stability Engine (coverage ratio, ICR proxy). Triple-counted.

