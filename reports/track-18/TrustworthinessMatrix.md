# TRACK-18 — Trustworthiness Matrix

## Q6: Confidence Level Per Major Conclusion

---

### HIGH Confidence (Code-Proven, No Data Dependency)

| Conclusion | Track | Basis |
|-----------|-------|-------|
| FeatureEngine is the sole writer to feature_snapshots | 10D | Code trace — exact INSERT statement located |
| TechnicalIndicatorEngine was a duplicate implementation | 10E | Line-by-line formula comparison |
| TIE can be safely deleted (1 consumer, 11+ FE consumers) | 10F, 15 | Import graph + consumer audit |
| bollingerWidth has zero engine consumers | 10E, 11 | Full consumer trace across all engines |
| relativeStrength is analysis-only (FeatureImportanceEngine only) | 10E, 11 | Full consumer trace |
| StockStory is hybrid: 70-75% fundamental, 10-15% technical | 14A | Exact engine weights from code |
| Quality + Stability = 45-65% of pre-adjustment health | 14A | Exact sector weights from SectorWeightEngine |
| D/E feeds Stability's debtScore, coverageScore, interestCoverageScore | 17 | Exact formula trace |
| RiskEngine's debtStressScore is a stub at 50 (RC-ENGINE-002) | 17 | Exact line reference |
| expand-market-coverage.ts uses Math.random() for all candles | 18 | Exact line reference |
| generate-deliverables.ts uses bounded(seed) for ALL engine inputs | 18 | Exact line reference |
| Momentum contributes at most 15% of pre-adjustment health | 14A | SectorWeightEngine exact weights |

---

### MEDIUM Confidence (Code-Proven Architecture, Unvalidated Impact Estimates)

| Conclusion | Track | Basis | Uncertainty |
|-----------|-------|-------|-------------|
| D/E double-counting penalizes Energy 15-25 positions | 14A, 17 | Reasoned from generic D/E profiles | Real D/E distribution unknown |
| ROA activation improves ranking fairness | 12 | Scoring formula analysis | Actual ranking delta unknown |
| Removing debt penalty benefits Energy +10-15 positions | 17 | D/E thresholds from SectorAdapter | Real Energy sector D/E distribution unknown |
| IT and FMCG are structurally over-scored | 14A | Sector profile analysis | Without real cross-sector rankings, over/under-scoring is hypothetical |
| Sector percentile mode protects banking fairness | 14A, 17 | Code inspection of percentile logic | Requires sufficient data per sector — data status unknown |

---

### LOW Confidence (Synthetic Data Foundation)

| Conclusion | Track | Basis | Why Low |
|-----------|-------|-------|---------|
| Stretch factor should be 1.7 for optimal separation | 13 | Calibration from synthetic DB | Distribution was from Math.random() candles |
| Risk dampening coefficient should be 0.45 | 13 | Calibration from synthetic DB | Same synthetic input |
| Sector weight calibration (BANKING 35% quality, etc.) | 13 | Calibration from synthetic DB | Weight recommendations from fake distributions |
| Top 20 healthiest: TCS, HUL, INFY (from reports) | 14, EngineCalibrationReport | Synthetic engine inputs | These are the WRONG companies in the WRONG order |
| Bottom 20 weakest: from Bottom20Report | 14 | Synthetic | Meaningless ranking |
| Factor leaders (Top 20 Growth, Quality, etc.) | 14 | Synthetic | Meaningless |
| EngineCalibrationReport.md tables/histograms | 13, deliverable reports | 100% synthetic | Every number is fake |
| Top20Report.md, Bottom20Report.md | generate-deliverables | 100% synthetic | Every ranking is fake |

---

### Trustworthiness Summary

| Confidence Level | Number of Conclusions | Examples |
|-----------------|----------------------|----------|
| **HIGH** | 12+ | Engine architecture, formula correctness, code structure, dead fields, consolidation |
| **MEDIUM** | 5+ | Sector-specific impact estimates, ranking sensitivity estimates |
| **LOW** | 8+ | All calibration numeric outputs, all Top/Bottom 20 lists, all report tables |

---

### What This Means for Production Decision-Making

**Safe to trust:**
- Engine architecture (7 engines, weights, sector calibration)
- Code quality decisions (TIE removal, field cleanup, formula fixes)
- Structural weaknesses (D/E double-counting, missing brand moat, no cyclical PE)
- Provider architecture (Upstox → Screener → Finnhub → Yahoo)

**NOT safe to trust:**
- Any specific ranking list (Top 20, Bottom 20, sector leaders)
- Any calibration coefficient (stretch 1.7, dampening 0.45)
- Any sector distribution statistic (mean health, std dev)
- Any ranking impact estimate that assumes real data distributions

**Decision rule:** If the conclusion can be verified by reading code → HIGH confidence. If it requires looking at data → LOW confidence (until real data is populated).
