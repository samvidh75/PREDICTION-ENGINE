# Part 10 — Personal Research OS Baseline Report

## Baseline Commit
- **Commit**: `f07b49ad` — Part 8 Intelligence Validation
- **Branch**: `main`
- **Date**: 2026-06-28

## Build Verification
| Check | Status |
|-------|--------|
| `npm run typecheck:active` (frontend + backend) | ✅ Pass |
| `npm run lint` | ✅ Pass |
| `npm run test:unit` | ⚠️ 20 tests fail in untracked `AllEnginesVerification.test.ts` (pre-existing, not Part 10) |
| `npm run build:frontend` | ✅ Pass (677ms) |
| `npm run build:backend` | ✅ Pass |

## Current User/Profile State
- **Auth**: No user auth system detected. No Firebase, no session management.
- **User profile**: No UserResearchProfile. Existing `PersonalisationEngine` has sector-based suggestions only.
- **Research preferences**: None stored. No onboarding preferences flow.
- **Experience level**: Not tracked.
- **Risk comfort**: Not tracked.

## Current Watchlist State
- **Route**: `/watchlist` → `PlaceholderPage` (empty shell)
- **WatchlistEngine**: Exists in `src/research/watchlist/` but only for intelligence validation (Part 8 scripts), not user-facing
- **Saved companies**: No persistence or frontend for user-saved companies
- **WatchlistThesisView type**: Defined in productContracts.ts but not wired to any UI

## Current Portfolio/Thesis Tracker State
- **ThesisLifecycleEngine**: Exists in `src/stockstory/intelligence/thesis/` for intelligence validation
- **CompanyThesisView type**: Defined in productContracts.ts with ThesisStatus states
- **No user-facing thesis tracker**: No "what changed since you saved it", no review priority, no thesis history
- **MemoryEngine**: Exists with record/query for research memory (engine_run, signal_generated, thesis_updated, etc.) — memory-only, not thesis-tracking

## Current Alerts State
- **alertsEngine.ts**: `generateAlerts()` function with thesis_change, risk_change, valuation_change, watchlist_review, price_move, peer_change, event triggers
- **AlertChangeView type**: Defined with id, symbol, type, title, body, timestamp, acknowledged
- **No alert persistence**: In-memory generation only, no storage, no notification center
- **No deduplication**: No AlertDeduper
- **No alert evaluation job**: No scheduled alerts evaluation for saved companies

## Current Scanner/Ranking State
- **ScannerResultView type**: Defined in productContracts.ts
- **ScannerPage.tsx**: Exists but focused on stock discovery, not personal presets
- **No personal scanner presets**: Users cannot save or configure scanner queries

## Current Research Snapshot State
- **ResearchNarrativeService.ts**: Generates research narratives
- **companyResearchEngine.ts**: Orchestrates company research
- **No research history timeline**: No user-facing research history, no "continue researching"

## Current Scenario Engine State
- **ScenarioOrchestrator.ts**: Part 9 scenario engine exists
- **No personal scenario integration**: Saved companies don't link to scenario stress-testing

## Current Frontend Personal Routes
| Route | Component | Status |
|-------|-----------|--------|
| `/` | `HomePage` | Stock search/discovery only |
| `/stock/:symbol` | `StockPage` | Research view |
| `/scanner` | `ScannerPage` | Scanner/discovery |
| `/watchlist` | `PlaceholderPage` | Empty — needs full watchlist research workspace |
| `/portfolio` | Not routed | Needs thesis monitor |
| `/alerts` | Not routed | Needs notification center |
| `/dashboard` | Not routed | Needs personal research dashboard |

## Current Production Verification
- Production backend: `https://stockstory-api.onrender.com`
- Not tested in this phase (Phase 1 baseline verification)
- No personal API routes exist yet

## Scope of Part 10
Build the personal research OS layer:
1. User Research Profile + Preferences
2. Saved Companies / Watchlist Intelligence
3. Thesis Tracking with review priority
4. Alert Rules + Evaluation + Notification Center
5. Daily Research Digest + Weekly Thesis Review
6. Personal Scanner Presets
7. User Action Memory
8. Recommendation-Safe Next Actions
9. Personal API Routes
10. Frontend Personal Research Workspace (Dashboard, Watchlist, Alerts, Portfolio/Thesis)
11. Onboarding integration
12. Scenario integration for saved companies
13. Personalization jobs and cron
14. Privacy and data minimization audit
15. Safety greps
16. Tests

**Compliance**: No investment advice. No fake holdings/P&L. No broker sync. No Buy/Sell. Research-only.
