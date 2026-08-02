# Phase 2: Baseline Audit — StockStory Intelligence OS Reset

## Baseline
**Commit:** `a16c0cb5` — Add AI-native intelligence layer and premium research surfaces

## Current verification state
- typecheck: all pass
- lint: pass
- unit: 971/971 pass
- E2E: 36/36 pass
- frontend build: pass
- backend build: pass
- responsive audit: 88/88 pass
- smoke production: pass
- provider checks: pass (IndianAPI quotes, Yahoo blocked, NSELib archived, fundamentals partial)

## Why the app still feels average despite intelligence components

The previous phase added correct intelligence primitives (PredictionInsightCard, IntelligenceModal, FactorDriverCard, etc.) but the *product architecture* remains unchanged. The app is still a page-based router displaying components — not a cohesive Intelligence OS.

### Route-by-route audit

---

### Landing Page
**File:** `src/pages/PublicLandingPage.tsx`

**Why still average:**
- Still a page with sections, not a product launch
- Intelligence preview card is a style improvement but still a "card"
- CTAs are still buttons in a column
- No spatial depth, no modal preview, no command entry point
- No product visual beyond a card grid

**What should change:**
- Replace page sections with spatial layered canvas
- Add command palette trigger as primary hero CTA
- Replace "Research workflow" cards with interactive workflow preview
- Product visual should use real depth, not cards
- Remove "Create free account" from bottom (defer to sign-in route)

---

### Dashboard / Research Home
**File:** `src/views/DashboardHub.tsx`

**Why still average:**
- Still a single-column page with sections stacked vertically
- IntelligencePanel is correct but sits in a generic wrapper
- No left rail, no command-first layout
- ResearchWorkflowRail is buried in a side section
- Watchlist preview is still a basic list

**What should change:**
- Replace with Research Canvas layout (left rail + main + optional right)
- Command palette should be the primary interaction
- Prediction Intelligence should be above the fold with model run status
- ResearchWorkflowRail should be prominent
- Remove generic card summaries

---

### Rankings
**File:** `src/pages/PublicRankingsPage.tsx`

**Why still average:**
- Data table is functional but not premium
- "Explain" button works but feels added on
- Mobile cards are still basic
- No overview/insight panel
- ScorePill is still the old color-coded pill

**What should change:**
- Dense elegant research table (dark theme)
- Rank explanation panel should be a spatial sheet, not a section
- Mobile ranking cards should feel like native iOS/Android
- Remove old green/yellow score pills
- Add command actions for search/filter

---

### Signals / Predictions
**File:** `src/pages/PublicPredictionsPage.tsx`

**Why still average:**
- Signals table is basic
- Empty state is text-only
- No signal grouping or intelligence summary
- IntelligencePanel header is a small improvement but doesn't transform the page

**What should change:**
- Model run/freshness as a spatial header
- Signal groups as stacked cards
- Empty state with command actions
- Prediction Intelligence as the page's primary identity

---

### Company Detail
**File:** `src/pages/StockStoryPage.tsx`

**Why still average:**
- Still uses inline styles and old glass card system
- "Open full explanation" button was added but the modal uses IntelligenceModal correctly
- Tabbed interface is standard, not premium
- Score circle is from old prototype
- Factor scores use renderProgressBar (old pattern)

**What should change:**
- Company identity section should be spatial, not glass
- Replace old score circle with clean score display
- "Explain" should be the primary action, not a secondary button
- Factor evidence should use FactorDriverCard throughout
- Source audit should be a spatial sheet
- Remove all inline glass styling

---

### Watchlist
**File:** `src/pages/WatchlistPage.tsx`

**Why still average:**
- Saved research list works but has no spatial feel
- Input note fields are inline and basic
- "Explain" button is added but the rest is unchanged

**What should change:**
- Saved research cards should be premium intelligence cards
- Notes should be in a sheet, not inline
- Use PredictionInsightCard components
- Empty state should use ResearchCanvas pattern

---

### Portfolio / Manual Tracking
**File:** `src/pages/PortfolioPage.tsx`

**Why still average:**
- Functional holding tracker
- Inline glass modals for add/edit
- Manual tracking label is buried

**What should change:**
- Clear "Manual Tracking" branding
- Use spatial sheets for add/edit
- Prediction context per position if real data exists
- Graceful 503 state for /api/investor

---

### Trust Centre
**File:** `src/pages/TrustCentrePage.tsx`

**Why still average:**
- Data Intelligence Centre branding is correct but the layout is stacked sections
- RoundedDepthPanel is used but the page is still a scroll of sections
- Provider detail sheet uses IntelligenceModal correctly
- No provider domain matrix visualization

**What should change:**
- Data Intelligence Centre should be a proper data hub, not sections
- Provider domains should be a spatial matrix
- Use SpatialSheet for provider details (already uses IntelligenceModal)
- Make blocked/archived states visually clear
- Remove "Scoring factors" section text (belongs in methodology, not here)

---

### About
**File:** `src/pages/PublicAboutPage.tsx`

Functional, minimal changes needed.

---

### Settings / Auth
**File:** `src/pages/SettingsPage.tsx`, `LoginPage.tsx`, `SignupPage.tsx`

Settings: functional, no changes. Auth: no changes.

---

## Summary of what must change

| Aspect | Current | Target |
|---|---|---|
| App shell | AppLayout/TopNav/Sidebar/MobileNav | IntelligenceOSShell + ResearchCanvas |
| Command | Ctrl+K overlay | CommandPalette with real actions |
| Modals | IntelligenceModal | SpatialModal + SpatialSheet system |
| Page layout | Stacked sections | Spatial canvas with rails |
| Landing | Sections and cards | Premium spatial launch page |
| Rankings | Table + explain button | Research table + spatial explanation |
| Signals | Simple table | AI-native prediction intelligence |
| Company | Glass cards + tabs | Spatial flagship detail page |
| Trust | Section scroll | Spatial data hub |
| Watchlist | Basic list | Saved research cards |
| Polish | None | Micro-interactions, smooth transitions |

## Components to demote/remove
- Old `GlassModal` → replace with `SpatialModal`
- Old `Card` → replace with `IntelligenceOSCard` or nothing
- Old `ScorePill` → replace with clean score display
- Old `renderProgressBar` → replace with `FactorDriverCard`
- Old inline glass styles in StockStoryPage
- Old green/yellow color patterns
- Old `PremiumPage` where `IntelligenceOSShell` replaces it
