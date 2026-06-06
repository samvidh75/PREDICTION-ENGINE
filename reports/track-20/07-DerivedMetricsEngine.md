# 07 — Derived Metrics Engine

**TRACK-20 Phase 3 — Task 8**
**Date:** 2026-06-06

---

## Purpose

When providers return raw financial statements but NOT computed ratios, or when a computed ratio is available from one provider but we need cross-validation, the DerivedMetricsEngine computes financial metrics from raw statement data.

**Core principle:** A metric derived from audited financial statements is REAL DATA. It is not synthetic. The statement numbers are sourced from a provider (Finnhub, Upstox) — the computation is a formula, not an invention.

---

## Derivable Metrics Catalog

### From Balance Sheet

| Metric | Formula | Raw Inputs |
|--------|---------|------------|
| **debtToEquity** | Total Liabilities / Total Equity | `totalLiabilities`, `totalEquity` |
| **currentRatio** | Current Assets / Current Liabilities | `currentAssets`, `currentLiabilities` |
| **roa** | Net Income (IS) / Total Assets (BS) | `netIncome` (IS), `totalAssets` (BS) |
| **bookValue** | Total Equity / Shares Outstanding | `totalEquity`, `sharesOutstanding` |

### From Income Statement

| Metric | Formula | Raw Inputs |
|--------|---------|------------|
| **grossMargin** | Gross Profit / Revenue | `grossProfit`, `revenue` |
| **operatingMargin** | Operating Income / Revenue | `operatingIncome`, `revenue` |
| **profitMargin** | Net Income / Revenue | `netIncome`, `revenue` |

### Growth Rates (from historical IS/BS/CF)

| Metric | Formula | Raw Inputs |
|--------|---------|------------|
| **revenueGrowth** | (Revenue_T - Revenue_T-1) / \|Revenue_T-1\| | `revenue` (2 periods) |
| **profitGrowth** | (NetIncome_T - NetIncome_T-1) / \|NetIncome_T-1\| | `netIncome` (2 periods) |
| **epsGrowth** | (EPS_T - EPS_T-1) / \|EPS_T-1\| | `eps` (2 periods) |
| **fcfGrowth** | (FCF_T - FCF_T-1) / \|FCF_T-1\| | `fcf` (2 periods) |

### From Cash Flow Statement

| Metric | Formula | Raw Inputs |
|--------|---------|------------|
| **fcfYield** | Free Cash Flow / Market Cap | `freeCashFlow` (CF), `marketCap` (metadata) |
| **fcfToRevenue** | FCF / Revenue | `freeCashFlow` (CF), `revenue` (IS) |
| **capexToRevenue** | CapEx / Revenue | `capitalExpenditure` (CF), `revenue` (IS) |

### Cross-Statement Metrics

| Metric | Formula | Raw Inputs |
|--------|---------|------------|
| **roic** | NOPAT / Invested Capital | NOPAT = Operating Income × (1 - taxRate), Invested Capital = Total Assets - Current Liabilities - Cash |
| **assetTurnover** | Revenue / Total Assets | `revenue` (IS), `totalAssets` (BS) |
| **inventoryTurnover** | COGS / Avg Inventory | `cogs` (IS), `inventory` (BS, 2 periods) |

---

## Architecture

```
┌──────────────────────────────────────────────┐
│            DerivedMetricsEngine              │
├──────────────────────────────────────────────┤
│                                              │
│  Input: RawStatementData                     │
│  ┌────────────────────────────┐              │
│  │ balanceSheet: {            │              │
│  │   totalAssets,             │              │
│  │   totalLiabilities,        │              │
│  │   totalEquity,             │              │
│  │   currentAssets,           │              │
│  │   currentLiabilities,      │              │
│  │   inventory,               │              │
│  │   cash,                    │              │
│  │   ...                      │              │
│  │ }                          │              │
│  │ incomeStatement: {         │              │
│  │   revenue,                 │              │
│  │   grossProfit,             │              │
│  │   operatingIncome,         │              │
│  │   netIncome,               │              │
│  │   eps,                     │              │
│  │   ...                      │              │
│  │ }                          │              │
│  │ cashFlow: {                │              │
│  │   operatingCashFlow,       │              │
│  │   capitalExpenditure,      │              │
│  │   freeCashFlow,            │              │
│  │   ...                      │              │
│  │ }                          │              │
│  └────────────────────────────┘              │
│                                              │
│  Process:                                    │
│  ┌──────────────────────────────────────┐    │
│  │ 1. Validate inputs (non-null, finite) │    │
│  │ 2. Apply formula                      │    │
│  │ 3. Apply guardrails (cap at sane max) │    │
│  │ 4. Produce DerivedMetrics             │    │
│  └──────────────────────────────────────┘    │
│                                              │
│  Output: DerivedFinancialMetrics             │
│  ┌────────────────────────────┐              │
│  │ roa: number | null          │              │
│  │ roic: number | null         │              │
│  │ debtToEquity: number | null │              │
│  │ currentRatio: number | null │              │
│  │ grossMargin: number | null  │              │
│  │ operatingMargin: number | null│            │
│  │ profitMargin: number | null │              │
│  │ revenueGrowth: number | null│              │
│  │ profitGrowth: number | null │              │
│  │ epsGrowth: number | null    │              │
│  │ fcfGrowth: number | null    │              │
│  │ fcfYield: number | null     │              │
│  │ assetTurnover: number | null│              │
│  │ ...                         │              │
│  └────────────────────────────┘              │
│                                              │
└──────────────────────────────────────────────┘
```

---

## Formula Specifications

### 1. roa (Return on Assets)

```
roa = netIncome / totalAssets

Guards:
- netIncome and totalAssets must be non-null, finite
- totalAssets must be > 0
- Result clamped to [-1.0, 1.0] (anything beyond is likely data error)
- If netIncome is negative, roa is negative — valid
```

**Source equivalence:** Upstox returns ROA directly. Finnhub does NOT. This is the primary derivation needed for Finnhub-only path.

### 2. roic (Return on Invested Capital)

```
nopat = operatingIncome * (1 - effectiveTaxRate)
effectiveTaxRate = incomeTaxExpense / preTaxIncome
investedCapital = totalAssets - currentLiabilities - cash

roic = nopat / investedCapital

Guards:
- All inputs must be non-null, finite
- investedCapital must be > 0
- Result clamped to [-2.0, 2.0]
```

**Fallback when tax rate unavailable:** Use default Indian corporate tax rate 25.17% (FY2024-25).

### 3. debtToEquity

```
debtToEquity = totalLiabilities / totalEquity

Guards:
- totalEquity must be > 0 (negative equity is a red flag, handle separately)
- Result clamped to [-50, 50]
- If totalEquity <= 0, mark as 'Negative Equity' and return null with annotation
```

### 4. currentRatio

```
currentRatio = currentAssets / currentLiabilities

Guards:
- currentLiabilities must be > 0
- Result clamped to [0, 20]
```

### 5. grossMargin

```
grossMargin = grossProfit / revenue

Guards:
- revenue must be > 0
- Result clamped to [0, 1]
```

### 6. operatingMargin

```
operatingMargin = operatingIncome / revenue

Guards:
- revenue must be > 0
- Result clamped to [-1, 1] (negative operating income is possible)
```

### 7. Growth Rate Formulas

All growth rates use the absolute denominator to handle negative base values:

```
growth = (current - previous) / |previous|

Guards:
- Both current and previous must be non-null, finite
- previous must not be 0
- Result clamped to [-10, 10] (1000% growth in one year is suspect)
```

---

## Validation Rules

Before any derived metric is accepted, the DerivedMetricsEngine applies:

1. **Null Safety** — Any null input → null output (no synthetic fill)
2. **Division by Zero** — Denominator = 0 → null output with warning logged
3. **Infinity Check** — All inputs must be `Number.isFinite()`
4. **Sign Sanity** — Some metrics have expected signs:
   - `grossMargin` should be > 0 for going concerns (negative is possible for distressed companies but rare)
   - `currentRatio` should be > 0
   - `debtToEquity` negative when equity is negative → flag
5. **Range Guards** — Clamp all outputs to physically possible ranges

---

## Integration with ProviderCoordinator

The DerivedMetricsEngine operates as a **post-processing step** after all providers return:

```
ProviderCoordinator.getFinancials(symbol)
  ↓
Finnhub returns: { peRatio, pbRatio, roe, eps, revenue, totalAssets, ... }
  ↓
DerivedMetricsEngine.compute(rawStatements)
  ↓
Merged FinancialSnapshot:
  { peRatio (Finnhub), pbRatio (Finnhub), roe (Finnhub),
    roa (DERIVED), debtToEquity (DERIVED), grossMargin (DERIVED), ... }
```

**Rule:** Provider-returned values take priority. Derived values fill gaps ONLY.

---

## Test Cases

| Test | Inputs | Expected | Notes |
|------|--------|----------|-------|
| Standard roa | NI=10000, TA=100000 | 0.10 | 10% ROA |
| Negative roa | NI=-5000, TA=100000 | -0.05 | Loss-making company |
| Zero assets | NI=1000, TA=0 | null | Division by zero → null |
| Infinity input | NI=Infinity, TA=100000 | null | Data quality error |
| Standard D/E | TL=50000, TE=100000 | 0.50 | Moderate leverage |
| Negative equity | TL=100000, TE=-5000 | null + flag | Distressed company |
| Gross margin | GP=40000, Rev=100000 | 0.40 | 40% margin |
| Zero revenue | GP=40000, Rev=0 | null | Division by zero |

---

**TRACK-20 Derived Metrics Engine — Phase 3 TASK 8 Complete**
