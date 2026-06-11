# F0B Security Regression Matrix

| Requirement | Regression Coverage | Evidence |
| --- | --- | --- |
| Authenticated load | `AlertEngine.test.ts` loads `/api/investor-state` through `authenticatedFetchOnlyIfSignedIn` and merges remote alerts. | `loads authenticated remote alerts through the auth helper and merges by timestamp` |
| Authenticated save | `AlertEngine.test.ts` saves to `/api/investor-state` through the auth helper with no UID query/body identity. | `saves authenticated alerts through the auth helper without UID query parameters` |
| Unauthenticated local-only behavior | Auth helper returns `null`; local alerts remain readable and writable. | `keeps unauthenticated users local-only` |
| Forged UID attempt | Frontend does not send local forged UID; backend ignores `/api/alerts?uid=user-b`. | `does not trust a forged local UID for remote identity`; `spoofed alert uid query is ignored and token uid owns alert reads` |
| Cross-account isolation | Local alert settings are keyed per account; backend investor-state tests prove token UID isolation. | `isolates alert settings per local authenticated account`; existing investor-state auth tests |
| Remote failure preserving local state | Failed remote load logs structured failure and leaves local alerts unchanged. | `preserves local alerts when remote sync fails` |
| Backend derives identity from auth session | Routes use `requireAuthenticatedUser`; tests assert spoofed query/body/header UIDs do not override token UID. | `retention.authz.test.ts`; `investorState.auth.test.ts` |
| Honest 401 unauthenticated remote sync | Protected routes return `401` without bearer token. | `unauthenticated alert request returns 401 AUTH_MISSING`; investor-state `GET/POST without Authorization -> 401` |
| No token or personal-data logging | Logs include component, operation, status, and code only. | `remote_sync_failed` structured logs in `AlertEngine.ts` and `NotificationCentre.tsx` |

## Removed Insecure Request Shapes

Removed from alert-related frontend code:

- `/api/alerts?uid=${uid}`
- `/api/investor-state?uid=${uid}`
- `/api/alerts/read-all?uid=${userId}`

## Remaining Defensive Backend Proof

Even if a caller manually sends `?uid=user-b`, the backend alert route uses the token UID:

```text
GET /api/alerts?uid=user-b
Authorization: Bearer valid-token-user-a
```

Expected result:

- user A alerts are returned
- user B alerts are not returned

This is covered by `src/backend/web/routes/__tests__/retention.authz.test.ts`.
