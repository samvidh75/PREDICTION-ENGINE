# Hardcoded Data Remediation Plan

This plan documents the hardcoded datasets, static company profiles, and mock metrics identified inside the V3 dashboard and company views, along with strategies to replace them with live/persisted API bindings.

---

## 1. Dashboard Page Data Audit (`DashboardHub.tsx`)

| Element | File | Line Range | Classification | Replacement Source |
| :--- | :--- | :--- | :--- | :--- |
| **Market Terminal Questions** | `DashboardHub.tsx` | 40-52 | **MOCK** | `getMarketIntelligence()` API state response mapping. |
| **Daily Flows Metrics** | `DashboardHub.tsx` | 55-65 | **MOCK** | Endpoint `/api/intelligence/market` |
| **Benchmark indices values** | `DashboardHub.tsx` | 80-100 | **MOCK** | Endpoint `/api/intelligence/market` |
| **Ownership Shifts Comment** | `DashboardHub.tsx` | 130-138 | **MOCK** | `/api/intelligence/watchlist` data structure |
| **Movers & Changes** | `DashboardHub.tsx` | 110-128 | **MOCK** | Ticker delta queries from backend server database. |

---

## 2. Company Page Data Audit (`CompanySuperpage.tsx`)

| Element | File | Line Range | Classification | Replacement Source |
| :--- | :--- | :--- | :--- | :--- |
| **Executive Summary Text** | `CompanySuperpage.tsx` | 74-88 | **MOCK** | `/api/intelligence/company/${symbol}` summary field. |
| **The Story Paragraphs** | `CompanySuperpage.tsx` | 91-105 | **MOCK** | `/api/intelligence/company/${symbol}` outlook narrative data. |
| **Financial Quality Sparklines** | `CompanySuperpage.tsx` | 130-150 | **MOCK** | `/api/company/${symbol}/financials` trend series. |
| **Ownership Trends Share Shares** | `CompanySuperpage.tsx` | 154-174 | **MOCK** | `/api/company/${symbol}/ownership` shareholding patterns. |
| **Valuation Context Description**| `CompanySuperpage.tsx` | 178-190 | **MOCK** | `/api/company/${symbol}/valuation` multipliers. |
| **Risks Listing** | `CompanySuperpage.tsx` | 194-210 | **MOCK** | `/api/company/${symbol}/risks` list arrays. |
| **Catalysts Listing** | `CompanySuperpage.tsx` | 214-230 | **MOCK** | `/api/company/${symbol}/catalysts` list arrays. |
| **Timeline Ledger** | `CompanySuperpage.tsx` | 234-250 | **MOCK** | `/api/company/${symbol}/timeline` announcements tracker. |

---

## 3. Replacement Schedule
1. **Endpoint Alignment**: Create unified API endpoints in the backend fastify server returning the correct JSON structures for company-specific data blocks (Ownership, Valuation, Risks, Timelines).
2. **State Hydration**: Refactor views to load these data arrays during `useEffect` hooks, managing local React state updates.
