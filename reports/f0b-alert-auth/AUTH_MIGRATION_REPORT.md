# F0B Alert Auth Migration Report

## Summary

Alert persistence no longer sends browser-supplied UID query parameters. Alert sync now uses the established authenticated fetch helper and the backend derives identity only from the validated bearer-token session.

## Frontend Changes

Updated `src/services/portfolio/AlertEngine.ts`:

- Removed `fetch('/api/alerts?uid=...')`.
- Removed `fetch('/api/investor-state?uid=...')`.
- Uses `authenticatedFetchOnlyIfSignedIn('/api/investor-state')` for remote alert load.
- Uses `authenticatedFetchOnlyIfSignedIn('/api/investor-state', { method: 'POST', ... })` for remote alert save.
- Signed-out users remain local-only.
- Remote failures preserve local alert state.
- Structured sync failures are logged as `remote_sync_failed` with operation/status/code only.

Updated `src/components/retention/NotificationCentre.tsx`:

- Removed `/api/alerts?uid=...`.
- Removed `/api/alerts/read-all?uid=...`.
- Uses `authenticatedFetchOnlyIfSignedIn` for alert notification reads and mutations.

## Backend Identity

The backend routes already use `requireAuthenticatedUser`:

- `/api/investor-state`
- `/api/alerts`
- `/api/alerts/unread`
- `/api/alerts/:alertId/read`
- `/api/alerts/read-all`

Identity is read from `request.authenticatedUser!.uid`; query params, headers such as `x-user-uid`, and body UIDs are ignored.

Unauthenticated remote sync receives an honest `401 AUTH_MISSING` state from `requireAuthenticatedUser`.

## Conflict Handling

Alert conflicts are resolved by:

- Stable alert `id`
- Alert `timestamp`
- Local and remote alerts are merged by `id`
- If the same `id` exists locally and remotely, the newer `timestamp` wins
- Merged alerts are sorted newest-first

## Local-First Safety

- Local alerts remain available offline.
- Remote sync only runs through `authenticatedFetchOnlyIfSignedIn`.
- A signed-out auth helper result (`null`) leaves local alerts untouched.
- Failed remote loads or saves do not erase local alerts.

## Account Isolation

- Local alert data remains keyed by the active local auth account.
- Alert settings remain keyed by the active local auth account.
- Remote state is isolated by backend token UID.

## Verification

Focused F0B verification:

```bash
npm run test:unit -- src/services/portfolio/AlertEngine.test.ts src/backend/web/routes/__tests__/retention.authz.test.ts src/backend/web/routes/__tests__/investorState.auth.test.ts
```

Result:

```text
Test Files  3 passed (3)
Tests  26 passed (26)
```

Static scan for removed UID URLs:

```bash
rg -n '/api/alerts[^\n]*uid|/api/investor-state\?uid|fetch\(`/api/alerts|fetch\(`/api/investor-state' \
  src/services/portfolio/AlertEngine.ts \
  src/components/retention/NotificationCentre.tsx \
  src/backend/web/routes/retention.ts \
  src/backend/web/routes/investorState.ts \
  src/services/portfolio/AlertEngine.test.ts
```

Result: no matches.
