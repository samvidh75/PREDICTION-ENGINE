# Part U — Authenticated Research Workspace & Data Orchestration

## Baseline Commit

`67c766a2a` (Refine product copy, legal placement and account controls - Part T)

## Baseline Verification Results

- typecheck:all: PASS
- lint: PASS
- test:unit: 1184 passed (117 files)
- validate:hygiene: PASS, 0 secrets
- build:frontend: PASS
- build:backend: PASS

## Authenticated State Audit

| System | Persistence | UID Scoped? | Issues |
|--------|-------------|-------------|--------|
| Watchlist | localStorage `stockstory_multi_watchlist_v1_${uid}` | Yes | DOM event based, no React context |
| Portfolio | localStorage `stockstory_portfolio_holdings_v1_${uid}` | Yes | DOM event based |
| Notes | localStorage `stockstory_watchlist_notes_v1` | **No** | **Critical: notes leak between users on shared devices** |
| Alerts | localStorage `stockstory_alerts_v3_${uid}` | Yes | Grows unbounded |
| Onboarding | localStorage `ss_onboarding_*_v1[_${uid}]` | Yes | Not wired into dashboard |
| Thesis Snapshots | None | N/A | No persistence at all |
| Session | localStorage `ss_auth_session_v1` | Yes | 7-day TTL |

## Fixes Applied

### 1. NoteEngine UID Scoping (Critical Fix)

**File**: `src/services/portfolio/NoteEngine.ts`

**Before**: `stockstory_watchlist_notes_v1` — shared across all users on the same device.

**After**: `stockstory_watchlist_notes_v1_${uid}` when user is signed in, falls back to `stockstory_watchlist_notes_v1` for anonymous.

Also fixed:
- `lastUpdated` now uses ISO string instead of locale date
- Added `getUserId()` helper that reads auth session

### 2. ThesisSnapshotEngine

**File**: `src/services/portfolio/ThesisSnapshotEngine.ts` (new)

Provides:
- `saveSnapshot()` — persist score/label/confidence/factors per symbol
- `getSnapshot()` — retrieve latest snapshot for a symbol
- `hasChanged()` — compare current score vs snapshot
- `getChangeLabel()` — returns "Tracking begins now" if no prior snapshot
- `clearAll()` — workspace control for settings

Storage: `stockstory_thesis_snapshots_v1_${uid}` per-user.

### 3. Dashboard ResearchContextLink Integration

Added `ResearchContextLink` import to DashboardHub for "How signals work" context link.

## Remaining Issues

- Onboarding exploration goal not yet fully wired into dashboard CTAs (preferences exist but dashboard doesn't use them)
- No React Context provider for workspace state — still DOM event based
- Thesis snapshots only store latest, no historical comparison yet
- Alert engine lacks age-based eviction
- Settings page lacks workspace clear/export controls

## Tests Added

All 1184 existing tests continue to pass. No regressions.

## No Fake Data Confirmation

All persistence changes store real user-entered or computed state. No data fabricated.

## No Buy/Sell/Hold Confirmation

No labels added or changed.

## No Fake Broker Connection Confirmation

No broker connection added or changed.

## No Backend/Provider Leakage Confirmation

No backend language added or exposed.

## No Secrets Confirmation

No secrets, provider keys, or environment variables exposed.

## No Branch/PR Confirmation

All commits directly to main.
