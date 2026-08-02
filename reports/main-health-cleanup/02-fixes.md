# Main Health Cleanup — Fixes Applied

**Date:** 2026-06-15
**Branch:** `track-main-health-cleanup`

---

## Fix 1: Test Hermeticity for FinnhubProvider Constructor

**File changed:** `tests/providers/live-provider-adapter-contract.test.ts`

**What changed:**
Wrapped the three Finnhub-related tests in a dedicated `describe('FinnhubProvider')` block with:

- `beforeEach`: Saves `process.env.FINNHUB_KEY`, `FINNHUB_API_KEY`, and `VITE_FINNHUB_API_KEY`, then deletes them so the constructor has no env var fallback when called with `''`.
- `afterEach`: Restores the saved env vars to avoid side effects on other tests.

**Why this fix instead of changing the constructor:**
The constructor behavior is correct — it should check env vars as a fallback so the provider works without explicit key-passing in production. The bug was only in the test's assumption that the environment is empty.

**No live API calls added.** All Finnhub tests still mock `fetch`.

---

## Fix 2: Orphaned Artifact Prevention

**File changed:** `.gitignore`

**What changed:**
Added `src/components/src/` to `.gitignore` to prevent any accidental commit of generated/artifact directories at that path.

**Why this fix:**
The directory doesn't exist on `origin/main`, but it can reappear if a code generation tool is run locally. The `.gitignore` entry ensures it won't accidentally be committed.

---

## Fix 3: No Production Code Modified

No production source files were changed. Only:
- Test file (fix 1)
- `.gitignore` (fix 2)
- New report files

This minimizes risk and keeps the cleanup focused on gate-blocking issues only.
