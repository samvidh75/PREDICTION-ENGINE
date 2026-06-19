# Emergency Premium UI & Data Display Repair Report

## Baseline Context

- **Baseline Commit**: `07fb1c80e` ("Harden product data display and premium research surfaces")
- **Initial Verification**:
  - `npm run typecheck:all`: **PASS**
  - `npm run lint`: **PASS**
  - `npm run test:unit`: **FAIL** (`RealDataIntegration.test.tsx` failing due to missing Reliance scores or UI data mismatches)
  - `npm run validate:hygiene`: **PASS**
  - `npm run build:frontend`: **PASS**
  - `npm run build:backend`: **PASS**
  - `npm run test:e2e`: **PASS**
  - `npm run smoke:production`: **PASS**
  - `npm run verify:data:production`: **PASS** (with 4 non-critical warnings)

---

## Screenshot-Observed Design & Data Defects

### 1. Rankings Page Coherence
- **Defect**: The rankings table uses a white background (`bg-white` and light border classes inside the `Table` component), breaking the dark graphite design identity of StockStory.
- **Defect**: Spacing, text hierarchy, button sizes, and pills look generic and disconnected from the rest of the application.
- **Defect**: Uses raw blue "Not available" badges instead of product-correct design tokens.

### 2. Public Rankings Leakage
- **Defect**: The rankings route exposes all scored companies, symbol lists, and scores publicly before creating an account or logging in, reducing the motivation for signup.
- **Defect**: Public access should show a teaser preview (e.g., top 3-5 companies only, masked columns, methodology CTA) instead of the full data.

### 3. Broken Sector / Category Filtering
- **Defect**: The sector filter lists "All Sectors" but items render as "Not available".
- **Defect**: If there's only one useful option (e.g. "Not available" or "All"), the dropdown is useless and should be hidden.
- **Defect**: Sector options must be dynamically derived from actual ranking entries, ignoring empty/null/"Not available" values. If no valid sector names exist, hide the filter element entirely.

### 4. Data-Display Pipeline Mapping & Placeholders
- **Defect**: Portfolio page displays repeated "Awaiting pricing" or pending placeholders even when underlying backend data is returned.
- **Defect**: "Not available" chips display raw database/API states. We must display only premium product-safe language or omit columns/badges when fields are absent.

### 5. About Page Substance
- **Defect**: Current About page is a skeleton that immediately pushes "Open rankings" as the primary public CTA (which conflicts with gating rankings).
- **Defect**: Needs to detail StockStory's value proposition, broker-neutrality, workflow, compliance/disclaimer guidelines, and post-signin features.

### 6. Auth Flow Mismatch
- **Defect**: Signup page copy says "Sign in to open research for ITC" while page title is "Create account", creating auth confusion.
- **Defect**: Clear hierarchy, clean layouts, and target return parameters are needed so users flow cleanly into signin/signup.

### 7. Browser-Default Dropdowns & Selects
- **Defect**: Sector select and scanner filters use raw browser-default styling which looks unpolished.
- **Defect**: Need modern, dark graphite styled select controls with custom focus rings and text colors matching the theme.

---

## Root Cause Hypotheses

1. **Table Component Styles**: The generic `Table` component has hardcoded `bg-white` and light border styling that forces a bright background on a dark canvas unless overridden.
2. **Missing Gate/Teaser Logic**: `PublicRankingsPage.tsx` directly renders `filteredRankings` from the `api.getScanner` response without checking whether the user is logged in or limiting rows for guests.
3. **Sector Accumulator Bug**: Sector options are accumulated using `r.sector` which contains empty strings or raw unavailable indicators, and doesn't hide the select when count <= 1.
4. **Auth Page Copy Reversal**: Copy states are shared or misconfigured on signup vs signin views, rendering the incorrect header messages for specific redirect flows.

---

## Acceptance Criteria

1. Rankings table is dark graphite, matches StockStory theme, has premium spacing, and has no white blocks.
2. Public rankings page gates data: displays only the top 3 companies for anonymous users, masks scores/theses, and renders a "Create free account" teaser panel.
3. Sector filter is dynamically compiled from real data, hides if useful options < 2, and ignores "Not available" sectors.
4. About page is a comprehensive, premium trust page explaining StockStory's workflow and what is unlocked after login.
5. Auth flows display correct copy corresponding to signup vs login actions.
6. All dropdowns and select filters use custom dark styling matching the visual system.
7. All tests (unit + E2E + linter) pass clean.
