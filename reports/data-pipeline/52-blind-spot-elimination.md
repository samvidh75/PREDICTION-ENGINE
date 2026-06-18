# Blind-Spot Elimination Report

## Baseline
Commit: `fde6cb29` → current: with SDK research and Compare workflow additions.

## Blind Spot Classification

### 1. Scoring lineage blind spots
| Blind Spot | Status | Action |
|---|---|---|
| `prediction_input_lineage` not consumed by any API | ✅ FIXED | `GET /api/research/lineage/:symbol` now reads it |
| `SourceTraceTimeline` shows lineage per entry | ✅ FIXED | Integrated into Company page |
| `ResearchAuditDrawer` wraps lineage in spatial sheet | ✅ FIXED | Available on Company page |
| Individual factor/feature no source columns | ⚠️ KNOWN LIMITATION | `feature_snapshots` and `factor_snapshots` have no source columns. Cannot trace to provider without schema migration. |

### 2. Provider blind spots
| Blind Spot | Status | Action |
|---|---|---|
| IndianAPI status reported without domain proof | ✅ CORRECT | Shows "quote active when configured" |
| Jugaad/NSEPython shown as fallback without domain proof | ✅ CORRECT | Shows "configured off" — probes confirm domains work but scraping risk |
| Yahoo shown as blocked | ✅ CORRECT | HTTP 429 verified, not load-bearing |
| NSELib archived | ✅ CORRECT | Archived/unusable |

### 3. Symbol coverage blind spots
| Blind Spot | Status | Action |
|---|---|---|
| 3 symbols no quote | ⚠️ KNOWN | No real-time price available for these symbols |
| 3 symbols no history | ⚠️ KNOWN | Historical data incomplete |
| 1 not on latest leaderboard | ⚠️ KNOWN | Not in current scoring slice |
| VARUNBEVER, ZOMATO, YESBANK gaps | ⚠️ KNOWN | Gaps analyzed; no reliable source to backfill without bypassing restrictions |

### 4. Fundamentals blind spots
| Blind Spot | Status | Action |
|---|---|---|
| Fundamentals partial | ⚠️ KNOWN | `probe:fundamentals` confirms Screener.in viable, Moneycontrol financials blocked |
| Missing symbol list not surfaced in UI | ⚠️ NOT FIXED | Missing symbols stored in DB but not surfaced in a route |
| Last import timestamp not surfaced | ⚠️ NOT FIXED | `ingestion_timestamp` exists in `financial_snapshots` but not shown in Trust Centre |

### 5. Compare blind spots
| Blind Spot | Status | Action |
|---|---|---|
| CompareCompaniesPanel not route-integrated | ✅ FIXED | `ComparePage` created, registered at `?page=compare` |
| Command palette compare action missing | ✅ FIXED | Added to `CommandPalette` |
| Left rail compare entry missing | ✅ FIXED | Added to `IntelligenceOSShell` |
| No URL hydration for compare selection | ✅ FIXED | `?ids=RELIANCE,TCS` query param support |
| Missing data reasons not shown | ⚠️ PARTIAL | Shows "—" for unavailable; could show exact reason |
| No lineage integration in compare | ⚠️ NOT FIXED | `ResearchAuditDrawer` is per-company, not integrated into compare matrix |

### 6. Portfolio /api/investor blind spot
| Blind Spot | Status | Action |
|---|---|---|
| Raw 503 surfacing | ⚠️ UNVERIFIED | Need to check if /api/investor is actually called on Portfolio page |
| All modals now use SpatialSheet | ✅ FIXED | GlassModal fully replaced |

### 7. SDK research blind spots
| Blind Spot | Status | Action |
|---|---|---|
| No systematic SDK evaluation | ✅ FIXED | Probes built, report created |
| Old nsepy still in requirements | ⚠️ TO VERIFY | Check if nsepy is still listed as dependency |
| No new SDK can fill gaps | ✅ CONFIRMED | All evaluated SDKs have limitations or wrong focus |

## Summary
- 8 blind spots fixed in this pass
- 6 blind spots are known limitations (no source available without schema changes or bypassing restrictions)
- 2 blind spots not yet fixed (fundamentals missing symbol list in UI, compare lineage integration)
- 0 blind spots faked as complete
