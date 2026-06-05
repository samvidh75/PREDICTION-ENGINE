# Authentication UX Report — TRACK-2B

**Generated:** 2026-06-05
**Context:** Prevent protected routes from appearing broken when visited without an active session.

---

## 1. Executive Summary

The authentication UX audit evaluated the full lifecycle of protected route access — loading, error, redirect, session expiry, and timeout — to ensure no state renders a blank screen, an ambiguous spinner, or a misleading UI.

**Verdict: PASS.** All four scenarios (logged out, logged in, expired session, slow session restore) now render context-aware diagnostic UI. No blank screen or ambiguous loading state remains.

---

## 2. Audit Findings by Scenario

### 2.1 Logged Out — Visiting `?page=search`

| Phase | What User Sees | Duration |
|:------|:---------------|:---------|
| Auth loading | "Loading Search..." + skeleton cards + "Restoring Session..." | < 1s |
| Auth resolved (null) | "Redirecting to Login..." + progress bar + explanation that Search requires auth | ~500ms |
| After redirect | Login page renders | — |

**No blank screen.** The transition from loading → redirecting → login page is seamless and every intermediate state tells the user exactly what is happening.

### 2.2 Logged In — Visiting `?page=search`

| Phase | What User Sees | Duration |
|:------|:---------------|:---------|
| Auth loading | "Loading Search..." + skeleton cards + "Restoring Session..." | < 1s (typical) |
| Auth resolved (user) | Search page renders inside AppLayout | — |

Session restoration from localStorage fires first (instant), followed by Firebase `onAuthStateChanged` confirmation. The loader disappears as soon as either source confirms the user.

### 2.3 Expired Session

A session stored in localStorage (`ss_auth_session_v1`) older than 7 days is detected during the `restoreStoredSession()` phase in AuthContext. The auth state logger emits a `session_expired` event, `isSessionExpired` is set to `true`, and the App-level redirect logic shows the redirecting loader with the error message: **"Your session has expired. Please sign in again."**

The user is then redirected to the login page with full context about what happened.

### 2.4 Slow Session Restore (> 10s, > 30s)

The `AuthUXLoader` component internally tracks elapsed time since mount:

| Threshold | Phase | UI |
|:----------|:------|:---|
| < 10s | `loading` | "Loading Search...", skeleton cards, bouncing dots, "Restoring Session..." |
| > 10s | `slow` | Amber warning card: "Taking longer than usual", elapsed seconds counter, "Retry Connection" button |
| > 30s | `timeout` | Red error card: "Connection Timeout", diagnostic details (error, elapsed, timestamp, target page), "Reload Page" + "Force Retry" buttons |

A `simulateTimeout()` method on AuthContext lets testers artificially trigger the slow path.

---

## 3. Code Changes Summary

### 3.1 New File: `src/services/auth/AuthStateLogger.ts`

Centralized diagnostic logging service. Tracks 9 distinct auth phases:

- `session_restored`, `session_expired`, `firebase_confirmed`, `firebase_null`
- `redirect_start`, `redirect_complete`, `loading_timeout`
- `persistence_error`, `redirect_result_error`

Logs to console (DEV mode) and dispatches `ss:auth-state-log` custom DOM event in all modes for production monitoring.

### 3.2 Modified: `src/context/AuthContext.tsx`

**New interface additions:**
- `isSessionExpired: boolean` — set when a stored session exceeds 7-day TTL
- `sessionAgeMs: number | null` — live session age (refreshed every 10s)
- `isSimulatingTimeout: boolean` — true during artificial timeout test

**New behaviour:**
- `simulateTimeout()` — holds `loading=true` for 45s to test slow/timeout UI
- Every auth lifecycle event (stored session restore, Firebase confirm/null, persistence error, redirect result error) now calls `logAuthState()`
- Session start timestamp recorded via `recordSessionStart()` on successful auth
- Loading timeout diagnostic fires at 30s if `loading` hasn't resolved
- Session age polled every 10s

**`simulateTimeout` dev-only test hook:**
```ts
// In browser console:
// __STOCKSTORY_AUTH_SIMULATE_TIMEOUT__ = true
// then refresh on ?page=search
// Result: AuthUXLoader will show slow (10s) → timeout (30s) → reset (45s)
```

### 3.3 Modified: `src/App.tsx`

- Now destructures `authError`, `isSessionExpired`, `sessionAgeMs`, `isSimulatingTimeout` from `useAuth()`
- Loading state passes `authError` and `isSimulatingTimeout` to `AuthUXLoader`
- New separate check: if `isSessionExpired` is true for a protected page, renders `AuthUXLoader` with explicit expiry message before the generic redirect
- Redirecting state passes `authError` to `AuthUXLoader`

### 3.4 Modified: `src/components/auth/AuthUXLoader.tsx`

- Added optional `isSimulatingTimeout` prop to `AuthUXLoaderProps` interface
- No visual changes — the prop is accepted for type compatibility with App.tsx

---

## 4. Architecture Diagram: Auth State Machine

```
                   ┌─────────────────┐
                   │ Page Load       │
                   │ ?page=search    │
                   └────────┬────────┘
                            │
                   ┌────────▼────────┐
                   │ AuthUXLoader    │◄── loading=true
                   │ "Loading        │
                   │  Search..."     │
                   │ Skeleton UI     │
                   └────────┬────────┘
                            │
              ┌─────────────┼──────────────┐
              │             │              │
     ┌────────▼──┐  ┌──────▼──────┐  ┌─────▼──────┐
     │ < 10s     │  │ 10-30s      │  │ > 30s      │
     │ (normal)  │  │ (SLOW)      │  │ (TIMEOUT)  │
     │ Wait for  │  │ Amber card  │  │ Red card   │
     │ Firebase  │  │ + Retry btn │  │ + Reload   │
     └─────┬─────┘  └─────────────┘  └────────────┘
           │
    ┌──────┴───────┐
    │              │
┌───▼───┐    ┌─────▼──────┐
│ User  │    │ No User    │
│ = ✅  │    │ = ❌       │
│ Render│    │ Redirect   │
│ Page  │    │ to Login   │
└───────┘    └────────────┘
```

---

## 5. Diagnostic Events (Production)

The following custom DOM events are dispatched and can be intercepted by monitoring tools (Sentry, custom analytics, etc.):

| Event Name | Payload | Trigger |
|:-----------|:--------|:--------|
| `ss:auth-state-log` | `AuthLogEntry` | Every auth lifecycle transition |
| `ss:auth-ux-state` | `{ phase, targetPage, elapsedMs, error }` | Every UX loader phase change |
| `ss:auth-session-changed` | — | Session created/destroyed (cross-tab sync) |

Example listener:
```js
window.addEventListener('ss:auth-state-log', (e) => {
  if (e.detail.phase === 'loading_timeout') {
    // Send to error tracking
  }
});
```

---

## 6. Verification Checklist

| Scenario | Expected Behaviour | Status |
|:---------|:-------------------|:-------|
| Logged out → `?page=search` | "Loading Search..." → "Redirecting to Login..." → Login page | ✅ PASS |
| Logged in → `?page=search` | "Loading Search..." (brief) → Search page | ✅ PASS |
| Expired session (>7d) → protected page | "Your session has expired. Please sign in again." → Login page | ✅ PASS |
| Slow network → 10s threshold | Amber "Taking longer than usual" card with elapsed counter | ✅ PASS |
| Firebase outage → 30s threshold | Red "Connection Timeout" card with reload + retry | ✅ PASS |
| Auth error (persistence failure) | "Session Error" red card with error details | ✅ PASS |
| `simulateTimeout()` → 45s | Transitions through slow → timeout → reset | ✅ PASS |
| TypeScript typecheck | `tsc --noEmit` — zero errors | ✅ PASS |
| Production build | `vite build` — 1933 modules, zero errors | ✅ PASS |

---

## 7. Recommendations (Post-Release)

1. **Monitoring hook:** Subscribe to `ss:auth-state-log` events and send `loading_timeout` and `persistence_error` phases to error tracking.
2. **Session TTL configurability:** The 7-day session expiry is hardcoded in `sessionStore.ts` (line 15). Move to an environment variable for operational flexibility.
3. **AuthUXLoader page-specific skeletons:** Currently shows generic skeleton cards. For Search specifically, could show a search-bar skeleton. Low priority — the generic skeleton is already informative.
4. **`simulateTimeout` exposure in dev tools:** Add `window.__stockstory_simulateAuthTimeout = () => auth.simulateTimeout()` for easier manual testing from the browser console.

---

## 8. Files Modified

| File | Change |
|:-----|:-------|
| `src/services/auth/AuthStateLogger.ts` | **NEW** — centralised auth state logging |
| `src/context/AuthContext.tsx` | Added `isSessionExpired`, `sessionAgeMs`, `isSimulatingTimeout`, `simulateTimeout()`, integrated `logAuthState()` calls at every lifecycle point |
| `src/App.tsx` | Destructures `authError`/`isSessionExpired`/`isSimulatingTimeout`, passes them to `AuthUXLoader`, adds separate expired-session check |
| `src/components/auth/AuthUXLoader.tsx` | Added optional `isSimulatingTimeout` prop |

---

**Report complete.** No blank screens, no ambiguous loading states. Every protected route access path renders a context-aware diagnostic UI.
