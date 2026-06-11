# Alert End-To-End Proof

Generated: 2026-06-11

## Implementation

Frontend:

- `src/services/portfolio/AlertEngine.ts`
- `src/context/AuthContext.tsx`

Backend:

- `src/backend/web/routes/retention.ts`
- `src/services/retention/UserAlertEngine.ts`

Tests:

- `src/services/portfolio/AlertEngine.test.ts`
- `src/backend/web/routes/__tests__/retention.authz.test.ts`
- `tests/e2e/browser/public-journeys.spec.ts`

## Security Repair

Removed unsafe frontend request patterns:

- `/api/alerts?uid=${uid}`
- `/api/investor-state?uid=${uid}`

Replaced with authenticated calls:

- `GET /api/alerts`
- `POST /api/alerts`
- `POST /api/alerts/:alertId/read`
- `POST /api/alerts/read-all`
- `DELETE /api/alerts/:alertId`

The backend derives identity from `request.authenticatedUser.uid` and rejects unauthenticated requests with `401`.

## Local-First Behavior

- Signed-out users keep local alerts.
- Remote sync does not run for signed-out users.
- Remote failures do not erase local alerts.
- Account-specific local storage isolation remains intact.
- Conflict handling uses stable IDs and timestamps; newer local alert state wins when reconciling against stale remote state.

## Test Coverage

Covered by unit/backend tests:

- signed-out local-only mode
- signed-in load
- signed-in save/create
- backend `{ alerts, unreadCount }` response-shape parsing
- forged UID request ignored/rejected
- cross-account isolation
- remote outage preserving local state

Browser coverage:

- local-only alert centre can mark all alerts read without remote auth.

## Commands

- `npm run test:unit` passed: 28 files, 256 tests.
- `npm run test:e2e:playwright:ci` passed: 6 browser journeys.

## Remaining Certification Gap

Authenticated browser alert loading against a live Firebase/Railway production session was not certified in this local run. The browser suite covers local-only behavior and route health; backend and service tests cover authenticated ownership.
