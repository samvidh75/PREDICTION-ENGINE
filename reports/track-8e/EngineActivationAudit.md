# TRACK-8E Engine Activation Audit

Generated: 2026-06-05T18:59:07.094Z

Trace verified: Upstox live response -> UpstoxFundamentalsProvider field map -> ProviderCoordinator getFinancials chain -> EngineInputs.financials -> StockStoryEngine outputs.

| Symbol | Live mapped fields | Growth live inputs | Quality live inputs | Stability live inputs | Valuation live inputs | Health score | Classification | Confidence |
| --- | ---: | --- | --- | --- | --- | ---: | --- | --- |
| RELIANCE | 19/19 | None | roe, roic | debtToEquity | peRatio, pbRatio, evEbitda | 41 | Weakening | Medium |
| TCS | 19/19 | None | roe, roic | debtToEquity | peRatio, pbRatio, evEbitda | 48 | Weakening | Medium |
| INFY | 19/19 | None | roe, roic | debtToEquity | peRatio, pbRatio, evEbitda | 46 | Weakening | Medium |
| HDFCBANK | 15/19 | None | roe | debtToEquity | peRatio, pbRatio | 21 | At Risk | Medium |
| ICICIBANK | 15/19 | None | roe | debtToEquity | peRatio, pbRatio | 19 | At Risk | Medium |

## Findings

- Valuation Engine receives live Upstox PE/PB/EV-EBITDA where returned by Upstox.
- Quality Engine receives live Upstox ROE/ROIC where returned by Upstox.
- Stability Engine receives live derived debt-to-equity from live Upstox balance sheet values.
- Growth Engine does not receive live revenue/profit/EPS/FCF growth from current Upstox endpoints; it remains neutral baseline for those inputs until income statement/cash-flow growth data is added.
- No synthetic values were inserted for missing growth, margin, FCF yield, current ratio, or market cap fields in this audit.
