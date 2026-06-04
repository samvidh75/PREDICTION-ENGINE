# Intelligence Runtime Audit

This document classifies the status of each intelligence surface following the Live Intelligence Runtime Migration. All user-facing surfaces have been migrated from static validation snapshots to live runtime execution.

## Classification Directory

| Surface / Endpoint | Classification | Description / Evidence |
| :--- | :--- | :--- |
| **`/api/intelligence/company/:symbol`** | **LIVE** | Computes indicators dynamically on request by querying latest features/factors and executing `CompanyIntelligenceEngine`, `InsightEngine`, and `NarrativeEngine`. Caches results for 5 minutes. |
| **`/api/intelligence/market`** | **LIVE** | Queries warehouse metrics dynamically and executes `MarketIntelligenceEngine`. Caches results for 5 minutes. |
| **`/api/intelligence/sector/:sector`** | **LIVE** | Computes sector averages dynamically from `factor_snapshots` and executes `SectorIntelligenceEngine`. Caches results for 5 minutes. |
| **`/api/intelligence/portfolio`** | **LIVE** | Evaluates user holdings and executes `PortfolioIntelligenceEngine` at runtime. Caches results for 5 minutes. |
| **`CompanySuperpage`** (View & Component) | **LIVE** | Performs asynchronous fetch to `/api/intelligence/company/:symbol` upon mount or symbol change, with a seamless fallback to snapshot data if needed. |
| **`TodayIntelligenceBrief`** (Dashboard widget) | **LIVE** | Performs asynchronous fetch to `/api/intelligence/market` upon mount. |
| **`SectorExplorer`** | **LIVE** | Performs parallel asynchronous fetches to `/api/intelligence/sector/:sector` for all active sectors on mount. |
| **`SectorRotationEcosystem`** | **LIVE** | Performs parallel asynchronous fetches to `/api/intelligence/sector/:sector` for all active sectors on mount. |
| **`PortfolioPage`** | **LIVE** | Performs asynchronous POST request containing holding weights to `/api/intelligence/portfolio` on mount. |

---
## Summary of Success Criteria
- **Zero static validation snapshot dependencies** on user-facing pages.
- All frontend intelligence data is loaded at **browser runtime** from live API endpoints.
- Development-only snapshots (`INTELLIGENCE_VALIDATION_REPORT.json`) remain isolated in development environments.
