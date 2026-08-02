# Firebase Admin SDK — Railway Deployment Guide

## Why Backend Firebase Admin Credentials Are Needed

The backend uses the Firebase Admin SDK to verify Firebase ID tokens from authenticated users. Without these credentials, all protected API endpoints (watchlist, portfolio, user profile) return `503 AUTH_SERVICE_UNAVAILABLE`.

The Firebase Admin SDK is **not** used for creating users or managing auth — only for token verification.

## Required Railway Environment Variables

Set these in the `PREDICTION-ENGINE` service on Railway:

| Variable | Source |
|---|---|
| `FIREBASE_PROJECT_ID` | `stockstory-india` (the Firebase project ID) |
| `FIREBASE_CLIENT_EMAIL` | Firebase Console → Project Settings → Service accounts → `firebase-adminsdk-xxxxx@PROJECT_ID.iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | Firebase Console → Project Settings → Service accounts → "Generate new private key" |

## Setting the Firebase Private Key Safely

The private key from the downloaded JSON contains actual newlines. Railway stores env vars as single-line strings, so the newlines must be escaped as `\n`.

Format:
```
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMII...\n-----END PRIVATE KEY-----\n"
```

The backend normalises `\n` to actual newlines at runtime. Do **not** paste multi-line values directly; use `\n` escapes.

### Railway CLI Commands (placeholders — replace with real values)

```bash
# Set project ID
railway variables set FIREBASE_PROJECT_ID="stockstory-india" \
  --service PREDICTION-ENGINE --environment production

# Set client email
railway variables set FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@stockstory-india.iam.gserviceaccount.com" \
  --service PREDICTION-ENGINE --environment production

# Set private key (single line with \n escapes)
railway variables set FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMII...\n-----END PRIVATE KEY-----\n" \
  --service PREDICTION-ENGINE --environment production

# Redeploy to pick up new env vars
railway redeploy --from-source --service PREDICTION-ENGINE --environment production --yes
```

## Verification

### Env var presence (no values printed)
```bash
railway run --service PREDICTION-ENGINE --environment production node -e "
const names = ['FIREBASE_CLIENT_EMAIL','FIREBASE_PRIVATE_KEY','FIREBASE_PROJECT_ID'];
for (const n of names) console.log(n + '=' + (process.env[n] ? 'present' : 'missing'));
"
```

### Expected output
```
FIREBASE_CLIENT_EMAIL=present
FIREBASE_PRIVATE_KEY=present
FIREBASE_PROJECT_ID=present
```

### Health check
```bash
curl https://prediction-engine-production-f7a8.up.railway.app/api/ops/health
```
Returns `200 OK` regardless of Firebase Admin status. The server starts without Firebase Admin and only fails when a protected route is hit.

### Authenticated endpoint test
```bash
curl -H "Authorization: Bearer <valid-firebase-id-token>" \
  https://prediction-engine-production-f7a8.up.railway.app/api/watchlists
```
- **200** → Firebase Admin configured and token valid
- **401** → Missing or malformed Authorization header
- **403** → Token invalid, expired, or revoked
- **503** → Firebase Admin not configured

## Expected Failure Modes

| Scenario | HTTP Code | Response Body |
|---|---|---|
| Missing `Authorization` header | 401 | `{ "code": "AUTH_MISSING", "error": "..." }` |
| Bearer token scheme invalid | 401 | `{ "code": "AUTH_INVALID_SCHEME", "error": "..." }` |
| Token is valid but Firebase Admin missing | 503 | `{ "code": "AUTH_SERVICE_UNAVAILABLE", "error": "..." }` |
| Token invalid/expired/revoked | 403 | `{ "code": "AUTH_INVALID_TOKEN", "error": "..." }` |
| No route match | 404 | Standard Fastify 404 |

## Security Rules

- Never commit the service account JSON file.
- Never commit `.env` files with real values.
- Never echo or log `FIREBASE_PRIVATE_KEY`.
- The backend logs `present`/`missing` status only, never values.
- The `isFirebaseAdminConfigured()` check in `firebaseAdmin.ts` reports missing var names but **not** their values.

## Code Reference

- `src/backend/auth/firebaseAdmin.ts` — Firebase Admin initialization and token verification
- `src/backend/auth/requireAuthenticatedUser.ts` — Auth middleware (preHandler hook)
- `src/backend/startServer.ts` — Logs Firebase Admin status at startup

## `\.env.example` Reference

The `.env.example` file documents the required vars as commented-out placeholders:

```env
# FIREBASE_PROJECT_ID=stockstory-india
# FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@stockstory-india.iam.gserviceaccount.com
# FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMII...\n-----END PRIVATE KEY-----\n"
#   ^ The private key must use \n for newlines (Node.js .env convention).
```
