# Phase 1: Product Experience Audit — SSI Intelligence Layer

## Baseline
**Commit:** `683adedc` — Normalize active pages to institutional design tokens

## Why the current UI feels average despite cleanup

The app has been technically cleaned (removed glass, aura, glow, emerald overuse) but the *product experience* remains generic. Each page is a well-polished data display — not a distinctive research tool.

---

### Landing Page
**File:** `src/pages/PublicLandingPage.tsx`

**Why it feels average:**
- Generic hero: "Indian equity research with a premium command surface" — sounds like a template
- Research preview card is a basic stats grid with no prediction intelligence
- Workflow section (Discover→Inspect→Track→Verify) is correct but visually uninspired
- No prediction insight, no model context, no source evidence shown above the fold
- CTA density is high (3 buttons, 2 nav bars) without clear primary action

**What's missing:**
- Prediction Intelligence preview (current model run, score distribution)
- Data freshness strip visible without scrolling
- Source audit / provider status visible
- Distinctive product identity beyond "clean cards"

**What must be rebuilt:**
- Hero section to show evidence-first AI research narrative
- Add intelligence preview (model run status, scored symbols with confidence context)
- Replace card grid with layered research surface showing real prediction context
- Remove generic "market intelligence" and "live research preview" language

---

### Dashboard / Research Home
**File:** `src/views/DashboardHub.tsx`

**Why it feels average:**
- Card-grid layout with multiple competing sections
- No command surface / research workflow rail
- Prediction intelligence not surfaced
- Data health buried in cards

**What's missing:**
- Global search / command palette as primary action
- Intelligence summary (companies covered, scored, freshness)
- "Next research actions" guidance
- Prediction explanation entry points

**What must be rebuilt:**
- Restructure as Research Command Centre
- Add search-first header
- Surface model run, freshness, coverage intelligence
- Add research workflow guidance
- Keep real data only

---

### Rankings
**File:** `src/pages/PublicRankingsPage.tsx`

**Why it feels average:**
- Functional data table with search and filter
- No explanation workflow — rows are clickable to company page but no inline intelligence
- Score pill shows rank but no confidence context
- No factor driver preview
- No "Open explanation" action

**What's missing:**
- Rank explanation panel
- Score confidence / factor context per row
- Prediction insight CTA
- Source/freshness for each row
- Modal/sheet for explanation

**What must be rebuilt:**
- Add rank explanation panel above table
- Add "Open explanation" button per row (opens IntelligenceModal)
- Show factor driver preview (top 2-3 factors)
- Add score confidence visualization
- Mobile: stacked research cards with explanation CTAs

---

### Signals / Predictions
**File:** `src/pages/PublicPredictionsPage.tsx`

**Why it feels average:**
- Simple table with symbol, type, severity, explanation, freshness
- No prediction intelligence header
- No model run/freshness summary
- Empty state is informative but not engaging
- When data exists, it's a basic table

**What's missing:**
- Prediction Intelligence header section
- Signal groups (score movement, confidence changes, coverage gaps, newly scored)
- Factor context per signal
- Explanation button per row
- Premium empty state with clear guidance

**What must be rebuilt:**
- Add Prediction Intelligence header with model run context
- Group signals by category
- Card layout with factor preview and explanation CTA
- Premium empty state linking to rankings and methodology
- No fake signal rows

---

### Company Detail
**File:** `src/pages/StockStoryPage.tsx` + `src/views/CompanySuperpage.tsx`

**Why it feels average:**
- Tabbed interface with many sections
- Score shown but no prediction explanation modal
- Factors shown as grid without evidence context
- No 3D rounded modal for explanation
- No source audit sheet
- No data gap explanation

**What's missing:**
- Company intelligence header with model run + freshness
- Prediction Insight section with explanation modal
- Factor Evidence section with factor context (not causality)
- Data Coverage section with history and gaps
- Research Timeline
- Source Audit sheet

**What must be rebuilt:**
- Intelligence header (score, model run, freshness)
- Prediction Insight card with "Open explanation" modal
- Factor Evidence grid with trend context
- Data Coverage with completeness status
- Source Audit accessible via sheet
- No trading CTA, no fake news, no fake pro

---

### Watchlist
**File:** `src/pages/WatchlistPage.tsx`

**Why it feels average:**
- Functional list of saved companies
- No prediction intelligence per saved item
- No explanation workflow

**What's missing:**
- Intelligence cards for saved companies
- Prediction insight per entry
- Empty state guidance

**What must be rebuilt:**
- "Saved research" branding
- Intelligence cards with prediction context
- Explanation CTA per saved company
- Premium empty state

---

### Portfolio
**File:** `src/pages/PortfolioPage.tsx`

**Why it feels average:**
- Manual tracking works but lacks "research portfolio" framing
- No prediction context for held symbols

**What's missing:**
- Clear "Manual tracking" label
- Prediction insight per position
- No broker sync (correctly absent)

**What must be rebuilt:**
- "Manual tracking" branding
- Add prediction insight where real data exists
- Maintain graceful 503 state for /api/investor

---

### Trust Centre
**File:** `src/pages/TrustCentrePage.tsx`

**Why it feels average:**
- Functional provider status and data coverage
- No "data intelligence" framing
- No 3D sheets for provider details / methodology
- Inline styles dilute premium feel

**What's missing:**
- Data pipeline overview
- Provider domain matrix
- Active fallbacks / blocked sources
- Fundamentals coverage explanation
- Model/data freshness summary
- 3D rounded sheets for provider details

**What must be rebuilt:**
- "Data Intelligence Centre" branding
- Provider domain matrix with lifecycle states
- Fallback/blocked source visibility
- Fundamentals coverage with gap explanation
- 3D rounded sheets for provider/fundamentals detail
- Replace inline styles with token-based classes

---

### About
**File:** `src/pages/PublicAboutPage.tsx`

**What's missing:**
- Methodology explanation
- Sources of evidence description
- Link to Trust Centre

---

### Settings
**File:** `src/pages/SettingsPage.tsx`

Functional, no major changes needed.

---

### Sign in / Sign up
**File:** `src/pages/LoginPage.tsx`, `src/pages/SignupPage.tsx`

No changes needed to auth flow.

---

## Summary of missing intelligence workflow

| Workflow | Current state | Target state |
|---|---|---|
| Search | Basic search overlay | Command palette with intelligence context |
| Inspect | Click to company page | Inline prediction explanation modal |
| Compare | No comparison | Side-by-side research panel |
| Track | Watchlist with basic data | Intelligence cards per saved item |
| Audit | Trust Centre table | 3D sheets with provider detail |

## What belongs in a modal/sheet
- Prediction explanation (why score moved, what data used, what is missing)
- Factor evidence breakdown (per-factor detail without fake causality)
- Source audit (provider domains, freshness, missing data)
- Data gap explanation (fundamentals coverage, why partial)
- Methodology reference

## What must be removed
- Generic "AI-native" copy that says nothing
- Fake stock preview data
- "Strong Buy / Sell" language (already gone)
- Inline styles in Trust Centre
- Orphaned glass/aura classes
- References to Dhan/Upstox/Finnhub active references
- Generic SaaS copy
