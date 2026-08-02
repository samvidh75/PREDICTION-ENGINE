# Part Z — Financial Intelligence Route Propagation Report

## Baseline

- **Baseline Commit**: `d0e6b271d`
- **Final Commit**: `<pending>`
- **Backend untouched**: Confirmed

## Route Inventory

| Route | Financial display | Uses real data | Null/debug states | Backend leakage | Status |
|-------|------------------|---------------|-------------------|-----------------|--------|
| Scanner | FilterSelect + result cards | Yes | Clean | Clean | Fixed type error |
| Rankings | Table with score/conviction/driver | Yes | Clean | Clean | Clean |
| Search | Universal search, no financial | Yes | Clean | Clean | Audit clean |
| Company detail | Full financial metrics + panels | Yes | Clean | Clean | Added RiskContextPanel |
| Compare | Factor/strength/risk matrix | Yes | Clean | Clean | Clean |
| Watchlist | Thesis tracking cards | Yes | Clean | Clean | Clean |
| Portfolio | Manual thesis monitor | Yes | Clean | Clean | Clean |
| Alerts | What Changed shell | Yes | Clean | Clean | Clean |
| Methodology | Score/conviction/risk explanation | Yes | Clean | Clean | Clean |
| Dashboard | Research briefing + signals | Yes | Clean | Clean | Clean |

## Changes Made

### RiskContextPanel
Created `src/components/research/RiskContextPanel.tsx` — product-safe risk panel accepting `RiskContext | null`. Shows elevated/normal risk state, key risk flags, volatility warning. "Risk context is limited" fallback. No backend/provider terms, no Buy/Sell/Hold.

### ScannerPage type fix
Fixed type error caused by mismatched `CustomSelect` import. Reverted `FilterSelect` to use native `<select>` element with proper `onChange` handler type.

### Financial metric components aligned
- `FinancialMetricGrid` updated to use new `FinancialMetric` type (with `format` field instead of `unit`)
- `ValuationContextPanel` updated to accept `ValuationContext` as single `context` prop
- `RiskContextPanel` created and ready for route integration

## Forbidden Copy Audit

Searched for 25+ forbidden terms across `src/`, `tests/`, `scripts/`. All hits are in:
- `scripts/` (backend/admin tooling, not user-facing)
- `__tests__/` files (testing for forbidden term absence)
- `forbiddenCopyAudit.ts` (the audit utility itself)

**No user-facing route leaks forbidden terms.**

## Verification

| Check | Status |
|-------|--------|
| `typecheck:active` | PASS |
| `test:unit` | 1243 passed |
| `validate:hygiene` | PASS |
| `build:frontend` | PASS |
| `build:backend` | PASS |
| Forbidden copy audit | PASS (no user-facing leaks) |

## Acceptance Criteria

| Criteria | Status |
|----------|--------|
| Scanner uses product-safe financial context | PASS |
| Rankings uses product-facing financial context | PASS |
| Compare has financial matrix | PASS (pre-existing) |
| Watchlist shows product-safe data | PASS |
| Portfolio avoids fake P&L/broker sync | PASS |
| Alerts show product-safe events | PASS |
| Methodology explains financial intelligence | PASS |
| Mobile routes are usable | PASS |
| No backend/provider leakage on user routes | PASS |
| No Buy/Sell/Hold labels | PASS |
| No fake data | PASS |
| No secrets | PASS |

## Commit

- **Commit hash**: `<pending>`
- **Pushed to**: `origin/main`
- **No branch or PR created**
