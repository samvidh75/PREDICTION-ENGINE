# Phase 11 — Compliance-Safe Monetization and Broker Handoff

## Baseline Report

**Date:** 2026-06-28  
**Commit (baseline):** e1d167c2  
**Branch:** main  

---

### Baseline Verification Results

| Check | Status |
|-------|--------|
| `git pull --ff-only origin main` | ✅ Already up to date |
| `npm run typecheck:frontend` | ✅ Pass |
| `npm run typecheck:backend` | ✅ Pass |
| `npm run lint` | ✅ Pass |
| `npm run test:unit` | ✅ 123 test files, 1447 passed, 7 skipped |
| `npm run validate:hygiene` | ✅ Pass (no secrets) |
| `npm run build:frontend` | ✅ Build succeeds |
| `npm run build:backend` | ✅ Compilation succeeds |

---

### Current Auth State

- Firebase Auth (Google & Email/Password) implemented via `src/services/auth/`
- Session store via `sessionStore.ts` with JWT session cookies
- Auth guard component exists at `src/services/auth/authGuard.tsx` but NOT applied to any routes
- **No subscription/plan checks in auth middleware**

### Current User Profile / Subscription State

- Tier field (`'elite' | 'standard'`) defined in `UserProfile` type but **unused**
- No subscription, plan, billing, or pricing fields in profile
- Profile exists in `src/services/auth/userProfile.ts` — maps to market intelligence inputs only

### Current Payment Integration State

- **No payment integration** — no Stripe, Razorpay, or any payment libraries in package.json
- No checkout flow, no webhook handlers, no transaction logging

### Current Broker Handoff State

- Upstox OAuth 2.0 with PKCE implemented (read-only portfolio ingestion)
- `src/services/brokers/` contains: BrokerProvider, UpstoxProvider, UpstoxOAuth, TokenStore, PortfolioIngestionEngine
- **No order placement** — read-only by design
- Other brokers (Zerodha, Groww, Angel, Dhan) not implemented
- StockPage.tsx has an "Invest via broker" placeholder button

### Current Pricing UI State

- **No pricing pages or components exist**
- All routes are free: `/`, `/scanner`, `/stock/:symbol/*`, `/watchlist`, `/compare`

### Current Compliance / Methodology Page State

- SEBI Compliance Banner displayed on HomePage, ScannerPage, StockPage
- `src/compliance/` contains: ComplianceBanner, MarketDataDisclosure, ResearchOnlyGuard
- Disallowed terms filter in place (buy, sell, recommend, target price, guaranteed, etc.)
- Data delay disclosure (15 min)
- **No dedicated Terms/Privacy/Methodology page routes**

### Current Premium Feature Candidates

Features flagged in `src/config/feature-flags.ts` (env-var gated, not subscription-gated):
- Research Bot (chat-based analysis)
- Score Explanations
- Stock Comparison
- Thesis Tracking
- Portfolio ingestion (Upstox)
- Real-time data

### Current Frontend Routes

| Route | Component | Auth Required |
|-------|-----------|---------------|
| `/` | HomePage | No |
| `/scanner` | ScannerPage | No |
| `/watchlist` | PlaceholderPage | No |
| `/compare` | PlaceholderPage | No |
| `/stock/:symbol/*` | StockPage | No |

Route guard exists but not applied to any routes.

### Production Verification

- Backend URL: `https://stockstory-api.onrender.com`
- Builds pass cleanly for both frontend and backend

---

### Scope of This Phase

Build the business layer for StockStory India:

- Product tiers (Free, Research Plus, Research Pro)
- Entitlement service (feature gating by plan)
- Usage limits and fair-use tracking
- Payment provider strategy (Razorpay/Stripe)
- Checkout and billing API stubs
- Pricing page with feature comparison
- Feature gates in frontend (FeatureGate, UpgradePrompt, useEntitlements)
- Broker handoff strategy (registry, service, UI)
- Investment review flow hardening
- Compliance trust layer (research-only policy, disclosures)
- Trust/methodology page upgrades
- Commercial analytics events
- Commercial verification script
- Security/secrets audit
- Safety greps and remediation
- Comprehensive tests
- Final reports
