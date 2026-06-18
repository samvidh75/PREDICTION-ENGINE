# Release: SDK Research, Compare Workflow, and Blind-Spot Elimination

## Baseline commit
`fde6cb29` — Integrate data lineage and premium compare workflows

## SDK research result
- **jugaad-data**: probe_only — historical data works (22 rows), quote fails (NSE blocking). Already configured as optional fallback.
- **nsepython**: probe_only — functions exist (equity_history, get_bhavcopy). Already configured.
- **akshare**: future_watch — China-focused, no verified India endpoints.
- **nsepy**: archive — stale/unmaintained, migrated to nsepython.
- **No new SDK activated** — existing provider architecture is correct.

## Compare workflow
- `ComparePage` created at `?page=compare` — first-class route
- URL hydration: `?ids=RELIANCE,TCS` persists selection
- Search to add companies via `/api/search`
- Real scores, factors, confidence, data coverage
- Missing values show "—" explicitly
- Command palette action: "Compare companies"
- Left rail navigation entry
- Up to 3 companies side by side

## Fundamentals result
- `probe:fundamentals` confirms Screener.in viable for company page, consolidated, quarterly
- Moneycontrol financials blocked
- NSE company info blocked
- Recommendation: prefer CSV import for reliable structured fundamentals

## Blind spots fixed
- `prediction_input_lineage` now consumed by API (was never read)
- SourceTraceTimeline + ResearchAuditDrawer on Company page
- CompareCompaniesPanel route-integrated
- Command palette compare action
- Left rail compare entry
- GlassModal fully replaced with SpatialSheet in Portfolio
- SDK research probes and systematic evaluation completed

## Remaining true blockers
- `feature_snapshots` and `factor_snapshots` have no source columns — cannot trace per-factor to provider without schema migration
- Fundamentals partial — Screener.in viable but HTML parsing is brittle; CSV import preferred
- 3 symbols no quote, 3 no history — no reliable source to fill without bypassing restrictions
- Compare lineage integration not complete (deep audit drawer per-company, not in compare matrix)
- Fundamentals missing-symbol list not surfaced in Trust Centre UI

## Verification
- typecheck: all pass
- lint: pass
- hygiene: 0 secrets
- unit: 971/971 pass
- frontend build: pass
- backend build: pass
- E2E: 36/36 pass
- responsive audit: 88/88 pass
- smoke: pass
- provider checks: pass

## Confirmation
- No fake data introduced
- No trading/pro fake UI
- No secrets exposed
- No branch created
- No PR created
