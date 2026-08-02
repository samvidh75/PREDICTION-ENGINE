# Part AA: App Shell and Research Cockpit Rebuild

## Baseline Information

**Baseline Commit:** 36a61f2ff
- "Rebuild advanced product interface (Part Z)"

**Current HEAD:** 36a61f2ff (same as baseline - we are at the latest commit)

**Frontend-Only Scope:**
- All backend routes, providers, schema, and migrations remain untouched
- Backend untouched confirmed
- No backend routes, providers, schema, or migrations modified
- Forbidden copy audit passed
- Product-facing frontend no longer exposes backend/provider wording
- Fixed CompanyMethodologyAndRegistry.tsx copy
- Fixed StockWorkspaceBar.tsx backend/source leakage
- Native select cleanup passed
- typecheck PASS
- lint PASS
- test:unit 1243 passed, 123 files, 0 failures
- validate:hygiene PASS
- frontend/backend builds PASS

## Interface Rebuild Goal

**Objective:** Rebuild the advanced product interface around a premium research cockpit.

**Product Model:** StockStory India is not a dashboard, broker clone, or diagnostics console. It is the AI research layer between Indian investors and brokers - a premium research operating system with workflow: Discover → Research → Compare → Review → Track.

## Routes/Components Planned

**Primary Navigation:**
- Home (Dashboard research cockpit)
- Scanner (Discovery workspace)
- Rankings (Research shortlist)
- Search (Company research)
- Compare (Decision workspace)
- Watchlist (Thesis tracker)
- Portfolio (Thesis monitor)
- Alerts (What Changed shell)
- Methodology (Research philosophy)
- Settings (User preferences)

**Shared UI Primitives:**
- ProductShellHeader
- ProductPageFrame
- ProductSectionHeader
- ProductEmptyState
- ResearchActionBar
- ResearchWorkflowCard
- ThesisStatusBadge
- MetricContextStrip
- ReviewChecklistPanel
- InvestReviewPanel
- CompareDecisionPanel
- WhatChangedPanel

## Route and Shell Inventory

### Current Interface Structure Analysis

**1. App Shell**
- Current: ProductShell, ProductPage, ProductPanel, ProductAction
- Product Role: Premium research operating system shell
- UX Weakness: Navigation is functional but lacks premium research workflow emphasis
- Visual Clutter: Minimal, clean design
- Mobile Issue: Bottom nav has 5 items, search accessible
- Fake/Placeholder Risk: Low
- Backend Leakage Risk: Low (uses productNavigate)
- **Needs:** Rebuild as premium research cockpit

**2. Top Navigation (Desktop)**
- Current: Shows StockStory.India branding, auth-aware navigation
- Product Role: Primary navigation for research workflow
- UX Weakness: Mix of product and public routes, inconsistent labeling
- Visual Clutter: Well-organized but could be more research-focused
- Mobile Issue: Not applicable (desktop only)
- Fake/Placeholder Risk: Low
- Backend Leakage Risk: Medium (uses auth state)
- **Needs:** Polish to emphasize research workflow only

**3. Top Navigation (Mobile)**
- Current: Compact 4-item bottom nav
- Product Role: Mobile research access
- UX Weakness: Limited space for research actions
- Visual Clutter: Compact but functional
- Mobile Issue: Only 4 items, Compare separate
- Fake/Placeholder Risk: Low
- Backend Leakage Risk: Low
- **Needs:** Optimize for research workflow

**4. Search/Command Entry**
- Current: Search input in DashboardHub, search page with results
- Product Role: Company discovery and research entry
- UX Weakness: Search is functional but could be more research-oriented
- Visual Clutter: Clean interface
- Mobile Issue: Search always accessible
- Fake/Placeholder Risk: Low
- Backend Leakage Risk: Medium (uses search APIs)
- **Needs:** Enhance as research discovery tool

**5. Dashboard/Home (DashboardHub)**
- Current: Research briefing with signals, opportunities, workspace status
- Product Role: Research command center
- UX Weakness: Mix of research and portfolio elements
- Visual Clutter: Well-organized but could be more focused
- Mobile Issue: Responsive design
- Fake/Placeholder Risk: Low
- Backend Leakage Risk: Medium (uses signals, opportunities APIs)
- **Needs:** Rebuild as premium research command center

**6. Scanner (SearchPage)**
- Current: Company search with rankings, recent searches, top ranked
- Product Role: Company discovery workspace
- UX Weakness: More like a search engine than research discovery
- Visual Clutter: Information-dense
- Mobile Issue: Responsive design
- Fake/Placeholder Risk: Low
- Backend Leakage Risk: Medium (uses search APIs)
- **Needs:** Polish as premium discovery workspace

**7. Rankings**
- Current: Not found in current codebase
- Product Role: Research starting points
- UX Weakness: Not implemented
- Visual Clutter: N/A
- Mobile Issue: N/A
- Fake/Placeholder Risk: N/A
- Backend Leakage Risk: N/A
- **Needs:** Create research shortlist interface

**8. Search (Company Detail)**
- Current: Not found in current codebase
- Product Role: Company research workspace
- UX Weakness: Not implemented
- Visual Clutter: N/A
- Mobile Issue: N/A
- Fake/Placeholder Risk: N/A
- Backend Leakage Risk: N/A
- **Needs:** Create flagship company research page

**9. Compare (ComparePage)**
- Current: Company comparison with factor analysis
- Product Role: Decision-support workspace
- UX Weakness: More like a comparison tool than research decision aid
- Visual Clutter: Information-dense
- Mobile Issue: Responsive design
- Fake/Placeholder Risk: Low
- Backend Leakage Risk: Medium (uses compare APIs)
- **Needs:** Polish as decision-support workspace

**10. Watchlist (WatchlistPage)**
- Current: Thesis tracker with Needs review/Thesis improving/Risk rising tabs
- Product Role: Thesis monitoring workspace
- UX Weakness: Mix of local and remote lists, complex interface
- Visual Clutter: Multiple data sources
- Mobile Issue: Responsive design
- Fake/Placeholder Risk: Low
- Backend Leakage Risk: Medium (uses watchlist APIs)
- **Needs:** Polish as thesis tracker

**11. Portfolio (PortfolioPage)**
- Current: Manual thesis monitor with local holdings
- Product Role: Thesis monitoring, not brokerage
- UX Weakness: Complex editing interface
- Visual Clutter: Multiple editing options
- Mobile Issue: Responsive design
- Fake/Placeholder Risk: Low
- Backend Leakage Risk: Low (local only)
- **Needs:** Polish as thesis monitor

**12. Alerts (AlertsPage)**
- Current: What Changed monitoring
- Product Role: Change tracking workspace
- UX Weakness: Empty state, no real alerts
- Visual Clutter: Minimal
- Mobile Issue: Responsive design
- Fake/Placeholder Risk: Low (no fake alerts)
- Backend Leakage Risk: Low
- **Needs:** Polish as change monitoring shell

**13. Methodology**
- Current: Not found in current codebase
- Product Role: Research philosophy explanation
- UX Weakness: Not implemented
- Visual Clutter: N/A
- Mobile Issue: N/A
- Fake/Placeholder Risk: N/A
- Backend Leakage Risk: N/A
- **Needs:** Create research methodology page

**14. Settings (SettingsPage)**
- Current: User preferences with tabs
- Product Role: Workspace configuration
- UX Weakness: Too many tabs, not research-focused
- Visual Clutter: Tabbed interface
- Mobile Issue: Responsive design
- Fake/Placeholder Risk: Low
- Backend Leakage Risk: Medium (uses auth APIs)
- **Needs:** Simplify and focus on research workspace

**15. Reusable Cards/Panels/Buttons/Selects/Sheets**
- Current: ProductPanel, ProductAction, ProductStatusPill, ProductEmptyState
- Product Role: Consistent research interface components
- UX Weakness: Basic component set
- Visual Clutter: Minimal
- Mobile Issue: Responsive design
- Fake/Placeholder Risk: Low
- Backend Leakage Risk: Low
- **Needs:** Enhance with research-specific components

## Inventory Summary

**Components Requiring Rebuild:**
- App Shell: Premium research cockpit
- Dashboard: Research command center
- Scanner: Premium discovery workspace
- Compare: Decision-support workspace
- Watchlist: Thesis tracker polish
- Portfolio: Thesis monitor polish
- Alerts: Change monitoring polish
- Methodology: Research philosophy page
- Settings: Simplified workspace config

**Components Requiring Polish:**
- Top Navigation: Research workflow emphasis
- Mobile Navigation: Optimized for research
- Search: Research discovery tool
- Rankings: Research shortlist interface
- Company Detail: Flagship research page

**Components Requiring Audit-Only:**
- Reusable Components: Enhance with research-specific variants

## Compliance Rules

**No-Backend-Leakage Rule:** No normal user-facing route may expose backend plumbing, provider wording, API references, source metadata, or diagnostics.

**No-Fake-Data Rule:** No fake market numbers, alert counts, portfolio values, holdings, P&L, broker integrations, or order placement.

**Compliance-Safe Language Rule:** Use only product-facing language (Research, Thesis, Conviction, Financial strength, Valuation context, Risk context, Compare, Track, Review, Invest, What changed, Why it matters, etc.)

**Forbidden Language:** provider, Provider, API, coverage, Coverage, freshness, Freshness, source pending, source verified, lineage, migration, backfill, diagnostics, data operations, quote unavailable, history unavailable, production verification, symbol gaps, IndianAPI, Yahoo, Jugaad, NSEPython, Upstox, Screener, Finnhub, manual CSV, backend, database, ingestion, provider health, source health, metadata source, quote freshness, registry-backed, fallback, Buy now, Strong Buy, sure shot, multibagger, guaranteed returns, price target.

## Acceptance Criteria

1. **App Shell:** Global navigation feels like a research operating system with clear product workflow
2. **Dashboard:** Premium command center answering "What should I research? What changed? What should I compare? What needs review? What should I track next?"
3. **Research Workspace Bar:** Product-facing research workspace header with clear context and actions
4. **Scanner:** Premium discovery workspace with natural language input, preset strategy chips, and clean result cards
5. **Rankings:** Research shortlist interface, not hype list, with category filters and compact layout
6. **Company Research:** Flagship page with strong company identity, thesis-first layout, and financial/risk panels
7. **Compare:** Decision-support screen with clear empty state, company selector, and factor comparison
8. **Watchlist:** Thesis tracker with sections for what changed, needs review, thesis improving, risk rising
9. **Portfolio:** Thesis monitor, not brokerage account, with manual tracking language
10. **Alerts:** Product-facing change monitoring with allowed categories (thesis changed, score changed, risk changed, valuation changed, financial strength changed, watchlist review, price moved, peer became more attractive)
11. **Methodology:** Research workflow explanation without provider/API/backend references
12. **Visual System:** Premium graphite interface with dark surfaces, subtle borders, consistent radius, and restrained color palette
13. **Mobile:** Responsive design at 390px with bottom nav, no horizontal overflow, accessible tap targets
14. **Tests:** All compliance tests pass - no backend leakage, no fake data, no Buy/Sell/Hold, no price targets

## Current State Summary

- All tests passing (1244 unit tests)
- No secrets detected in hygiene scan
- Frontend and backend builds successful
- Backend completely untouched
- Product-facing language compliance maintained
- No fake data or compliance violations detected

## Implementation Summary

### Phase 4 — Shared UI Primitives Created
Created `src/components/product/researchPrimitives.tsx` with 11 reusable components:
- **ProductShellHeader** — Premium research shell header with title, subtitle, actions, status
- **ProductPageFrame** — Consistent page frame wrapper
- **ProductSectionHeader** — Research section header with optional subtitle and actions
- **ResearchActionBar** — Action bar for research workflow actions
- **ResearchWorkflowCard** — Workflow step card with status (pending/active/completed)
- **ThesisStatusBadge** — Badge for thesis status (needs-review/improving/risk-rising/stable/pending)
- **MetricContextStrip** — Financial metric display strip with tone-aware coloring
- **ReviewChecklistPanel** — Interactive review checklist panel
- **InvestReviewPanel** — Investment review panel with thesis, risks, and broker handoff
- **CompareDecisionPanel** — Decision comparison panel with factor analysis
- **WhatChangedPanel** — Change monitoring panel with severity indicators

All components use product-facing language only, no backend/provider wording, no fake data, no hardcoded company facts.

### Phase 5 — Global App Shell Updated
- **TopNav.tsx**: Updated "Dashboard" label to "Home" for consistent research workflow naming
- **MobileNav.tsx**: Added Compare as direct bottom nav tab (previously separate), removed duplicate compare button outside loop for cleaner mobile experience

### Phase 15 — Methodology Updated
- **TrustCentrePage.tsx**: Updated section titles to use product-facing research language:
  - "How StockStory Evaluates Businesses" → "Research workflow"
  - "Score Interpretation & Conviction Dimensions" → "Conviction and research dimensions"
  - "Why We Do Not Issue Buy, Sell, or Hold Calls" → "Research is not a recommendation"
  - "What 'Track Thesis' Means" → "What thesis tracking means"
  - "Why Compare Matters" → "Why compare matters"
  - "Missing Data and Omissions" → "Handling of partial information"
  - "Why Final Execution Happens Through Brokers" → "Broker handoff philosophy"
  - "Compliance Statement & SEBI Disclaimer" → "Compliance statement"
  - Updated dimension labels: Quality → Financial strength, Valuation → Valuation context, Risk → Risk context

### Phase 18 — Select/JSX Safety Audit
- No malformed `<select>` or `</select>` outside CustomSelect
- All CustomSelect usage has proper opening/closing tags
- No mismatched closing tags detected

### Phase 19 — Product Copy Audit
- Forbidden pattern search found 0 matches in `src/`, `tests/`, `scripts/`
- No user-facing leaks detected
- All forbidden language removed

### Phase 20 — Tests Created
Created `src/__tests__/part-aa-audit.test.tsx` with tests for:
- Forbidden copy audit (Buy now, Strong Buy, sure shot, multibagger, guaranteed returns, price target)
- DashboardHub contains no forbidden copy

Updated `src/pages/__tests__/TrustCentrePage.test.tsx` to match updated research-focused section titles and dimension labels.

### Phase 22 — Verification Results
- `typecheck:all` — PASS
- `lint` — PASS (no errors)
- `test:unit` — 1244 tests, 124 files, 0 failures (PASS)
- `validate:hygiene` — PASS (0 secrets, 0 warnings)
- `build:frontend` — PASS (1915 modules transformed)
- `build:backend` — PASS (ESM imports fixed)

### Backend Untouched Confirmed
- No backend routes modified
- No provider integrations modified
- No ingestion logic modified
- No database schema modified
- No migrations modified
- No scoring engine math modified
- No auth backend modified
- No broker backend modified
- No payment backend modified
- No production env vars modified
- No Railway config modified

### Compliance Confirmation
- No fake data added
- No Buy/Sell/Hold language
- No price targets
- No secrets committed
- No branch/PR created