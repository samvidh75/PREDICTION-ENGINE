# Feature Coverage Report — Factor Quality Audit

**Generated:** 2026-06-05T11:09:43.318Z

---

## Coverage Assessment Per Feature

For the backtesting framework (`buildEngineInputs`), every financial feature is populated with a **default neutral value**. This means coverage in backtesting is 100% — but it's 100% synthetic.

| Feature | Backtest Coverage | Real Data % | Fallback % | Synthetic % | Impact |
|:--------|:------------------|:------------|:-----------|:------------|:-------|
| Revenue Growth | 100% — but synthetic | 0% | 0% | 100% | 🔴 Score is synthetic — no actual financial data distinguishes companies |
| EPS Growth | 100% — but synthetic | 0% | 0% | 100% | 🔴 Score is synthetic — no actual financial data distinguishes companies |
| FCF Growth | 100% — but synthetic | 0% | 0% | 100% | 🔴 Score is synthetic — no actual financial data distinguishes companies |
| Profit Growth | 100% — but synthetic | 0% | 0% | 100% | 🔴 Score is synthetic — no actual financial data distinguishes companies |
| ROE | 100% — but synthetic | 0% | 0% | 100% | 🔴 Score is synthetic — no actual financial data distinguishes companies |
| ROIC | 100% — but synthetic | 0% | 0% | 100% | 🔴 Score is synthetic — no actual financial data distinguishes companies |
| Gross Margin | 100% — but synthetic | 0% | 0% | 100% | 🔴 Score is synthetic — no actual financial data distinguishes companies |
| Operating Margin | 100% — but synthetic | 0% | 0% | 100% | 🔴 Score is synthetic — no actual financial data distinguishes companies |
| Efficiency Ratio | 100% — but synthetic | 0% | 0% | 100% | 🔴 Score is synthetic — no actual financial data distinguishes companies |
| Debt to Equity | 100% — but synthetic | 0% | 0% | 100% | 🔴 Score is synthetic — no actual financial data distinguishes companies |
| Current Ratio | 100% — but synthetic | 0% | 0% | 100% | 🔴 Score is synthetic — no actual financial data distinguishes companies |
| Volatility | 100% — but synthetic | 0% | 0% | 100% | 🔴 Score is synthetic — no actual financial data distinguishes companies |
| Coverage Ratio | 100% — but synthetic | 0% | 0% | 100% | 🔴 Score is synthetic — no actual financial data distinguishes companies |
| Interest Coverage Proxy | 100% — but synthetic | 0% | 0% | 100% | 🔴 Score is synthetic — no actual financial data distinguishes companies |
| RSI | 100% — but synthetic | 0% | 0% | 100% | 🔴 Score is synthetic — no actual financial data distinguishes companies |
| MACD Histogram | 100% — but synthetic | 0% | 0% | 100% | 🔴 Score is synthetic — no actual financial data distinguishes companies |
| ADX | 100% — but synthetic | 0% | 0% | 100% | 🔴 Score is synthetic — no actual financial data distinguishes companies |
| Trend Strength | 100% — but synthetic | 0% | 0% | 100% | 🔴 Score is synthetic — no actual financial data distinguishes companies |
| PE Ratio | 100% — but synthetic | 0% | 0% | 100% | 🔴 Score is synthetic — no actual financial data distinguishes companies |
| PB Ratio | 100% — but synthetic | 0% | 0% | 100% | 🔴 Score is synthetic — no actual financial data distinguishes companies |
| EV/EBITDA | 100% — but synthetic | 0% | 0% | 100% | 🔴 Score is synthetic — no actual financial data distinguishes companies |
| FCF Yield | 100% — but synthetic | 0% | 0% | 100% | 🔴 Score is synthetic — no actual financial data distinguishes companies |
| Accounting Anomaly Score | 100% — but synthetic | 0% | 0% | 100% | 🔴 Score is synthetic — no actual financial data distinguishes companies |
| Cash Flow Stress | 100% — but synthetic | 0% | 0% | 100% | 🔴 Score is synthetic — no actual financial data distinguishes companies |
| Volatility Risk | 100% — but synthetic | 0% | 0% | 100% | 🔴 Score is synthetic — no actual financial data distinguishes companies |
| Beta | 100% — but synthetic | 0% | 0% | 100% | 🔴 Score is synthetic — no actual financial data distinguishes companies |

---

## The Core Problem

**All 26 feature inputs in the backtesting framework receive hardcoded neutral values.** Every company in the backtest gets:
- PE Ratio = 20
- ROE = 0.12
- Revenue Growth = 0.08
- Debt/Equity = 0.5
- Beta = 1.0
- ...and so on

The only variation between companies comes from their **sector classification**, which causes the SectorWeightEngine to apply different weight maps. The factor engines themselves produce nearly identical scores for all companies because the inputs are identical.

### What This Explains

1. **Weak Monte Carlo robustness (0/24 stable in TRACK-6B)**: Factor correlations are noise because the scores barely vary
2. **Marginal quintile spreads (~57%)**: The Health Score ranks companies but the signal is sector-driven, not fundamental-driven
3. **Sector-dependent results (100% spread in TRACK-6B)**: Of course — sectors are the only source of variation
4. **Factor correlation instability**: With near-identical inputs, small random variations in Yahoo price returns dominate correlations

