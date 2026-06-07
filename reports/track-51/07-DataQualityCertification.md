# AGENT G — Data Quality Certification

## Score Lineage Documentation

### Health Score (Composite)
- **Source**: 7 independent engine outputs
- **Calculation**: Weighted composite (Growth 25%, Quality 25%, Stability 20%, Momentum 15%, Valuation 15%)
- **Refresh**: Per API request (cached for 5 minutes)
- **Confidence**: Derived from data availability across all 7 engines

### Quality Score
- **Source**: financial_snapshots (ROE, ROIC, gross margin, operating margin)
- **Calculation**: Sector-normalized percentiles (QualityEngine.ts)
- **Refresh**: On financial_snapshots update (quarterly typically)
- **Confidence**: HIGH if all 4 metrics available, LOW if ≤ 1

### Growth Score
- **Source**: financial_snapshots (revenue_growth, eps_growth, fcf_growth, profit_growth)
- **Calculation**: Percentile ranking within sector
- **Refresh**: On financial_snapshots update
- **Confidence**: Depends on YoY comparables

### Risk Score
- **Source**: feature_snapshots (volatility), factor_snapshots (risk_factor), financial_snapshots (debt_to_equity)
- **Calculation**: Multi-signal composite with red flag detection
- **Refresh**: Daily (price data) + quarterly (financials)
- **Confidence**: HIGH for listed stocks with daily prices

### Future Health Projection
- **Source**: Derived from current factor scores (not a separate engine)
- **Calculation**: 3M = growth*0.4 + momentum*0.35 + quality*0.25; 6M = growth*0.35 + quality*0.35 + stability*0.3; 12M = quality*0.4 + stability*0.35 + growth*0.25
- **Refresh**: With factor_snapshot refresh
- **Confidence**: Indicative trend, not a prediction

### Explainability
- **Source**: StockStoryOutput → ExplainabilityEngine.evaluate()
- **Calculation**: Factor contribution decomposition with normalized weightings
- **Refresh**: Per API request
- **Confidence**: Transparent — methodology documented in Trust Centre

### Narrative
- **Source**: StockStoryOutput + historical factor comparisons → NarrativeEngine.evaluate()
- **Calculation**: Direction detection (improving/stable/deteriorating) with strength classification
- **Refresh**: Per API request
- **Confidence**: HIGH when historical data exists, MEDIUM otherwise

## Verdict: ALL SCORES HAVE DOCUMENTED LINEAGE
Every score visible to users has a traceable source, calculation, and confidence indicator.
