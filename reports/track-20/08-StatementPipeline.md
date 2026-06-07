# 08 — Statement Ingestion Architecture

**TRACK-20 Phase 3 — Task 9**
**Date:** 2026-06-06

---

## Purpose

Raw financial statements (Balance Sheet, Income Statement, Cash Flow) are the foundation for 11 of 20 derived financial metrics. The StatementPipeline ingests these statements from providers, normalizes them, and stores them for the DerivedMetricsEngine.

**Sources:** Finnhub (primary), Upstox (enrichment).

---

## Statement Data Model

### Balance Sheet

| Field | Type | Period | Source |
|-------|------|--------|--------|
| `totalAssets` | number | Annual/Quarterly | Finnhub BS API |
| `totalLiabilities` | number | Annual/Quarterly | Finnhub BS API |
| `totalEquity` | number | Annual/Quarterly | Derived (A - L) or Upstox |
| `currentAssets` | number | Annual/Quarterly | Finnhub BS API |
| `currentLiabilities` | number | Annual/Quarterly | Finnhub BS API |
| `cashAndEquivalents` | number | Annual/Quarterly | Finnhub BS API |
| `shortTermDebt` | number | Annual/Quarterly | Finnhub BS API |
| `longTermDebt` | number | Annual/Quarterly | Finnhub BS API |
| `inventory` | number | Annual/Quarterly | Finnhub BS API |
| `totalDebt` | number | Annual/Quarterly | Finnhub BS API |
| `sharesOutstanding` | number | Annual/Quarterly | Finnhub metrics |
| `goodwill` | number | Annual/Quarterly | Finnhub BS API |

### Income Statement

| Field | Type | Period | Source |
|-------|------|--------|--------|
| `revenue` | number | Annual/Quarterly/TTM | Finnhub IS API |
| `costOfRevenue` | number | Annual/Quarterly/TTM | Finnhub IS API |
| `grossProfit` | number | Annual/Quarterly/TTM | Finnhub IS API / Derived |
| `operatingIncome` | number | Annual/Quarterly/TTM | Finnhub IS API |
| `netIncome` | number | Annual/Quarterly/TTM | Finnhub IS API |
| `eps` | number | Annual/Quarterly/TTM | Finnhub IS API |
| `ebitda` | number | Annual/Quarterly/TTM | Finnhub IS API |
| `interestExpense` | number | Annual/Quarterly/TTM | Finnhub IS API |
| `incomeTaxExpense` | number | Annual/Quarterly/TTM | Finnhub IS API |
| `preTaxIncome` | number | Annual/Quarterly/TTM | Finnhub IS API |

### Cash Flow Statement

| Field | Type | Period | Source |
|-------|------|--------|--------|
| `operatingCashFlow` | number | Annual/Quarterly/TTM | Finnhub CF API |
| `capitalExpenditure` | number | Annual/Quarterly/TTM | Finnhub CF API |
| `freeCashFlow` | number | Annual/Quarterly/TTM | Finnhub CF API / Derived |
| `dividendsPaid` | number | Annual/Quarterly/TTM | Finnhub CF API |
| `depreciationAmortization` | number | Annual/Quarterly/TTM | Finnhub CF API |

---

## Ingestion Pipeline

```
┌──────────────────────────────────────────────────┐
│              StatementPipeline                    │
├──────────────────────────────────────────────────┤
│                                                  │
│  1. FETCH                                       │
│  ┌─────────────────────────────────────┐         │
│  │ Finnhub Financials API               │         │
│  │ GET /stock/financials?symbol=X.NS    │         │
│  │ &statement=bs&freq=annual            │         │
│  │ &statement=ic&freq=annual            │         │
│  │ &statement=cf&freq=annual            │         │
│  └─────────────────────────────────────┘         │
│              ↓                                   │
│  2. NORMALIZE                                   │
│  ┌─────────────────────────────────────┐         │
│  │ - Convert to INR (Finnhub reports in│         │
│  │   company's reporting currency)      │         │
│  │ - Extract latest 4 annual periods    │         │
│  │ - Extract latest 8 quarterly periods │         │
│  │ - Compute TTM (trailing 4 quarters)  │         │
│  │ - Standardize field names            │         │
│  └─────────────────────────────────────┘         │
│              ↓                                   │
│  3. VALIDATE                                    │
│  ┌─────────────────────────────────────┐         │
│  │ - Revenue > 0? (going concern)       │         │
│  │ - Assets > Liabilities? (solvent)    │         │
│  │ - Income Statement balances?         │         │
│  │ - Cash Flow matches?                 │         │
│  └─────────────────────────────────────┘         │
│              ↓                                   │
│  4. STORE                                       │
│  ┌─────────────────────────────────────┐         │
│  │ DB: financial_statements table       │         │
│  │ - symbol, period_end, period_type    │         │
│  │ - bs_json, is_json, cf_json          │         │
│  │ - source_provider, ingested_at       │         │
│  └─────────────────────────────────────┘         │
│              ↓                                   │
│  5. DERIVE                                      │
│  ┌─────────────────────────────────────┐         │
│  │ DerivedMetricsEngine.computeAll()    │         │
│  │ → roa, roic, margins, growth rates   │         │
│  │ → merged into financial_snapshots    │         │
│  └─────────────────────────────────────┘         │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## Database Schema

```sql
CREATE TABLE financial_statements (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  period_end DATE NOT NULL,
  period_type VARCHAR(10) NOT NULL CHECK (period_type IN ('annual', 'quarterly', 'ttm')),
  
  -- Balance Sheet (INR, crores)
  total_assets NUMERIC,
  total_liabilities NUMERIC,
  total_equity NUMERIC,
  current_assets NUMERIC,
  current_liabilities NUMERIC,
  cash_and_equivalents NUMERIC,
  short_term_debt NUMERIC,
  long_term_debt NUMERIC,
  total_debt NUMERIC,
  inventory NUMERIC,
  shares_outstanding NUMERIC,
  goodwill NUMERIC,
  
  -- Income Statement (INR, crores)
  revenue NUMERIC,
  cost_of_revenue NUMERIC,
  gross_profit NUMERIC,
  operating_income NUMERIC,
  net_income NUMERIC,
  eps NUMERIC,
  ebitda NUMERIC,
  interest_expense NUMERIC,
  income_tax_expense NUMERIC,
  pre_tax_income NUMERIC,
  
  -- Cash Flow (INR, crores)
  operating_cash_flow NUMERIC,
  capital_expenditure NUMERIC,
  free_cash_flow NUMERIC,
  dividends_paid NUMERIC,
  depreciation_amortization NUMERIC,
  
  -- Metadata
  source_provider VARCHAR(30) NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reporting_currency VARCHAR(3) DEFAULT 'INR',
  
  UNIQUE (symbol, period_end, period_type)
);

CREATE INDEX idx_financial_statements_symbol ON financial_statements (symbol);
CREATE INDEX idx_financial_statements_period ON financial_statements (symbol, period_type, period_end DESC);
```

---

## TTM Computation Logic

TTM (Trailing Twelve Months) = Sum of last 4 quarterly periods.

```
ttmRevenue = SUM(q.revenue) for last 4 quarters
ttmNetIncome = SUM(q.netIncome) for last 4 quarters
ttmFCF = SUM(q.freeCashFlow) for last 4 quarters
```

For ratios (margins), compute from TTM totals, not average quarterly ratios:
```
ttmGrossMargin = ttmGrossProfit / ttmRevenue  ← CORRECT
                ≠ AVG(quarterly grossMargin)  ← WRONG
```

---

## Provider Integration

### Finnhub Statement API

```
GET https://finnhub.io/api/v1/stock/financials-reported?symbol=RELIANCE.NS&token={key}
```

Response includes `data` array with BS, IS, CF for each reported period (annual + quarterly).

**Rate limit impact:** Statement fetch is 1 API call per symbol (vs. 1 for metrics). Total Finnhub calls per symbol = 2 (metrics + statements). At 60 req/min free tier: 505 symbols = 1010 calls = ~16.8 minutes.

### Upstox Statement API (when available)

```
GET https://api.upstox.com/v2/fundamentals/{isin}/balance-sheet
```

Upstox returns BS/IS/CF in a structured format but requires ISIN + OAuth token. Use as enrichment when token is valid.

---

## Validation Rules

### Balancesheet Equation
```
|totalAssets - (totalLiabilities + totalEquity)| < 0.01 * totalAssets
```
If the equation doesn't balance within 1%, flag for review but accept the data.

### Sanity Checks
- `revenue` > 0 for going concerns
- `totalAssets` > `currentAssets`
- `totalLiabilities` >= `currentLiabilities`
- `netIncome` not > `revenue` (profit margin > 100% is rare; accept if company has massive other income)
- `grossProfit` < `revenue` (if COGS is reported)
- `ebitda` >= `operatingIncome` in most cases (EBITDA = OI + D&A)

---

## Execution Order in Nightly Pipeline

```
1. RegistryUpdater → get active symbols
2. For each symbol (batched, rate-limited):
   a. Finnhub metrics (1 call) → peRatio, pbRatio, etc.
   b. Finnhub statements (1 call) → BS, IS, CF
   c. Yahoo history (1 call) → daily prices
3. DerivedMetricsEngine → compute 11 derived fields
4. FeatureEngine → compute 12 technical features
5. FactorEngine → compute factor scores
6. Write to DB: financial_snapshots, financial_statements, daily_prices, feature_snapshots, factor_snapshots
```

---

**TRACK-20 Statement Pipeline — Phase 3 TASK 9 Complete**
