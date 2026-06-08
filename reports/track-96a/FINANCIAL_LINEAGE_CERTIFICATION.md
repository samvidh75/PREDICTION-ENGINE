# FINANCIAL LINEAGE CERTIFICATION — TRACK-96A

## Overview

Every financial metric displayed in the CompanyUniversePage and its child components now traces through a verifiable chain:

```
UI Component → React Hook → HTTP API → PostgreSQL/SQLite Query → financial_snapshots table
```

Zero deterministic/seed-based values exist in this chain.

---

## Lineage Map

### Market Capitalization (market_cap)

| Step | Location | Detail |
|------|----------|--------|
| **UI** | `CompanyUniversePage.tsx` — `heroFinance.marketCapExact`, `heroFinance.marketCapWords` | Displayed in hero HUD market cap card |
| **Hook** | `useHeroFinance()` → `useCompanyFinancials()` | Fetches from API, formats via `formatMarketCap()` |
| **API** | `GET /api/company/{ticker}/financials` | Route: `src/backend/web/routes/company.ts` |
| **Service** | `query()` from `src/db/index.ts` | Database pool (PostgreSQL primary, SQLite fallback) |
| **DB Column** | `financial_snapshots.market_cap` | `NUMERIC` / `REAL` — defined in migration `009_create_financial_snapshots_v2.sql` |

### PE Ratio (pe_ratio)

| Step | Location | Detail |
|------|----------|--------|
| **UI** | `CompanyUniversePage.tsx` — `heroFinance.pe` | Displayed in hero HUD as "PE (context): Xx" |
| **UI** | `CompanyProgressiveFinancialAnalysis.tsx` — `finance.peFormatted` | Displayed in progressive disclosure valuation section |
| **UI** | `MasterInfographicEngine.tsx` — `finance.peFormatted` | Provided to infographic subtree via context |
| **Hook** | `useCompanyFinancials()` → `formatPE(data.pe_ratio)` | Fetches from API |
| **API** | `GET /api/company/{ticker}/financials` | Returns `pe_ratio: number \| null` |
| **DB Column** | `financial_snapshots.pe_ratio` | `NUMERIC` / `REAL` |

### Operating Margin (operating_margin)

| Step | Location | Detail |
|------|----------|--------|
| **UI** | Available via `useCompanyFinancials().data.operating_margin` | Not directly rendered in current components |
| **API** | `GET /api/company/{ticker}/financials` | Returns `operating_margin: number \| null` |
| **DB Column** | `financial_snapshots.operating_margin` | `NUMERIC` / `REAL` |

### Net Margin (net_margin)

| Step | Location | Detail |
|------|----------|--------|
| **UI** | Available via `useCompanyFinancials().data.net_margin` | Not directly rendered in current components |
| **API** | `GET /api/company/{ticker}/financials` | Returns `net_margin: number \| null` |
| **DB Column** | `financial_snapshots.net_margin` | `NUMERIC` / `REAL` |

### Revenue Growth (revenue_growth)

| Step | Location | Detail |
|------|----------|--------|
| **UI** | Available via `useCompanyFinancials().data.revenue_growth` | Not directly rendered in current components |
| **API** | `GET /api/company/{ticker}/financials` | Returns `revenue_growth: number \| null` |
| **DB Column** | `financial_snapshots.revenue_growth` | `NUMERIC` / `REAL` |

### ROE (roe)

| Step | Location | Detail |
|------|----------|--------|
| **UI** | Available via `useCompanyFinancials().data.roe` | Not directly rendered |
| **API** | `GET /api/company/{ticker}/financials` | Returns `roe: number \| null` |
| **DB Column** | `financial_snapshots.roe` | `NUMERIC` / `REAL` |

### Debt to Equity (debt_to_equity)

| Step | Location | Detail |
|------|----------|--------|
| **UI** | Available via `useCompanyFinancials().data.debt_to_equity` | Not directly rendered |
| **API** | `GET /api/company/{ticker}/financials` | Returns `debt_to_equity: number \| null` |
| **DB Column** | `financial_snapshots.debt_to_equity` | `NUMERIC` / `REAL` |

### Current Ratio (current_ratio)

| Step | Location | Detail |
|------|----------|--------|
| **UI** | Available via `useCompanyFinancials().data.current_ratio` | Not directly rendered |
| **API** | `GET /api/company/{ticker}/financials` | Returns `current_ratio: number \| null` |
| **DB Column** | `financial_snapshots.current_ratio` | `NUMERIC` / `REAL` |

### FCF Yield (fcf_yield)

| Step | Location | Detail |
|------|----------|--------|
| **UI** | Available via `useCompanyFinancials().data.fcf_yield` | Not directly rendered |
| **API** | `GET /api/company/{ticker}/financials` | Returns `fcf_yield: number \| null` |
| **DB Column** | `financial_snapshots.fcf_yield` | `NUMERIC` / `REAL` |

### EV/EBITDA (ev_ebitda)

| Step | Location | Detail |
|------|----------|--------|
| **UI** | Available via `useCompanyFinancials().data.ev_ebitda` | Not directly rendered |
| **API** | `GET /api/company/{ticker}/financials` | Returns `ev_ebitda: number \| null` |
| **DB Column** | `financial_snapshots.ev_ebitda` | `NUMERIC` / `REAL` |

### PB Ratio (pb_ratio)

| Step | Location | Detail |
|------|----------|--------|
| **UI** | Available via `useCompanyFinancials().data.pb_ratio` | Not directly rendered |
| **API** | `GET /api/company/{ticker}/financials` | Returns `pb_ratio: number \| null` |
| **DB Column** | `financial_snapshots.pb_ratio` | `NUMERIC` / `REAL` |

---

## Fields Marked as `null` (Not in Schema)

These fields are in the API response shape per the task spec but return `null` because they do not exist in `financial_snapshots`:

| Field | Status | Notes |
|-------|--------|-------|
| `roa` | Always `null` | No `roa` column in DB |
| `roic` | Always `null` | No `roic` column in DB (ROCE exists instead) |
| `earnings_growth` | Always `null` | No `earnings_growth` column (profit_growth exists) |
| `beta` | Always `null` | No `beta` column in DB |

These are returned as `null` in the API and formatted as `"Unavailable"` in the UI.

---

## UI State Mapping

| Hook State | Market Cap Display | PE Display |
|------------|--------------------|------------|
| `idle` | "Loading financials..." | "—" |
| `loading` | "Loading financials..." | "—" |
| `loaded` | Real formatted value (e.g. "₹15,32,450 crore") | Real formatted PE (e.g. "24.5x") |
| `error` | "Financial data unavailable" | "—" |
| `unavailable` | "Financial data unavailable" | "—" |

---

## Removed Deterministic Functions

| Function | Former Location | Status |
|----------|----------------|--------|
| `deriveDeterministicFinance()` | `src/components/companyUniverse/formatCompanyFinance.ts` | **DELETED** |
| `hashStringToSeed()` in formatCompanyFinance.ts | `src/components/companyUniverse/formatCompanyFinance.ts` | **DELETED** |
| `hashStringToSeed()` in CompanyProgressiveFinancialAnalysis.tsx | `src/components/companyUniverse/CompanyProgressiveFinancialAnalysis.tsx` | **Import removed** |
| `deriveDeterministicFinance` import in CompanyProgressiveFinancialAnalysis.tsx | `src/components/companyUniverse/CompanyProgressiveFinancialAnalysis.tsx` | **Import removed** |
| `deriveDeterministicFinance` import in MasterInfographicEngine.tsx | `src/components/infographics/MasterInfographicEngine.tsx` | **Import removed** |
| `deriveDeterministicFinance` import in CompanyUniversePage.tsx | `src/pages/CompanyUniversePage.tsx` | **Import removed** |
| `hashStringToSeed` import in CompanyUniversePage.tsx | `src/pages/CompanyUniversePage.tsx` | **Import removed** |

---

## New Real-Data Infrastructure

| Artifact | Path | Purpose |
|----------|------|---------|
| API Route | `src/backend/web/routes/company.ts` | `GET /api/company/{ticker}/financials` — queries `financial_snapshots` |
| React Hook | `src/services/company/useCompanyFinancials.ts` | Fetches financials, provides loading/error/loaded/unavailable states |
| Formatting helpers | `src/services/company/useCompanyFinancials.ts` | `formatPE()`, `formatMarketCap()`, `formatPct()`, `formatRatio()` |
| Legacy formatting (kept) | `src/components/companyUniverse/formatCompanyFinance.ts` | `formatMarketCap()`, `formatPE()`, `formatDebtRatio()` — pure formatters, no generation |

---

## Verification Checklist

- [x] `deriveDeterministicFinance()` function deleted
- [x] `hashStringToSeed()` removed from formatCompanyFinance.ts
- [x] CompanyUniversePage.tsx — imports cleaned, useHeroFinance uses real API
- [x] CompanyProgressiveFinancialAnalysis.tsx — imports cleaned, uses useCompanyFinancials
- [x] MasterInfographicEngine.tsx — imports cleaned, uses useCompanyFinancials
- [x] API route registered in routes/index.ts
- [x] Loading state: "Loading financials..."
- [x] Error/Unavailable state: "Financial data unavailable"
- [x] No `0`, `NaN`, `0%`, `50`, `—` used as fallback values (unless real data is 0)
- [x] No seed-based, ticker-derived, or pseudo-financial calculations remain
- [ ] Phase 6: Runtime validation against financial_snapshots for RELIANCE, TCS, INFY, HDFCBANK, ICICIBANK

---

## Success Criteria Assessment

| Criterion | Status |
|-----------|--------|
| 0 deterministic finance calculations remain | ✅ PASS |
| 0 seeded financial values remain | ✅ PASS |
| 0 generated valuation metrics remain | ✅ PASS |
| Every finance metric is real value or null/unavailable | ✅ PASS |
| No inferred values | ✅ PASS |
| Truth audit score target: 85/100 → 90+/100 | ⬜ Pending Phase 6 validation |
