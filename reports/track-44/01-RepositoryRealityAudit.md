# Repository Reality Audit — TRACK-44 Agent A

**Generated:** 2026-06-06T21:15:10.676Z
**Root:** C:\Users\Samvidh\OneDrive\Desktop\STOCKSTORY\PREDICTION-ENGINE
**Total Files Audited:** 1114

---

## Executive Summary

| Classification | Count | % |
|---------------|-------|---|
| KEEP | 782 | 70.2% |
| MERGE | 0 | 0.0% |
| DELETE | 217 | 19.5% |
| REVIEW | 115 | 10.3% |

**Cleanup Opportunity:** 19.5% (217 files out of 1114)
**Target Range:** 20-40% → BELOW TARGET

---

## File Type Breakdown

| Extension | Source Files | Scripts | Config | Reports | Other |
|-----------|-------------|---------|--------|---------|-------|
| .ts | 518 | 25 | 0 | 0 | 0 |
| .tsx | 203 | 0 | 0 | 0 | 0 |
| .cjs | 0 | 42 | 0 | 0 | 0 |
| .js | 2 | 0 | 0 | 0 | 0 |
| .md | 0 | 0 | 0 | 658 | 200 |
| .sql | 9 | 0 | 0 | 0 | 0 |

---

## Source Files: 768
- TypeScript (.ts): 518
- TypeScript React (.tsx): 203
- JavaScript (.js/.cjs): 2

## Scripts: 69
- TypeScript: 25
- CommonJS: 42
- Python: 1

## Migrations: 9
- 001_create_warehouse_tables.sql
- 002b_create_user_profiles.sql
- 002_create_feature_factor_tables.sql
- 003_create_investor_state.sql
- 004_create_company_intelligence_tables.sql
- 005_add_stockstory_financial_columns.sql
- 006_add_roa_column.sql
- 007_create_master_registry.sql
- 008_create_prediction_registry.sql

## Reports: 858
(reports/ + root .md files combined)

---

## Potential Unused Source Files

None detected (all files referenced by at least one other file)

---

## DELETE Candidates (217 files)

- [ ] ABOUT_PAGE_SPEC.md — Intermediate audit/fix document
- [ ] ACQUISITION_SURFACE_AND_GAPS.md — Intermediate audit/fix document
- [ ] ACTIVE_MOCK_USAGE_REPORT.md — Old audit report — can be regenerated
- [ ] ACTIVE_PROVIDER_TRACE.md — Intermediate audit/fix document
- [ ] ALERT_ENGINE_REPORT.md — Old audit report — can be regenerated
- [ ] ALERT_REALITY_AUDIT.md — Old audit report — can be regenerated
- [ ] ALGORITHM_AUDIT.md — Old audit report — can be regenerated
- [ ] ANALYTICS_IMPLEMENTATION_PLAN.md — Intermediate audit/fix document
- [ ] ANALYTICS_IMPLEMENTATION_REPORT.md — Old audit report — can be regenerated
- [ ] API_AUDIT.md — Old audit report — can be regenerated
- [ ] API_RUNTIME_REPORT.md — Old audit report — can be regenerated
- [ ] API_TRACE_REPORT.md — Old audit report — can be regenerated
- [ ] APPLICATION_STATE_REPORT.md — Old audit report — can be regenerated
- [ ] AuthenticationUXReport.md — Intermediate audit/fix document
- [ ] AUTHENTICATION_REBUILD_REPORT.md — Old audit report — can be regenerated
- [ ] AUTH_FINAL_VERIFICATION_REPORT.md — Old audit report — can be regenerated
- [ ] AUTH_FLOW_SPEC.md — Intermediate audit/fix document
- [ ] AUTH_GATEWAY_REMOVAL_PLAN.md — Intermediate audit/fix document
- [ ] AUTH_PRODUCTION_FIX_REPORT.md — Old audit report — can be regenerated
- [ ] AUTH_UI_REWRITE_REPORT.md — Old audit report — can be regenerated
- [ ] AUTH_UX_CLEANUP_REPORT.md — Old audit report — can be regenerated
- [ ] AUTH_VERIFICATION_AUDIT.md — Old audit report — can be regenerated
- [ ] BACKFILL_PROGRESS_REPORT.md — Old audit report — can be regenerated
- [ ] BACKFILL_READINESS_REPORT.md — Old audit report — can be regenerated
- [ ] BEGINNER_INVESTOR_AUDIT.md — Old audit report — can be regenerated
- [ ] Bottom20Report.md — Intermediate audit/fix document
- [ ] BROWSER_RUNTIME_AUDIT.md — Old audit report — can be regenerated
- [ ] BUILD_REALITY_REPORT.md — Old audit report — can be regenerated
- [ ] CHART_RUNTIME_REPORT.md — Old audit report — can be regenerated
- [ ] CLOSED_BETA_READINESS_REPORT.md — Old audit report — can be regenerated
- [ ] COMPANY_PAGE_MASTER_SPEC.md — Intermediate audit/fix document
- [ ] COMPANY_PAGE_REALITY_AUDIT.md — Old audit report — can be regenerated
- [ ] COMPANY_PAGE_REVIEW.md — Old audit report — can be regenerated
- [ ] COMPANY_PAGE_TRUTH_AUDIT.md — Old audit report — can be regenerated
- [ ] COMPANY_PAGE_V3_SPEC.md — Intermediate audit/fix document
- [ ] COMPANY_V3_IMPLEMENTATION_REPORT.md — Old audit report — can be regenerated
- [ ] ComplianceAudit.md — Intermediate audit/fix document
- [ ] DailyProviderHealthReport.md — Intermediate audit/fix document
- [ ] DAILY_BRIEF_REALITY_AUDIT.md — Old audit report — can be regenerated
- [ ] DAILY_BRIEF_REPORT.md — Old audit report — can be regenerated
- [ ] DASHBOARD_REDESIGN_SPEC.md — Intermediate audit/fix document
- [ ] DASHBOARD_V3_IMPLEMENTATION_REPORT.md — Old audit report — can be regenerated
- [ ] DASHBOARD_V3_SPEC.md — Intermediate audit/fix document
- [ ] DASHBOARD_V3_VERIFICATION_REPORT.md — Old audit report — can be regenerated
- [ ] DATABASE_AUDIT.md — Old audit report — can be regenerated
- [ ] DATA_FLOW_AUDIT.md — Old audit report — can be regenerated
- [ ] DATA_LINEAGE_REPORT.md — Old audit report — can be regenerated
- [ ] DATA_PROVENANCE_TRUST_SCORE.md — Intermediate audit/fix document
- [ ] DEPLOYMENT_VALIDATION_REPORT.md — Old audit report — can be regenerated
- [ ] DISCOVERY_AUDIT.md — Old audit report — can be regenerated

... and 167 more

---

## MERGE Candidates (0 files)

None

---

## REVIEW Required (115 files)

- [x] docs\STAGE_11_DEPLOYMENT_SUMMARY.html — Unclassified — needs manual review
- [x] docs\STAGE_12_DEPLOYMENT_SUMMARY.html — Unclassified — needs manual review
- [x] execution_proof_build.log — Unclassified — needs manual review
- [x] execution_proof_typecheck.log — Unclassified — needs manual review
- [x] firestore.rules — Unclassified — needs manual review
- [x] fix.js — Unclassified — needs manual review
- [x] LIVE_DATA_AUDIT.json — Unclassified — needs manual review
- [x] LIVE_INTELLIGENCE_EXECUTION_REPORT.json — Unclassified — needs manual review
- [x] LIVE_RECOMPUTATION_REPORT.json — Unclassified — needs manual review
- [x] LIVE_VALIDATION_RESULTS.json — Unclassified — needs manual review
- [x] MASTER_SYMBOL_COUNT.json — Unclassified — needs manual review
- [x] package-lock.json — Unclassified — needs manual review
- [x] public\favicon.ico — Unclassified — needs manual review
- [x] public\manifest.json — Unclassified — needs manual review
- [x] public\robots.txt — Unclassified — needs manual review
- [x] public\sitemap.xml — Unclassified — needs manual review
- [x] run_puppeteer.mjs — Unclassified — needs manual review
- [x] schema.env.example — Unclassified — needs manual review
- [x] scripts\adaptive-calibration.ts — Unclassified — needs manual review
- [x] scripts\backtesting-framework.ts — Unclassified — needs manual review
- [x] scripts\db-health.cjs — Unclassified — needs manual review
- [x] scripts\expand-registry.ts — Unclassified — needs manual review
- [x] scripts\factor-quality-audit.ts — Unclassified — needs manual review
- [x] scripts\fix_tests.cjs — Unclassified — needs manual review
- [x] scripts\fix_tests2.cjs — Unclassified — needs manual review
- [x] scripts\fundamental-completion.ts — Unclassified — needs manual review
- [x] scripts\fundamental-integration.ts — Unclassified — needs manual review
- [x] scripts\generateCompanyQualityReports.ts — Unclassified — needs manual review
- [x] scripts\institutional-backtesting.ts — Unclassified — needs manual review
- [x] scripts\institutional-ranking-validator.ts — Unclassified — needs manual review
- [x] scripts\liveProviderValidation.ts — Unclassified — needs manual review
- [x] scripts\provider-probe.ts — Unclassified — needs manual review
- [x] scripts\rc-upstox-001.ts — Unclassified — needs manual review
- [x] scripts\real-backtesting-framework.ts — Unclassified — needs manual review
- [x] scripts\real-financial-integration.ts — Unclassified — needs manual review
- [x] scripts\revalidation-backtest.ts — Unclassified — needs manual review
- [x] scripts\security-master-validator.ts — Unclassified — needs manual review
- [x] scripts\track-7e-live-fundamental-activation.ts — Unclassified — needs manual review
- [x] scripts\track-7g-yahoo-fundamentals.ts — Unclassified — needs manual review
- [x] scripts\track-7h-a-validation.ts — Unclassified — needs manual review
- [x] scripts\track-7h-portfolio-intelligence.ts — Unclassified — needs manual review
- [x] scripts\track-8a-fundamentals.ts — Unclassified — needs manual review
- [x] scripts\track-8b-score-integrity.ts — Unclassified — needs manual review
- [x] scripts\track-8d-indianapi-audit.ts — Unclassified — needs manual review
- [x] scripts\track-9a-fundamental-influence.ts — Unclassified — needs manual review
- [x] scripts\track13a1_report.cjs — Unclassified — needs manual review
- [x] scripts\track13a2_report.cjs — Unclassified — needs manual review
- [x] scripts\track13a_audit.cjs — Unclassified — needs manual review
- [x] scripts\track19a_proof.cjs — Unclassified — needs manual review
- [x] scripts\track25b_audit.cjs — Unclassified — needs manual review
- [x] scripts\track31_alpha_validation.cjs — Unclassified — needs manual review
- [x] scripts\track33_executor.cjs — Unclassified — needs manual review
- [x] scripts\track33_phase1_audit.cjs — Unclassified — needs manual review
- [x] scripts\track34_reality.cjs — Unclassified — needs manual review
- [x] scripts\track35_cert.cjs — Unclassified — needs manual review
- [x] scripts\track36_reality_audit.mjs — Unclassified — needs manual review
- [x] scripts\track37_executor.ts — Unclassified — needs manual review
- [x] scripts\track38-populate-via-python.cjs — Unclassified — needs manual review
- [x] scripts\track38-populate.cjs — Unclassified — needs manual review
- [x] scripts\track41_populate.cjs — Unclassified — needs manual review
- [x] scripts\track42_generate.cjs — Unclassified — needs manual review
- [x] scripts\track43_finalize.cjs — Unclassified — needs manual review
- [x] scripts\track44_agentA_audit.cjs — Unclassified — needs manual review
- [x] scripts\track44_agentB_snapshots.cjs — Unclassified — needs manual review
- [x] scripts\track44_agentC_nifty100.cjs — Unclassified — needs manual review
- [x] scripts\track44_agentD_factorV2.cjs — Unclassified — needs manual review
- [x] scripts\track44_agentE_backfill.cjs — Unclassified — needs manual review
- [x] scripts\track44_agentF_alpha.cjs — Unclassified — needs manual review
- [x] scripts\track44_agentG_sebi.cjs — Unclassified — needs manual review
- [x] scripts\track44_agentH_dashboard.cjs — Unclassified — needs manual review
- [x] scripts\write_final_verdict.cjs — Unclassified — needs manual review
- [x] temp-count.cmd — Unclassified — needs manual review
- [x] temp-count.ps1 — Unclassified — needs manual review
- [x] tmp-verification\live-data-truth.ts — Unclassified — needs manual review
- [x] tmp-verification\percentile-verification.ts — Unclassified — needs manual review
- [x] tmp-verification\tsc_full_errors.txt — Unclassified — needs manual review
- [x] tmp-verification\tsc_scripts_errors.txt — Unclassified — needs manual review
- [x] tmp-verification\tsc_scripts_errors_v2.txt — Unclassified — needs manual review
- [x] tsconfig.backend.json — Unclassified — needs manual review
- [x] tsc_check_out.txt — Unclassified — needs manual review
- [x] tsc_foundation_out.txt — Unclassified — needs manual review
- [x] tsc_master_arch_out.txt — Unclassified — needs manual review
- [x] tsc_out.txt — Unclassified — needs manual review
- [x] tsc_out2.txt — Unclassified — needs manual review
- [x] tsc_out_typecheck.log — Unclassified — needs manual review
- [x] tsc_progressive_out.txt — Unclassified — needs manual review
- [x] tsc_typecheck_log.txt — Unclassified — needs manual review
- [x] typecheck.log — Unclassified — needs manual review
- [x] typecheck_after_arch.txt — Unclassified — needs manual review
- [x] typecheck_app_arch5.txt — Unclassified — needs manual review
- [x] typecheck_arch2.txt — Unclassified — needs manual review
- [x] typecheck_arch3.txt — Unclassified — needs manual review
- [x] typecheck_arch4.txt — Unclassified — needs manual review
- [x] typecheck_auth_final.txt — Unclassified — needs manual review
- [x] typecheck_auth_profile_final.txt — Unclassified — needs manual review
- [x] typecheck_auth_stage1.txt — Unclassified — needs manual review
- [x] typecheck_auth_stage2.txt — Unclassified — needs manual review
- [x] typecheck_auth_stage3.txt — Unclassified — needs manual review
- [x] typecheck_auth_stage4.txt — Unclassified — needs manual review
- [x] typecheck_guided_search_final.txt — Unclassified — needs manual review
- [x] typecheck_log.txt — Unclassified — needs manual review
- [x] typecheck_log2.txt — Unclassified — needs manual review
- [x] typecheck_onboarding_guided_search_final.txt — Unclassified — needs manual review
- [x] typecheck_watchlist_log.txt — Unclassified — needs manual review
- [x] typecheck_workspace_log.txt — Unclassified — needs manual review
- [x] typecheck_workspace_watchlist_log.txt — Unclassified — needs manual review
- [x] vercel.json — Unclassified — needs manual review
- [x] vite.config.ts — Unclassified — needs manual review
- [x] vitest.config.ts — Unclassified — needs manual review
- [x] vite_build_arch6.txt — Unclassified — needs manual review
- [x] vite_build_auth6.txt — Unclassified — needs manual review
- [x] vite_build_auth_profile_final.txt — Unclassified — needs manual review
- [x] vite_build_log.txt — Unclassified — needs manual review
- [x] vite_build_log2.txt — Unclassified — needs manual review
- [x] vite_build_onboarding_guided_search_final.txt — Unclassified — needs manual review

---

## Directory Breakdown

| Directory | KEEP | MERGE | DELETE | REVIEW | Total |
|-----------|------|-------|--------|--------|-------|
| . | 13 | 0 | 196 | 51 | 260 |
| scripts | 1 | 0 | 15 | 53 | 69 |
| src\components | 38 | 0 | 0 | 0 | 38 |
| src\services\portfolio | 24 | 0 | 0 | 0 | 24 |
| src\components\companyUniverse | 23 | 0 | 0 | 0 | 23 |
| src\scripts | 23 | 0 | 0 | 0 | 23 |
| src\hooks | 22 | 0 | 0 | 0 | 22 |
| src\components\dashboard | 21 | 0 | 0 | 0 | 21 |
| src\services | 20 | 0 | 0 | 0 | 20 |
| src\services\charting | 20 | 0 | 0 | 0 | 20 |
| src\services\providers | 19 | 0 | 0 | 0 | 19 |
| src\pages | 17 | 0 | 0 | 0 | 17 |
| src\predictions | 16 | 0 | 0 | 0 | 16 |
| src\components\navigation | 15 | 0 | 0 | 0 | 15 |
| src\services\focusGuidance | 15 | 0 | 0 | 0 | 15 |
| src\services\search | 15 | 0 | 0 | 0 | 15 |
| src\types | 14 | 0 | 0 | 0 | 14 |
| src\views | 14 | 0 | 0 | 0 | 14 |
| src\providers\yfinance | 13 | 0 | 0 | 0 | 13 |
| src\services\marketData | 13 | 0 | 0 | 0 | 13 |
| src\backend\web\routes | 11 | 0 | 0 | 0 | 11 |
| src\services\stocks | 11 | 0 | 0 | 0 | 11 |
| src\components\telemetry | 10 | 0 | 0 | 0 | 10 |
| src\services\realtime | 10 | 0 | 0 | 0 | 10 |
| src\components\intelligence | 9 | 0 | 0 | 0 | 9 |
| src\db\migrations | 9 | 0 | 0 | 0 | 9 |
| src\services\auth | 9 | 0 | 0 | 0 | 9 |
| docs | 0 | 0 | 6 | 2 | 8 |
| src\services\telemetry | 8 | 0 | 0 | 0 | 8 |
| src\stockstory\engines | 8 | 0 | 0 | 0 | 8 |

---

## Recommendations

1. **Immediate Cleanup:** Delete 217 files marked as temporary/obsolete
2. **Merge Review:** 0 files are candidates for consolidation
3. **Manual Review:** 115 files need human classification
4. **Migration Audit:** 9 SQL migrations — verify all are applied
5. **Script Consolidation:** 40 track-specific scripts — archive after Track-44

## Overall Assessment

Estimated cleanup: 19.5% of codebase is eligible for removal or consolidation.
This falls short of the 20-40% target.
