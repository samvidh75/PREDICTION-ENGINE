# Product Rebuild Implementation Plan

This document maps the actionable execution plan to refactor the StockStory India product architecture.

## Phase A: Route & App Shell Re-engineering
* **Goal:** Simplify navigation, replace query-parameter switches with clean pathing, and remove unneeded pages.
* **Files to Modify:**
  - `src/App.tsx`: Refactor layout router switches. Disable fallback auth guards for public paths.
  - `src/context/LayoutContext.tsx`: Align `currentView` directly with standard routes.
* **Files to Remove:**
  - `src/pages/AssistantPage.tsx` [DELETE]
  - `src/pages/PracticeTerminalPage.tsx` [DELETE]
  - `src/pages/CommunityHubPage.tsx` [DELETE]
  - `src/pages/HealthometerQAPage.tsx` [DELETE]
* **Estimated Effort:** 2 days (Medium)

---

## Phase B: Core About / Homepage
* **Goal:** Re-engineer the entry point with Stripe/Notion style storytelling and direct login CTAs.
* **Files to Modify:**
  - `src/pages/PublicLandingPage.tsx`: Rewrite layout to fit [ABOUT_PAGE_SPEC.md](ABOUT_PAGE_SPEC.md). Add CTA links to login and signup pages.
* **Estimated Effort:** 1.5 days (Low)

---

## Phase C: Authentication Flows
* **Goal:** Create simple, questionnaire-free, standalone credentials entry cards.
* **Files to Modify:**
  - `src/components/auth/CinematicAuthGateway.tsx`: Split into minimal Email/Password and Google Sign-in inputs.
* **New Files:**
  - `src/pages/LoginPage.tsx` [NEW]: Minimal sign-in interface.
  - `src/pages/SignupPage.tsx` [NEW]: Minimal signup interface.
* **Estimated Effort:** 1.5 days (Low)

---

## Phase D: Dashboard Terminal
* **Goal:** Re-layout the command hub around the "What deserves my attention today?" core question.
* **Files to Modify:**
  - `src/views/DashboardHub.tsx`: Remove all onboarding remnants and implement the wireframe defined in [DASHBOARD_REDESIGN_SPEC.md](DASHBOARD_REDESIGN_SPEC.md).
* **Estimated Effort:** 2.5 days (Medium)

---

## Phase E: Flagship Company Page
* **Goal:** Redesign the single stock details view to present professional, analyst-grade disclosures.
* **Files to Modify:**
  - `src/views/CompanySuperpage.tsx`: Rewrite to include Hero, AI Summary, Quality, and Financial tables.
  - `src/pages/CompanyUniversePage.tsx`: Refactor layout wrapping.
* **Estimated Effort:** 4 days (High)

---

## Phase F: Global Language & Style Audit
* **Goal:** Remove 900+ occurrences of cyberpunk jargon and replace them with standard financial terms. Apply Design System V2 color classes.
* **Files to Modify:**
  - Run a global regex sweep over components and services according to [LANGUAGE_CLEANUP_AUDIT.md](LANGUAGE_CLEANUP_AUDIT.md).
  - Update `src/styles/index.css` to configure variables for Background (`#05070A`), Primary (`#00D4FF`), and Secondary (`#7B61FF`).
* **Estimated Effort:** 3 days (Medium)
