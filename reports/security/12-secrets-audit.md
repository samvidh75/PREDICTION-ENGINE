# Secrets Audit — Part 12

## Summary

| Severity | Count | Status |
|----------|-------|--------|
| 🔴 Critical | 1 | Fixed |
| 🟡 Medium | 1 | Documented |
| 🟢 Low | 2 | Documented |

## 🔴 Critical: `.env.prod` committed to git

**File:** `.env.prod` (40 lines)
**Committed in:** `db4bc3e2` "chore: add production configuration for Railway deployment (100% FREE)"
**Exposed secrets:** DATABASE_URL, POSTGRES_PASSWORD, COOKIE_SECRET, REDIS_URL, GROQ_API_KEY placeholder

**Fix applied:**
- `.env.prod` added to `.gitignore`
- `.env.vercel` and `.env.vercel.preview` also added to `.gitignore`
- `git rm --cached .env.prod .env.vercel .env.vercel.preview` executed
- Files are now untracked (still in git history, but no longer staged in future commits)

**Note:** Past git history still contains the secrets. For a thorough cleanup, consider rebasing or using BFG Repo-Cleaner before making the repo public.

## 🟡 Medium: `.env.example` contains structured placeholder keys

**File:** `.env.example`
**Issue:** Shows FIREBASE_PRIVATE_KEY template with `-----BEGIN PRIVATE KEY-----` placeholder. This is intentional for setup guidance but could be copy-pasted carelessly.

**Status:** Acceptable — all values are clearly placeholders.

## 🟢 Low: Test credentials in playwright.config.ts

**File:** `playwright.config.ts`
**Issue:** Contains fake Firebase API key `AIzaSy012345678901234567890123456789012`
**Status:** Test-only file, fake key. No action needed.

## 🟢 Low: Bearer tokens in test scripts

**Files:** `scripts/*.ts`
**Issue:** Test scripts reference Bearer tokens for Upstox API testing.
**Status:** Script-only, not production. Tokens are template/example values.

## Findings

- **No hardcoded credentials** in production source code (`src/`)
- **No API keys** in committed source files
- **No JWT secrets** hardcoded in TypeScript/JavaScript
- **No private keys** in source code
- **No database passwords** in source code (only in `.env.prod` which is now untracked)

## Recommendations

1. ⚠️ Rebase git history to remove `.env.prod` from past commits before open-sourcing
2. Rotate all secrets that were in `.env.prod` (DATABASE_URL, COOKIE_SECRET, POSTGRES_PASSWORD, REDIS_URL)
3. Use Vercel/Render environment variable dashboard for production secrets instead of committed files
