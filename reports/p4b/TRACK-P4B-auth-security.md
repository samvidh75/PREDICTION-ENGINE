# TRACK-P4B — Auth Security Report

**Date:** 2026-06-09  
**Status:** NOT IMPLEMENTED — FAIL

---

## Required Implementation

### Firebase Token Verification (Phase 9)

The repository currently has:

1. **Auth route** (`src/backend/web/routes/auth.ts`) — needs investigation
2. **User profile route** (`src/backend/web/routes/userProfile.ts`) — needs investigation  
3. **Investor state route** (`src/backend/web/routes/investorState.ts`) — needs investigation
4. **Session store** (`src/services/auth/sessionStore.ts`) — needs investigation
5. **Frontend auth client** — needs investigation

### What Must Change

1. **Never trust `x-user-uid` header** — Backend must verify Firebase ID token via `firebase-admin/auth`
2. **Never trust `?uid=` query parameter** — Server-side token verification only
3. **Never trust browser localStorage** — No client-side auth helper on backend
4. **Protected routes** (`/api/user/profile`, `/api/investor-state`, `/api/watchlists`, `/api/alerts`) must use `Authorization: Bearer <token>`
5. **Anonymous behavior** must be explicit and read-only
6. **HTTP codes**: 401 (missing), 403 (invalid/unauthorized), 503 (persistence unavailable)

### What Was Not Done

- Firebase Admin SDK middleware not created
- `verifyFirebaseToken` middleware not wired
- `request.user.uid` not populated from verified tokens
- x-user-uid spoofing test not written
- uid query spoofing test not written
- Cross-user access test not written
- Valid token acceptance test not written
- Persistence unavailable response test not written

## Verdict

This is a BLOCKING security defect. The backend currently has no server-side Firebase token verification. Any caller can spoof user identity via `x-user-uid` header or `?uid=` query parameter.

**Recommendation:** This must be implemented before any production deployment.
