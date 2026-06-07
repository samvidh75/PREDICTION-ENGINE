# TRACK-30 Phase 9: Dynamic Weight Optimisation

## Status: **INSUFFICIENT EVIDENCE**

Weight optimisation requires forward-return data to calibrate engine weights against actual market outcomes. Without measurable returns to optimise against, weights cannot be adjusted with evidence.

### Current Weights (theoretical, TRACK-21)
| Engine | Weight | Rationale |
|--------|--------|-----------|
| Growth | 2.0 | Revenue/earnings growth trajectory |
| Quality | 2.5 | ROE/ROIC/margins (sector-aware) |
| Stability | 2.5 | D/E, liquidity, volatility, market cap |
| Momentum | 1.0 | Technical strength (RSI/MACD/ADX) |
| Valuation | 2.0 | PE/PB/EV/FCF (sector-aware) |
| Risk | -0.3x | Penalty factor |

### When Evidence Becomes Available
After 30+ days of forward returns:
1. Correlate each engine score with forward returns
2. Increase weight of engines that predict returns better
3. Decrease or maintain weight of engines with no predictive power
4. Only modify weights if correlation is statistically significant (p < 0.05)

### No code modifications at this time.
