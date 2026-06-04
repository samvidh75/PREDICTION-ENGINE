# StockStory Engine — Full Institutional Audit

## GrowthEngine

| Category | Detail |
|----------|--------|
| Inputs | revenueGrowth, epsGrowth, fcfGrowth, profitGrowth |
| Hardcoded constants | rg bands: [0.20, 0.15, 0.10, 0.05, 0, -0.05], eg bands: [0.25, 0.15, 0.10, 0.05, 0, -0.10], fg bands: [0.20, 0.10, 0.05, 0, -0.10], pg bands: [0.25, 0.15, 0.10, 0.05, 0, -0.10] |
| Score mapping | {95,85,75,60,40,25,10} per band |
| Weights | rg:3, eg:3, fg:2, pg:2 (normalised to 10) |
| FactorAdjust | (growthFactor - 50) * 0.3 at composite |
| Missing metrics | Revenue quality (organic vs acquisitive), earnings consistency (std dev of 5Y growth), CAGR vs YoY, sector benchmark growth |
| Failure modes | Single-year spikes score equally to sustained growth; negative base effects (e.g., rg from -0.30 to 0.05 = 50 improvement but scores 40) |
| Sector biases | Cyclicals with mean-reverting growth penalised; high-growth tech rewarded (appropriate); utilities with regulated 5% growth capped at 60 |

## QualityEngine

| Category | Detail |
|----------|--------|
| Inputs | roe, roic, grossMargin, operatingMargin, efficiencyRatio |
| Hardcoded constants | roe bands: [profile.roeExceptional, profile.roeHigh, profile.roeFair, profile.roeLow, 0], roic bands: [0.20, 0.15, 0.10, 0.05, 0], gm bands: [profile.gmPremium, profile.gmHigh, profile.gmFair, profile.gmLow], om bands: [profile.omPremium, profile.omHigh, profile.omFair, profile.omLow] |
| Score mapping | {95,80,65,45,30,10} for ROE; {95,80,65,50,35,10} for ROIC; {95,80,65,45,25} for GM; {95,80,65,45,25} for OM |
| Weights | roe:2.5, roic:2.5, gm:0-2, om:2, efficiency:1 |
| FactorAdjust | (qualityFactor - 50) * 0.2 at composite |
| Missing metrics | ROIC-WACC spread, earnings stability, dividend consistency, share buyback quality, intangible asset quality |
| Failure modes | ROE inflated by leverage (DuPont not considered); efficiency score breaks when gm=0; no differentiation between organic margin vs cost-cutting margin |
| Sector biases | Banks have ROE naturally lower (mitigated by profile), FMCG has structurally high ROE (appropriately rewarded), asset-light businesses score high on efficiency proxy |

## StabilityEngine

| Category | Detail |
|----------|--------|
| Inputs | debtToEquity, currentRatio, volatility (annualised), coverageRatio, interestCoverageProxy |
| Hardcoded constants | dte bands: [profile.deLow, profile.deModerate, profile.deElevated, profile.deExtreme], cr bands: [profile.crHealthy, profile.crAdequate, profile.crTight, 0.5], vol bands: [0.15, 0.25, 0.35, 0.50], cov bands: [1.0, 0.5, 0.25, 0.10], icr bands: [15, 8, 4, 2, 1] |
| Score mapping | dte: {95,85,75,55,35,15}, cr: {90,75,55,30,10}, vol: {90,75,55,35,15}, cov: {90,75,55,35,15}, icr: {90,75,60,45,30,15} |
| Weights | dte:2.5, cr:2, vol:1.5, cov:2, icr:2 |
| FactorAdjust | (riskFactor - 50) * 0.2 at composite |
| Missing metrics | Short-term debt / total debt, debt maturity profile, currency exposure on debt, off-balance-sheet liabilities, pension obligations |
| Failure modes | Coverage ratio is a poor proxy (OM/DTE is not EBIT/Interest); ICR proxy breaks for negative OM; volatility only captures equity vol not debt vol |
| Sector biases | Banks (D/E 5-15x) now handled, utilities (D/E 2-5x) partially handled, REITs and NBFCs not explicitly profiled |

## MomentumEngine

| Category | Detail |
|----------|--------|
| Inputs | rsi, macd, macdSignal, macdHistogram, adx, trendStrength, volatility, atr |
| Hardcoded constants | rsi bands: [55-65, 50-55, 65-70, 70-75, 40-50, 30-40], macd branching, adx bands: [40, 30, 25, 20], trendStrength bands: [0.05, 0.02, 0, -0.02, -0.05] |
| Score mapping | rsi: {90,75,65,40,20,50,35,25}, macd: {75/85,55,25,45}, adx: {80,70,60,45,30}, ts: {90,75,55,35,20,10} |
| Weights | momentumScore (rsi:5 + macd:5 → 10), trendScore (adx:4 + ts:6 → 10), volatilityScore (vol:6 + atr:4 → 10) → overall: m:5, t:3, v:2 |
| Missing metrics | Volume confirmation, relative strength vs sector, Bollinger Band position, rate-of-change, MFI (Money Flow Index), institutional flow |
| Failure modes | RSI divergence detection uses linearTrend on 5 data points — unreliable; ATR adjustment removed in RC-002 rewrite; MACD signal comparison fails when macdSig is very small |
| Sector biases | Low-vol stocks (FMCG) get higher volScore (correct); high-beta stocks penalised (correct); momentum strategies work differently across market cap tiers |

## ValuationEngine

| Category | Detail |
|----------|--------|
| Inputs | peRatio, pbRatio, evEbitda, fcfYield |
| Hardcoded constants | pe bands: [profile.peCheap, profile.peFair, profile.peExpensive, profile.peExtreme], pb bands: [profile.pbCheap, profile.pbFair, profile.pbExpensive, profile.pbExtreme], ev bands: [profile.evCheap, profile.evFair, profile.evExpensive, profile.evExtreme], fcfYield bands: [0.08, 0.05, 0.03, 0.02, 0] |
| Score mapping | pe: {95,75,50,30,10} (+20 for negative), pb: {90,65,45,25,10} (+15 for negative), ev: {90,70,50,30,15} (+20 for negative), fcfYield: {95,80,65,50,35,20} |
| Weights | pe:2-3, pb:2-3, ev:0-3, fcfYield:3 (sector-primary adjustments) |
| FactorAdjust | (valueFactor - 50) * 0.2 at composite |
| Missing metrics | Dividend yield scoring, PEG ratio, price-to-sales, earnings yield vs bond yield comparison, sector-relative percentile |
| Failure modes | Negative PE gets flat 20 regardless of magnitude; PB < 0 gets flat 15; all metrics equally sensitive to sector misclassification |
| Sector biases | FMCG at PE 50+ still penalised (30 score); Financials use PB as primary (appropriate); no separate treatment for loss-making companies beyond flat penalty |

## RiskEngine

| Category | Detail |
|----------|--------|
| Inputs | revenueGrowth, epsGrowth, profitGrowth, peRatio, marketCap, operatingMargin, fcfYield, volatility, beta |
| Hardcoded constants | Divergence thresholds: [0.20, 0.10], volatility bands: [0.60, 0.45, 0.35, 0.25, 0.15], fcfYield bands: [-0.05, 0, 0.02, 0.05] |
| Score mapping | Anomaly: additive signals * 100; CashFlow: {90,75,55,35,20}; Vol: {90,75,60,45,30,15} |
| Weights | anomaly:2.5, cashFlow:3.5, vol:4 |
| Missing metrics | Governance red flags (related-party transactions, auditor changes), promoter pledge %, regulatory actions, litigation risk, ESG scores |
| Failure modes | Anomaly score ceiling is low (max ~1.25 → 125 clamped to 100); revenue-EPS divergence only flagged when EPS > revenue (misses revenue acceleration with EPS flat — could be channel-stuffing); no lookback window for red flag persistence (one bad quarter flags forever if not recalculated) |
| Sector biases | Low-vol utilities score lower risk (correct), volatile pharma scores higher (correct), but cyclical industrials may trigger anomaly on recovery year divergence |

## ConfidenceEngine

| Category | Detail |
|----------|--------|
| Inputs | 18 financial fields (tiered: 4 critical, 6 important, 9 supplementary), 5 cross-engine scores, historical factor history, historical feature history |
| Hardcoded constants | Tier weights: [3,2,1]; stdDev bands for agreement: [8,15,22,30]; riskConsistency bands: [5,10,15,20]; historicalStability bands: [4,8,12,18]; critical gate caps: {3:30, 2:55, 1:70} |
| Score mapping | Agreement: {95,80,60,40,20}; RiskConsistency: {90,75,55,35,20}; HistStability: {90,75,55,35,20}; Level: {80→VH, 65→H, 40→M, else L} |
| Weights | completeness:2, agreement:3, riskConsistency:2.5, histStability:2.5 |
| Missing metrics | Signal trend direction (engines converging or diverging), coverage breadth (multiple sectors/indices available), provider diversity (single vs multi-source data), backtest accuracy score |
| Failure modes | Confidence independent from health score (by design) but not independent from data quality weighting; agreement on uniformly bad scores not penalised enough (only capped at 50); riskConsistency and histStability use same data source (factorHistory) and are correlated |
| Sector biases | Sector coverage not factored into confidence (Technology sector data may be deeper than Utilities) |
