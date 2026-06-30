# Phase 13e — Watchlist Research Alerts Integration

## Objective
Wire the existing safe Research Alerts panel into the Watchlist page using the existing watchlist intelligence alert array.

## Result
- Added the Research Alerts panel to `WatchlistPage`.
- Reused `intel.alerts` from the existing watchlist intelligence payload.
- Added a compact research-alert summary chip.
- Reused the existing Research, Compare, Track, and Invest review handoff callbacks.
- No new data source was added.
- No new scoring logic was added.
- No order placement flow was added.

## Files changed
- `src/pages/WatchlistPage.tsx`

## Verification
- Connector-based file review completed.
- Vercel check on the new head commit is pending.
- Full local npm verification was not available in this connector-only run.

## Safety notes
- The integration renders existing safe alert view models only.
- No secrets were touched.
- No private credentials were touched.
- No public technical plumbing copy was intentionally added.
- No direct recommendation copy was intentionally added.

## Next remaining task
Add a focused Watchlist page test for the Research Alerts panel render path, then run full typecheck, lint, unit tests, and builds.
