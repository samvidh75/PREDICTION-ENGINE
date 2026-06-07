# Company Superpage V7 — Architecture Specification

## Sections (12-panel layout)

1. **Overview** — Price, market cap, sector, industry, exchange
2. **Current Health** — Quality V4 grade, factor scores, risk grade
3. **Future Health** — 3m/6m/12m projections (earnings, revenue, cash flow, balance sheet)
4. **Quality** — Cash conversion, margin stability, earnings consistency, debt quality, capital allocation
5. **Growth** — Revenue, EPS, cash flow growth trajectories
6. **Value** — PE, PB, EV/EBITDA, relative valuation
7. **Risk** — Governance, leverage, cyclicality, earnings, concentration risks
8. **Narratives** — Earnings, sector, macro, regulatory, management narrative strength + momentum
9. **Institutional Confidence** — Promoter, MF, FII, DII activity + accumulation/distribution
10. **Prediction History** — Timeline of predictions, hit rate, alpha attribution
11. **Alpha Evidence** — Realised alpha across horizons, benchmark comparison
12. **Explainability** — Why each score exists, top positive/negative drivers
13. **Research Notes** — User annotation layer

## Data Sources
- factor_snapshots → quality, growth, value, momentum, risk scores
- prediction_registry → prediction history, classifications
- prediction_outcomes → alpha, absolute/benchmark returns
- future_health_registry → forward projections
- narrative_registry → narrative analysis
- institutional_registry → institutional activity
- quality_registry_v4 → granular quality scores
- risk_registry → risk decomposition
- explainability_registry → driver attribution

## SEBI Compliance
- NO buy/sell/hold recommendations
- Educational framing throughout
- "Historical analysis" not "future predictions"
- Confidence intervals where applicable
- Data source attribution