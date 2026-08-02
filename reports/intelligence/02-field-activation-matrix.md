# Field Activation Matrix

## Priority Field Status

| Field | Source/Storage | Canonical Input | Engine Consumer | Score Impact | Tests | Status |
|-------|--------------|-----------------|----------------|-------------|-------|--------|
| ROA | `financial_snapshots.roa` | `IntelligenceInput.financials.roa` | FinancialEngine (quality) | Quality sub-score | FinancialEngine.test.ts | ✅ Mapped |
| Dividend Yield | `financial_snapshots.dividend_yield` | `IntelligenceInput.financials.dividendYield` | ValuationEngine (dividendScore) | Valuation sub-score | Engines.test.ts | ✅ Mapped |
| Market Cap | `financial_snapshots.market_cap` | `IntelligenceInput.financials.marketCap` | RiskEngine, SectorEngine | Risk/stability | Not yet | ⚠️ Needs calibration |
| PE Ratio | `financial_snapshots.pe_ratio` | `IntelligenceInput.financials.peRatio` | ValuationEngine (peScore) | Valuation | Engines.test.ts | ✅ Mapped |
| PB Ratio | `financial_snapshots.pb_ratio` | `IntelligenceInput.financials.pbRatio` | ValuationEngine (pbScore) | Valuation | Engines.test.ts | ✅ Mapped |
| EV/EBITDA | `financial_snapshots.ev_ebitda` | `IntelligenceInput.financials.evEbitda` | ValuationEngine (evEbitdaScore) | Valuation | Engines.test.ts | ✅ Mapped |
| ROE | `financial_snapshots.roe` | `IntelligenceInput.financials.roe` | FinancialEngine (quality) | Quality | FinancialEngine.test.ts | ✅ Mapped |
| ROIC/ROCE | `financial_snapshots.roic` | `IntelligenceInput.financials.roic` | FinancialEngine (quality) | Quality | FinancialEngine.test.ts | ✅ Mapped |
| Debt/Equity | `financial_snapshots.debt_to_equity` | `IntelligenceInput.financials.debtToEquity` | FinancialEngine (debtScore) | Balance sheet | FinancialEngine.test.ts | ✅ Mapped |
| Operating Margin | `financial_snapshots.operating_margin` | `IntelligenceInput.financials.operatingMargin` | FinancialEngine (profitability) | Profitability | FinancialEngine.test.ts | ✅ Mapped |
| Revenue Growth | `financial_snapshots.revenue_growth` | `IntelligenceInput.financials.revenueGrowth` | FinancialEngine (growthScore) | Growth | FinancialEngine.test.ts | ✅ Mapped |
| Profit Growth | `financial_snapshots.profit_growth` | `IntelligenceInput.financials.profitGrowth` | FinancialEngine (growthScore) | Growth | FinancialEngine.test.ts | ✅ Mapped |
| RSI | `feature_snapshots.rsi` | `IntelligenceInput.technicals.rsi` | TechnicalEngine (trend/momentum) | Technical | TechnicalEngine.test.ts | ✅ Mapped |
| MACD | `feature_snapshots.macd` | `IntelligenceInput.technicals.macd` | TechnicalEngine (momentum) | Technical | TechnicalEngine.test.ts | ✅ Mapped |
| ATR | `feature_snapshots.atr` | `IntelligenceInput.technicals.atr` | TechnicalEngine (volatility) | Technical | TechnicalEngine.test.ts | ✅ Mapped |
| ADX | `feature_snapshots.adx` | `IntelligenceInput.technicals.adx` | TechnicalEngine (trend) | Technical | TechnicalEngine.test.ts | ✅ Mapped |
| Momentum | `feature_snapshots.momentum` | `IntelligenceInput.technicals.momentum1m-12m` | TechnicalEngine (momentum) | Technical | TechnicalEngine.test.ts | ✅ Mapped |
| Volatility | `feature_snapshots.volatility` | `IntelligenceInput.technicals.volatility` | TechnicalEngine (volatilityScore) | Technical | TechnicalEngine.test.ts | ✅ Mapped |

## Activation Requirements Status

- **ROA**: Influences Financial/Quality scoring ✅ (already in `FinancialEngine.ts` qualityScore)
- **Dividend Yield**: Influences Valuation scoring ✅ (already in `ValuationEngine.ts` dividendScore)
- **Market Cap**: Influences Risk/Stability/Sector context ❌ (not yet implemented)
- **Technical indicators**: Influence Technical/Momentum scoring ✅ (already in `TechnicalEngine.ts`)

## Engine Calibration Status

| Engine | Sub-scores | Market Cap Aware | Missing Value Safe | Tests |
|--------|-----------|-----------------|-------------------|-------|
| FinancialEngine | quality, growth, debt, profitability, cash gen | No | Yes | 10 tests |
| TechnicalEngine | trend, momentum, volatility, volume | No | Yes | 10 tests |
| ValuationEngine | PE, PB, EV/EBITDA, FCF yield, dividend yield | No | Yes | Included in Engines.test.ts |
| RiskEngine | financial, valuation, volatility, governance | No | Yes | Included in Engines.test.ts |
| SectorEngine | tailwinds, headwinds, peer comparison | No | Yes | Included in Engines.test.ts |
| NewsEngine | sentiment, volume, controversy | N/A | Yes | Included in Engines.test.ts |
| EarningsEngine | growth, surprise, estimates, consistency | No | Yes | Included in Engines.test.ts |
| EventEngine | corporate actions, catalysts, event risk | N/A | Yes | Included in Engines.test.ts |
| RAGEngine | knowledge coverage, patterns | N/A | Yes | Included in Integration.test.ts |

## Next Actions per Phase Requirements

1. **ROA scoring**: Already in FinancialEngine — verify thresholds are sector-sensible (Phase 4)
2. **Dividend yield**: Already in ValuationEngine — add value-trap caution for very high yield (Phase 5)
3. **Market cap stability**: Needs implementation in RiskEngine (Phase 6)
4. **Technical reliability**: Already solid — add drawdown context and mixed signal handling (Phase 7)
5. **Earnings**: Add margin pressure detection (Phase 8)
6. **News/Event**: Add time-weighting and event classification (Phase 9)
7. **Sector**: Add peer comparison placeholder (Phase 10)
