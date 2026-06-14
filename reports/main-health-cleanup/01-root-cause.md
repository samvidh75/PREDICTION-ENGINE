# Main Health Cleanup — Root Cause Analysis

**Date:** 2026-06-15
**Branch:** `track-main-health-cleanup`
**Base SHA:** `2029a2c1`

---

## Blocker 1: Orphaned `src/components/src/` Artifact Directory

**Symptom:**
```
src/components/src/services/portfolio/AlertEngine.ts(7,33): error TS2307:
  Cannot find module '../auth/sessionStore'
src/components/src/services/portfolio/AlertEngine.ts(8,38): error TS2307:
  Cannot find module '../diagnostics/AnalyticsCoordinator'
src/components/src/services/portfolio/AlertEngine.ts(9,50): error TS2307:
  Cannot find module '../auth/authenticatedFetch'
```

**Investigation:**
- The `src/components/src/` directory does **not exist** on a fresh checkout of `origin/main` (commit `2029a2c1`).
- It was a local-only artifact from a prior checkout or code generation run — not committed to git.
- The TypeScript frontend typecheck failed only because an untracked directory was present on disk from an earlier session.

**Resolution:** Working on a fresh branch from `origin/main` eliminates this artifact. The directory must not be committed. Added to `.gitignore` as a preventive measure.

---

## Blocker 2: `FinnhubProvider` Constructor Test Failure

**Symptom:**
```
expect(() => new FinnhubProvider('')).toThrow(/FINNHUB_KEY/);
// Expected: throw
// Received: undefined (no throw)
```

**Root Cause:**
The `FinnhubProvider` constructor at `src/services/providers/FinnhubProvider.ts` (line 28-33) checks multiple sources for the API key:
```typescript
const key = apiKey
  || (typeof process !== 'undefined' && process.env?.FINNHUB_KEY)
  || (typeof process !== 'undefined' && process.env?.FINNHUB_API_KEY)
  || (typeof process !== 'undefined' && process.env?.VITE_FINNHUB_API_KEY)
  || '';
if (!key) {
  throw new Error('Finnhub API key not set (FINNHUB_KEY)');
}
```

When `new FinnhubProvider('')` is called with empty string, the constructor falls through to check `process.env.FINNHUB_KEY`, `FINNHUB_API_KEY`, and `VITE_FINNHUB_API_KEY`. If any of these are set in the test environment (e.g., via `.env` files, CI config, or shell), the constructor **succeeds** instead of throwing.

The test was originally written when the constructor only checked the `apiKey` parameter. The F2/F3 broker migration added the env var fallback but the test was not updated to clear those env vars.

**Resolution:**
Wrap the Finnhub-specific tests in a `describe('FinnhubProvider')` block with `beforeEach` that saves and clears all three Finnhub-related env vars, and `afterEach` that restores them. This makes the test hermetic regardless of the test environment's configuration.

---

## Summary

| Blocker | Root Cause | Fix |
|---------|------------|-----|
| `src/components/src/` artifact | Local-only untracked directory | Fresh checkout suffices; add to `.gitignore` |
| FinnhubProvider test | Test not hermetic — env vars from environment prevent the expected throw | Add `beforeEach`/`afterEach` to clear/restore Finnhub env vars |
