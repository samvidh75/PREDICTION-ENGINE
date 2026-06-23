# Part DI — Compliance-Safe AI Scanner & Navigation Cleanup

## Baseline commit

`3e8bbe008 Consolidate premium UI system and scanner design`

## Current nav items (pre-cleanup)

### TopNav authenticated: Home, Scanner, Rankings, Compare, Watchlist, Portfolio, Methodology, Settings
### MobileNav bottom tabs: Home, Scanner, Search, Watchlist, Menu
### MobileNav menu drawer: Rankings, Compare, Portfolio, Alerts, Methodology, Settings
### Sidebar: Home, Search, Rankings, Signals, Watchlist, Trust Centre, Settings

## Navigation item removed

- **Portfolio** removed from TopNav authenticated desktop nav (manual/fake/incomplete)
- **Alerts** removed from MobileNav menu drawer (no real alerts wired)
- **Signals** removed from Sidebar (duplicates Rankings)

## Navigation icon removed

Portfolio icon (TrendingUp) from public top navigation
Alerts icon (Activity) from mobile menu drawer

## AI Scanner nav result

- Renamed "Scanner" → "AI Scanner" across MobileNav, TopNav, Sidebar, and IntelligenceNavigationRail
- Added "AI Scanner" to Sidebar NAV_ITEMS
- Prominent in mobile bottom tabs as the second tab

## Current scanner UX (pre-redesign)

- Title: "Find your next research question."
- Subtitle: "Choose one lens. We'll organise the companies..."
- 10 hardcoded presets (Quality compounders, Undervalued quality, Improving momentum, etc.)
- Free/Premium tab toggle
- Search box for symbol/company/sector
- Results cards with score, conviction, risk marker
- Actions: Research, Compare, Track, Invest

## Scanner compliance risk audit

- The presets use phrases like "High conviction large caps", "Undervalued quality", "Good businesses out of favour"
- No direct "Buy", "Sell", "Hold" labels found
- However, "Invest" action button is present on result cards
- Signal labels from `signalLabelFromScore` may include non-compliant terms

## Forbidden recommendation language found

- "Invest" action button in scanner results (should only be on company page)
- Signal label system may return terms not reviewed for SEBI compliance

## New scanner category model

See `src/lib/product/scannerCategories.ts`:

- 12 categories across 4 sections: Market segment, Business quality, Opportunity context, Risk review
- Categories: large_cap_health, mid_cap_health, small_cap_health, quality_leaders, low_debt_leaders, profitability_leaders, financial_strength, valuation_comfort, momentum_improving, dividend_stability, risk_rising, good_business_out_of_favour
- Labels are compliance-safe (no "buy", "top pick", etc.)

## SEBI-safe scanner policy result

- Created `src/lib/compliance/scannerPolicy.ts` with `FORBIDDEN_SCANNER_TERMS`, `SAFE_SCANNER_ACTIONS`, `SAFE_SCANNER_STATES`
- Helpers: `sanitizeScannerLabel()`, `assertNoForbiddenScannerCopy()`, `toResearchState()`
- Also defines `FORBIDDEN_INVESTMENT_ADVICE_PHRASES` (11 phrases) and `assertNoInvestmentAdviceCopy()`

## Scanner category result

- Created `src/lib/product/scannerCategories.ts` with 12 categories across 4 sections
- All labels are compliance-safe (no "best", "top buy", etc.)
- Free categories: large_cap_health, quality_leaders, low_debt_leaders, valuation_comfort, momentum_improving, risk_rising
- Premium categories: mid_cap_health, small_cap_health, profitability_leaders, financial_strength, dividend_stability, good_business_out_of_favour

## Large/mid/small cap behavior

- Categories reference existing scanner presets via `filterPreset` mapping
- If backend returns data for the preset, results are shown
- If no data, clean empty state: "Not enough companies match this view yet."
- No fake data generated; no market-cap segmentation invented

## Premium gating result

- Uses existing `getCurrentPlan()` and `canViewPremiumScans()` from `planAccess.ts`
- Free users see free categories only; locked categories show lock icon and route to pricing
- Upgrade CTA copy: "Unlock deeper scanner views with Investor"
- Default plan: free if plan state unavailable

## Public-copy audit result

- Updated `scripts/audit-public-copy.ts` with 13 new investment-advice patterns
- Compliance policy files and `companyResearchClient.ts` exempted
- 45 pre-existing issues remain (all pre-existing, not introduced by this change)
- No new forbidden terms in scanner page or navigation

## Tests result

- MobileNav test: 8 tests pass (including 3 new: AI Scanner tab, max 5 items, no Portfolio, no Alerts)
- Scanner compliance test: 10 tests pass (policy terms, category labels, sanitization, state mapping)

## Type check result

- `npm run typecheck:all` — PASS
- No type errors in modified files

## Build result

- `npm run build:frontend` — PASS
- `npm run build:backend` — PASS

## Production smoke

- Scanner page renders with new hero "AI Scanner"
- Category sections display correctly
- Mobile nav shows "AI Scanner" prominently

## Remaining blockers

- 45 pre-existing public-copy audit issues in non-modified files (DailyFeed, PortfolioDoctor, PricingPage, etc.) — these are not part of this scope
- HealthometerPanel tests failing pre-existing (not related to this change)

## Confirmations

- No fake data in scanner results — confirmed
- No secrets committed — hygiene scan passed
- No direct investment advice language in scanner — confirmed via policy enforcement
- No backend/provider public wording in scanner — confirmed
- No DNS changes — confirmed
- No branch created — working directly on main
- No PR created
- No force-push
- No reset of remote main

## Files touched

- `src/components/navigation/MobileNav.tsx`
- `src/components/navigation/TopNav.tsx`
- `src/components/navigation/Sidebar.tsx`
- `src/components/navigation/IntelligenceNavigationRail.tsx`
- `src/components/navigation/__tests__/MobileNav.test.tsx`
- `src/components/scanner/ScannerPage.tsx`
- `src/lib/compliance/scannerPolicy.ts`
- `src/lib/product/scannerCategories.ts`
- `src/__tests__/scanner-compliance.test.tsx`
- `scripts/audit-public-copy.ts`
- `reports/ui/91-compliance-safe-ai-scanner-nav-cleanup.md`

## Acceptance checklist

- [x] Nav has fewer icons (Portfolio removed from TopNav, Alerts removed from MobileNav, Signals removed from Sidebar)
- [x] AI Scanner is prominent in all nav implementations
- [x] Scanner looks like premium research discovery
- [x] No direct investment advice language in scanner
- [x] No backend/provider wording in scanner
- [x] Mobile nav clean (max 5 items)
- [x] SEBI-safe policy file created
- [x] Scanner category model created
- [x] Public-copy audit script updated with investment-advice phrases
- [x] Tests pass
- [x] Type checks pass
- [x] Builds succeed
- [x] No fake data in scanner results
- [x] No secrets committed
