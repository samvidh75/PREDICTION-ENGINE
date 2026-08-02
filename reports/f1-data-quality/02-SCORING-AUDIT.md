# F1 Scoring Audit

Current historical scoring paths write direct numeric columns to `prediction_registry` and `factor_snapshots`. `factor_snapshots` schema defaults each factor to `50`, and older generation scripts contain hard-coded neutral factors and sentinel growth values.

Required F1 behavior is implemented in `src/backend/data/scoring/scoreEngine.ts`.

## Factor Behavior

`quality_score`: derives from stock-specific fundamentals such as ROE, operating margin, net margin, and debt burden where available. Missing fundamentals return `null` with `availability='unavailable'`.

`growth_score`: derives only from available revenue and earnings growth inputs. It never emits `-250`; missing periods return unavailable.

`value_score`: derives from valuation inputs such as PE and PB. It does not default to `50`.

`momentum_score`: derives from validated historical close prices. Zero OHLC rows are rejected before calculation. Insufficient valid history returns unavailable.

`risk_score`: derives from stock-specific annualized volatility using validated close prices. Invalid prices cannot enter the calculation.

`sector_score`: remains unavailable unless a real sector-relative input is supplied. It is no longer universally assigned `50`.

`ranking_score`: averages available factor values only and remains `null` when no factors are available.

`confidence_score`: reflects factor confidence and is reduced for partial or unavailable inputs.

`classification`: is emitted only from a valid ranking score. Unavailable rankings produce `classification=null`.

## Collapse Risk

The current production rows can collapse companies into identical vectors because missing data is represented as numeric defaults. The new scoring engine uses `null`, `availability`, `reason`, and lineage records instead, which makes missing data visible and prevents neutral constants from masquerading as measurements.

