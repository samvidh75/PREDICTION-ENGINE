# F5 — Backtest & Calibration

## Backtest Methodology

### Walk-Forward Validation
The backtest uses walk-forward validation:
- The prediction period is split into sequential train/test windows
- Each window's training data precedes its test data (no lookahead)
- The engine is evaluated on each test window independently

### Fixture-Based (Synthetic)
Since real historical prediction records with known outcomes are not yet available in the unified engine format, synthetic data is generated:
- **Input generation**: Engine-compatible inputs are created with controlled variability across fundamental, technical, and risk dimensions
- **Return simulation**: Returns are generated as a function of the engine's own ranking score plus noise, creating a known signal structure
- **Temporal structure**: Records are generated at 2-week intervals across 2025
- **Cross-section**: 10 symbols across 4 sectors are included

### Limitations
1. **Synthetic returns**: Actual returns are simulated, not observed. Real market microstructure, regime changes, and outlier events are absent.
2. **No survivorship bias correction**: The same 10 symbols exist throughout; real backtests must account for delistings, M&A, and new listings.
3. **Known signal**: Returns are partially derived from the engine's own scores, inflating hit rate metrics vs. real-world performance.
4. **No transaction costs**: Slippage, brokerage, and market impact are not modeled.
5. **Single horizon**: Only 90-day horizon is backtested.

## Results

### Walk-Forward Windows

| Window | Test Period | Predictions | Symbols | Hit Rate | Missing Data |
|--------|-------------|-------------|---------|----------|--------------|
| 2025-01-01–2025-03-31 | 2025-04-01–2025-06-30 | 60 | 10 | 50.0% | 0.0% |
| 2025-04-01–2025-06-30 | 2025-07-01–2025-09-30 | 70 | 10 | 50.0% | 0.0% |
| 2025-07-01–2025-09-30 | 2025-10-01–2025-12-31 | 50 | 10 | 58.0% | 0.0% |

### Hit Rate by Decile

| Decile | Avg Return | Count |
|--------|------------|-------|
| 1 | 6.76% | 6 |
| 2 | 4.39% | 6 |
| 3 | 2.91% | 6 |
| 4 | 1.55% | 6 |
| 5 | 0.59% | 6 |
| 6 | -0.44% | 6 |
| 7 | -1.01% | 6 |
| 8 | -2.19% | 6 |
| 9 | -3.50% | 6 |
| 10 | -5.94% | 6 |
| 1 | 5.81% | 7 |
| 2 | 4.04% | 7 |
| 3 | 3.03% | 7 |
| 4 | 2.04% | 7 |
| 5 | 0.98% | 7 |
| 6 | -0.60% | 7 |
| 7 | -1.06% | 7 |
| 8 | -1.76% | 7 |
| 9 | -2.56% | 7 |
| 10 | -5.73% | 7 |
| 1 | 6.31% | 5 |
| 2 | 4.64% | 5 |
| 3 | 3.25% | 5 |
| 4 | 1.80% | 5 |
| 5 | 0.61% | 5 |
| 6 | 0.12% | 5 |
| 7 | -0.58% | 5 |
| 8 | -1.23% | 5 |
| 9 | -1.99% | 5 |
| 10 | -3.37% | 5 |

### Classification Calibration

Classification maps scores to ordinal bands:

| Classification | Score Range | Implication |
|----------------|-------------|-------------|
| EXCELLENT | 80–100 | Strong fundamentals, valuation, momentum |
| HEALTHY | 65–79 | Above-average quality with manageable risks |
| STABLE | 50–64 | Fair value, neutral outlook |
| WEAKENING | 35–49 | Deteriorating metrics or elevated risk |
| AT_RISK | 0–34 | Poor fundamentals or severe risk factors |
| INSUFFICIENT_DATA | N/A | Missing critical price data |

The classification bands should be verified against real outcome data when available. Key calibration questions:
- Do EXCELLENT stocks outperform HEALTHY stocks in realized returns?
- Is the 50-point STABLE/WEAKENING boundary correctly calibrated?
- Does INSUFFICIENT_DATA correctly catch low-data-quality names?

### Confidence Calibration

Confidence is computed from data completeness, freshness, and source confidence:

| Level | Score Range | Meaning |
|-------|-------------|---------|
| HIGH | 80+ | Fresh, complete, trusted sources |
| MEDIUM | 60–79 | Minor staleness or gaps |
| LOW | 40–59 | Notable missing data or age |
| CRITICAL | <40 | Major data degradation |

Confidence calibration should be validated by:
1. Comparing prediction accuracy across confidence bands
2. Confirming that CRITICAL-confidence predictions are less reliable than HIGH-confidence ones
3. Tuning thresholds so that ~60% of predictions fall in HIGH/MEDIUM bands

### Score Stability

| Symbol | Stability Score | Avg Score Change | Classification Flip Rate |
|--------|----------------|------------------|-------------------------|
| RELIANCE | 71/100 | 6.5 | 47.8% |
| TCS | 75/100 | 6.0 | 39.1% |
| HDFC | 67/100 | 8.0 | 56.5% |
| INFY | 68/100 | 8.1 | 52.2% |
| ICICI | 64/100 | 9.3 | 60.9% |
| SBIN | 73/100 | 6.4 | 43.5% |
| BHARTI | 71/100 | 7.0 | 47.8% |
| KOTAK | 71/100 | 7.4 | 47.8% |
| WIPRO | 66/100 | 8.5 | 56.5% |
| LT | 73/100 | 6.7 | 39.1% |

Overall average stability: **69.9/100**
Score collapse detected: **NO**

## Blocked Live-Data Gates

The following validation steps require real historical prediction data and are currently blocked:

| Gate | Requirement | Status |
|------|-------------|--------|
| Hit rate vs. realized returns | 12+ months of prediction records with actual outcomes | BLOCKED — synthetic only |
| Classification calibration | Observed return distributions per classification band | BLOCKED — synthetic only |
| Confidence calibration | Accuracy stratified by confidence level | BLOCKED — synthetic only |
| Decile monotonicity | Top-decile predictions must outperform bottom-decile on average | BLOCKED — synthetic only |
| Score stability bounds | Acceptable score change thresholds per symbol | BLOCKED — synthetic only |
| Walk-forward on live data | Continuous prediction history across market regimes | BLOCKED — synthetic only |
| Benchmark comparison | Alpha vs. NIFTY 50 / sector indices | BLOCKED — synthetic only |

## Recommendations

### Before Live Data Is Available
1. **Instrument the engine** to store all unified predictions in a `prediction_history` table with actual return columns
2. **Backfill** engine history from existing `prediction_registry` data through the StockStory adapter
3. **Add outcome tracking** via a scheduled job that records realized returns at each horizon
4. **Set up drift monitoring** to flag when synthetic backtest metrics diverge from live metrics

### When Live Data Is Available
1. **Rerun walk-forward** using actual temporal splits over 12+ months of prediction data
2. **Calibrate classification thresholds** using ROC analysis or decile-based return separation
3. **Validate confidence tiers** by comparing hit rates across HIGH/MEDIUM/LOW/CRITICAL groups
4. **Set stability bounds** — define maximum acceptable averageScoreChange per symbol
5. **Benchmark** the unified engine against the existing production engine (shadow mode drift report)
6. **Implement alerting** for score collapse, classification drift, and decile inversion

---

*Report generated at 2026-06-13T20:02:20.164Z*  
*Engine version: 1.0.0*