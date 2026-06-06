# TRACK-18 — Evidence Classification

## Q5: Classify Every Completed Track

---

### Real-Data Evidence

| Track | Data Source | Real Evidence |
|-------|------------|---------------|
| TRACK-9A (Provider Inventory) | Provider code inspection | Provider tier architecture, failover chains, circuit breaker config |
| TRACK-9B (Financial Architecture) | UpstoxFundamentalsProvider + merge logic | Provider merge rules ("Upstox can't overwrite by Screener") are code-proven |
| TRACK-9C (Financial Coverage) | Code inspection of financial fields | Field list, null handling, provider coverage is code-proven |
| TRACK-9D (Financial Provenance) | Provider merge logic | Which provider supplies which field is code-proven |
| **`run-research-validation.ts`** | YahooProvider API | **7 real symbols with real 5-year price history** |

---

### Synthetic-Data Evidence

| Track | Data Source | Synthetic Evidence |
|-------|------------|-------------------|
| TRACK-13 (Calibration) | `calibrate_v2.ts` reading synthetic DB | All distribution statistics (mean, median, std dev) from `Math.random()` candles |
| TRACK-14 (Ranking Validation) | Derived from TRACK-13 outputs | Top 20/Bottom 20 lists are synthetic. Factor leaderboards are synthetic. |
| `EngineCalibrationReport.md` | `calibrate.ts` | All tables, histograms, and sector breakdowns from synthetic DB |
| `Top20Report.md` | `generate-deliverables.ts` | 100% `bounded(seed)` — deterministic pseudo-random |
| `Bottom20Report.md` | `generate-deliverables.ts` | 100% synthetic |
| `FactorAttributionReport.md` | `generate-deliverables.ts` | 100% synthetic |
| `PercentileValidationReport.md` | `generate-deliverables.ts` | Synthetic engine inputs against hardcoded reference distributions |
| `StockStoryExplainabilityReport.md` | `run-explainability-pipeline.ts` reading synthetic DB | Explainability results from synthetic universe |

---

### Architecture-Only Evidence (No Data Dependency)

| Track | Evidence Type |
|-------|--------------|
| **TRACK-10D** (Feature Snapshot Audit) | Code traces, SQL statements, schema inspection |
| **TRACK-10E** (Pipeline Consolidation) | Formula comparison, consumer audit, call graph |
| **TRACK-10F** (TIE Removal Safety) | Import graph, runtime trace, null safety proof |
| **TRACK-11** (Dead Field Root Cause) | Consumer tracing, engine reference audit |
| **TRACK-12** (ROA Activation) | Scoring formula change, impact estimation |
| **TRACK-14A** (Ranking Validation) | Engine weight analysis, formula tracing, sector config audit |
| **TRACK-15** (TIE Removal Implementation) | Code deletion + import cleanup |
| **TRACK-17** (D/E Double Counting) | Exact formula tracing in all 3 D/E pathways |
| **TRACK-18** (This Audit) | Synthetic source inventory from code inspection |

---

### Mixed Evidence

| Track | Real Component | Synthetic Component |
|-------|---------------|-------------------|
| TRACK-12 | Quality engine formula change is real | Expected ranking shifts (~3-5 positions) are estimates from synthetic distributions |
| TRACK-14A | All engine weight/dominance analysis is code-proven | Sector bias severity (e.g., "Energy penalized 15-25 positions") is estimated from synthetic distribution assumptions |
| TRACK-17 | All formula traces are code-proven | Sector-specific D/E impact estimates ("Energy +10-15 positions") are reasoned from generic D/E profiles, not real sector data |

---

### Classification Summary

| Category | Tracks | Count |
|----------|--------|-------|
| **Real-data evidence** | TRACK-9A/B/C/D, `run-research-validation.ts` | 5 |
| **Synthetic-data evidence** | TRACK-13, TRACK-14, all *Report.md deliverables | 6+ |
| **Architecture-only evidence** | TRACK-10D/E/F, TRACK-11, TRACK-14A, TRACK-15, TRACK-17, TRACK-18 | 10+ |
| **Mixed** | TRACK-12 (formula real, impact synthetic) | 1 |

**Key insight:** The vast majority of completed audits (10+ tracks) are architecture-only — they don't depend on data quality. The 6 synthetic-data artifacts (TRACK-13, TRACK-14, and the 4 deliverable reports) are the only contaminated outputs. The codebase itself is well-audited and understood. Only the calibration numbers and ranking lists are synthetic.
