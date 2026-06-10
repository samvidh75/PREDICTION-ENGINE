# P1 Mega Defect Inventory

| Defect ID | Category | File | Error Count | Active Runtime? | Public-Beta Blocking? | Repair Plan |
|-----------|----------|------|-------------|-----------------|-----------------------|-------------|
| P1-TS-001 | Active-runtime TypeScript | `src/backend/monitoring/requestIdPlugin.ts` | 2 | YES | YES | Add Fastify request augmentation for `requestId` or use typed decoration pattern. |
| P1-TS-002 | Active-runtime TypeScript | `src/backend/persistence/cache/cachePlugin.ts`, `src/backend/persistence/postgres/postgresPlugin.ts` | 3 | YES | YES | Add/centralize Fastify `env` instance augmentation. |
| P1-TS-003 | Active-runtime TypeScript | `src/backend/web/app.ts` | 1 | YES | YES | Resolve duplicate Fastify `db` declaration modifier mismatch. |
| P1-TS-004 | Active-runtime TypeScript | `src/backend/web/routes/retention.ts` | 10+ | YES | YES | Type route generics via Fastify route generic parameters instead of handler-only narrowed request types. |
| P1-TS-005 | Active-runtime TypeScript | `src/backend/web/routes/ops.ts` | 1 | YES | YES | Narrow diagnostics timestamp before constructing `Date`. |
| P1-TS-006 | Active-runtime TypeScript | `src/services/FactorEngine.ts`, `src/services/FeatureEngine.ts`, `src/predictions/**`, `src/data/**`, `src/backtest/**`, `src/monitoring/**`, `src/portfolio/**`, `src/opportunities/**` | 100+ | YES | YES | Add typed row interfaces and query generics/narrowing at DB boundaries. |
| P1-TS-007 | Active-runtime TypeScript | `src/components/discovery/MarketExplorer.tsx` | 2 | YES | YES | Respect nullable `peRatio` before arithmetic. |
| P1-TS-008 | Active-runtime TypeScript | `src/services/retention/SubscriptionService.ts` | 2 | YES | YES | Return or handle nullable subscription honestly. |
| P1-LINT-001 | Legacy-only ESLint | `scripts/adaptive-calibration.ts`, `scripts/track*.ts`, historical scripts | 20+ errors/warnings | NO | YES while global lint includes them | Split active lint from legacy scripts or repair small script errors without weakening active rules. |
| P1-LINT-002 | Active-code ESLint | `src/App.tsx`, backend routes, service modules | 100+ warnings | YES | YES due `--max-warnings=0` | Remove unused vars, replace console with logger or configured backend allowances, tighten `any` where feasible. |
| P1-TEST-001 | Coverage gap | `src/db/__tests__/p0-stabilization.test.ts` | 2 failed tests | YES | YES | Align tests with explicit `DB_ADAPTER=sqlite` policy; no implicit fallback. |
| P1-SCHEMA-001 | Query-schema | `scripts/validate-schema-contract.ts` | 1 exception | YES | YES | Replace CommonJS `require` usage in ESM script with `createRequire` or ESM-compatible loading. |
| P1-QUERY-001 | Query-schema | `src/backend/web/routes/stockstory.ts` | 4 terms | YES | YES | Make validator ignore comments/response labels or remove obsolete comment text while preserving canonical queries. |
| P1-QUERY-002 | Query-schema | `src/intelligence/PredictionExplanationEngine.ts`, `src/predictions/PredictionFactory.ts` | 2 terms | YES | YES | Classify true query usage vs type/property names; repair active obsolete query references and tighten validator parsing. |
| P1-DATA-001 | Data-integrity | `src/backend/web/routes/intelligence.ts` | 1 critical, 1 warning | YES | YES | Remove or explicitly label synthetic/demo branches; ensure production cannot leak demo/fallback as real. |
| P1-DATA-002 | Data-integrity | `src/services/CompanyIntelligenceEngine.ts` | 1 critical | YES | YES | Replace silent synthetic fallback with unavailable/partial state contract. |
| P1-DATA-003 | Data-integrity | `src/components/company/SuperpageV8.tsx`, `src/intelligence/ExplainabilityEngine.ts`, `src/shared/data/DataFreshness.ts`, `src/stockstory/types.ts` | 5 warnings | YES | YES | Classify live-claim findings and either fix wording or tighten validator false positives. |
| P1-HYGIENE-001 | Hygiene | `src/db/DatabasePolicy.ts`, `src/db/__tests__/p0-stabilization.test.ts`, selected scripts | 5 potential secrets | MIXED | YES | Classify placeholders/test fixtures vs true secrets; refine scanner narrowly and remove any real secret. |
| P1-HYGIENE-002 | Hygiene | `scripts/validate-repository-hygiene.ts` | 7 self-match warnings | NO | YES | Prevent hygiene scanner from flagging its own detection strings as active defects. |
| P1-DEP-001 | Dependency vulnerability | `firebase-admin` transitive `uuid` chain | 8 moderate production audit findings | YES | NO for high/critical gate | Document moderate transitive risk; no forced major upgrade without approval. |
| P1-BUILD-001 | Build inconsistency | `package.json`, tsconfigs | 3 failing build scripts | YES | YES | Repair typecheck/compile blockers, add explicit required build scripts. |
| P1-DOCKER-001 | Docker | local environment | NOT EXECUTED | YES | YES | Docker unavailable locally; CI proof required unless Docker is installed. |
