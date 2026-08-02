# Auth and Session Audit — Part 12

## Current State

| Component | Status | Detail |
|-----------|--------|--------|
| Firebase Admin SDK (backend) | ❌ Missing | `src/backend/auth/requireAuthenticatedUser.ts` is referenced but does not exist |
| Firebase Client SDK (frontend) | ✅ Present | Config in `.env.example` (VITE_FIREBASE_*) |
| JWT verification | ⚠️ Partial | `extractUid()` in `apiRouter.ts` decodes Firebase JWT (reads `sub` claim) but does NOT verify signature |
| Session store | ✅ Present | `src/services/auth/sessionStore.ts` — localStorage-based, 7-day expiry |
| Auth on write routes | ❌ Not enforced | All PUT/POST/DELETE routes accept requests without verification |
| Auth on read routes | ❌ Not needed | Read routes return public research data |
| Google Auth config | ⚠️ Partial | `VITE_GOOGLE_CLIENT_ID` in env, no integration wired |

## extractUid() Implementation

```typescript
function extractUid(req: any): string | null {
  const auth = req.headers?.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const payload = token.split(".")[1];
  if (!payload) return null;
  const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  return json.sub ?? null;
}
```

**Issue:** Decodes `sub` from JWT payload without verifying the signature. An attacker could craft a fake JWT with any `sub` value. Since no write route checks auth, this is currently a no-op.

## Session Store

- Frontend-only (`localStorage`)
- 7-day expiry enforced
- Backend does NOT use session cookies
- No CSRF protection needed (no cookie-based auth)

## Hardening Applied

1. ✅ Added `requireAuth` preHandler function in `apiRouter.ts` (logs unauthenticated write attempts)
2. ✅ Security headers added (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy)

## Recommendations

1. Implement `src/backend/auth/requireAuthenticatedUser.ts` with Firebase Admin SDK verification
2. Wire `requireAuth` preHandler to all write routes (PUT, POST, DELETE on personalization endpoints)
3. Enable Firebase Auth in production before user-facing personalization features
4. Consider rate-limiting auth token endpoints
