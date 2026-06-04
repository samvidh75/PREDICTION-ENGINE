# Engine Execution Verification Report

This report verifies the runtime execution patterns of StockStory's intelligence engines.

---

## Runtime Execution Table

| Engine | Called at Runtime? | Called on Page Load? | Called on Data Refresh? | Execution Context |
|---|---|---|---|---|
| **CompanyIntelligenceEngine** | No | No | No | Offline batch-computation script |
| **MarketIntelligenceEngine** | No | No | No | Offline batch-computation script |
| **SectorIntelligenceEngine** | No | No | No | Offline batch-computation script |
| **PortfolioIntelligenceEngine** | No | No | No | Offline batch-computation script |
| **NarrativeEngine** | No | No | No | Offline batch-computation script |

---

## Detailed Findings

1. **Database Dependency**:
   - `MarketIntelligenceEngine`, `SectorIntelligenceEngine`, and `PortfolioIntelligenceEngine` import `query` from `src/db/index` to run SQL queries against PostgreSQL.
   - `pg` (node-postgres) is a Node.js-only driver and cannot execute inside the browser environment.
   - Vite prevents the execution of these raw modules inside browser runtimes, requiring them to execute strictly during server-side batch backfills or validation runs.

2. **Validation & Refresh Flow**:
   - The validation runs (`run-intelligence-validation.ts`) execute these engines directly in Node.js, pulling raw database inputs, computing factors, generating narratives, and writing static results to JSON.
   - Page loads and refreshes in the browser load the client-side module provider mapping, without triggering live database recomputations.
