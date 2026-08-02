# StockStory Intelligence OS — Product Architecture

## 1. Product Model

### Research Canvas
The primary workspace. Every route renders on a spatial canvas with consistent chrome:
- Left rail: navigation + context
- Top bar: identity + command
- Content: calm, controlled-width canvas
- Optional right rail: context/evidence

### Command Layer
Global command palette (Cmd+K) is the primary interaction surface:
- Search companies (real data from API/search)
- Navigate routes (rankings, signals, trust centre, etc.)
- Inspect actions (explain score, view factors, audit source)
- All actions use real data or show unavailable state

### Intelligence Layer
Prediction output, factor context, confidence, data completeness, score movement.
Shown in PredictionInsightCard, explained in SpatialModal.

### Evidence Layer
Data source, provider domain, freshness, fundamentals coverage, missing data.
Shown inline, detailed in SpatialSheet.

### Spatial Modal Layer
Three-tier popup system:
1. **SpatialModal** — centered, 32px radius, deep shadow, full prediction explanation
2. **SpatialSheet** — bottom sheet on mobile, side sheet on desktop, for evidence/factors
3. **SpatialPopover** — lightweight tooltip/inspector

### Trust Layer
Provider truth, no-advice policy, blocked/partial/manual/archive states.
Always visible in context, detailed in the Data Intelligence Centre.

---

## 2. Route Architecture

### Landing (`/?page=landing`)
- **Purpose:** Premium product launch page
- **Above fold:** Headline, subheadline, command palette preview, coverage preview
- **Content:** Workflow preview, prediction intelligence, evidence transparency, limitations, not-advice, final CTA
- **Commands:** Explore rankings, View Trust Centre, Sign in
- **Modals:** None on landing (defer to product)
- **Mobile:** Single column, command button prominent
- **Desktop:** Two-column hero, layered product visual

### Dashboard / Research Home (`/?page=dashboard`)
- **Purpose:** Primary research canvas
- **Above fold:** Research Home title, command bar, data freshness orb, coverage summary
- **Content:** IntelligencePanel (predictions), Next research actions, Saved research preview, Provider status compact
- **Commands:** Search, Open rankings, Open signals, Open watchlist, Open trust centre
- **Modals:** None on dashboard (defer to specific actions)
- **Mobile:** Single column, research workflow rail as horizontal scroll
- **Desktop:** Left rail + main content

### Rankings (`/?page=rankings`)
- **Purpose:** Premium research table
- **Above fold:** Intelligence summary (coverage, scored, freshness)
- **Content:** Dense rankings table with explain action per row
- **Commands:** Search/sector filter, Explain score, Open company
- **Modals:** SpatialModal for rank explanation
- **Mobile:** Stacked ranking cards with explain action

### Signals / Predictions (`/?page=predictions`)
- **Purpose:** AI-native prediction intelligence
- **Above fold:** Prediction Intelligence header, model run/freshness
- **Content:** Signal groups (score movement, confidence, newly scored, gaps)
- **Commands:** Open company, Explain signal, View methodology
- **Modals:** SpatialModal for signal explanation
- **Mobile:** Stacked signal cards
- **Empty:** Premium state with next actions

### Company Detail (`/?page=stock`)
- **Purpose:** Flagship research page
- **Above fold:** Company identity, score, latest quote, freshness, explain primary action
- **Content:** Prediction Intelligence, Factor Evidence, Historical Coverage, Fundamentals, Source Audit, Methodology
- **Commands:** Explain, View factors, Audit source, Add to watchlist, Compare
- **Modals:** SpatialModal for explanation, SpatialSheet for factors/source
- **Desktop:** Two-column (main + evidence rail)

### Watchlist (`/?page=watchlist`)
- **Purpose:** Saved research
- **Above fold:** List selector, search to add
- **Content:** Intelligence cards per saved symbol
- **Commands:** Explain, Open company, Remove, Add note
- **Modals:** SpatialModal for explanation
- **Empty:** Premium state with search action

### Portfolio (`/?page=portfolio`)
- **Purpose:** Manual tracking
- **Above fold:** Manual tracking label, add holding
- **Content:** Holdings list with prediction context
- **Commands:** Add, Edit, Import CSV, Remove
- **Modals:** SpatialSheet for add/edit
- **Empty:** Premium state with add action

### Trust Centre (`/?page=trust`)
- **Purpose:** Data Intelligence Centre
- **Sections:** Data coverage overview, active sources, fallbacks, manual paths, blocked sources, archived evaluations, evidence completeness, data policy
- **Commands:** View provider detail, View methodology
- **Modals:** SpatialSheet for provider details, Yahoo blocked explanation, NSELib archived, fundamentals gap

### About (`/?page=about`)
- Minimal changes from current. Platform overview, methodology, features.

### Settings (`/?page=settings`)
- Functional. Profile editing, notification preferences.

### Auth (`/?page=login`, `/?page=signup`)
- No changes from current.

---

## 3. Component Architecture

### Shell Components
- **IntelligenceOSShell** — wraps all authenticated routes, renders SpatialTopBar + DesktopCommandRail + MobileCommandDock + content
- **SpatialTopBar** — identity, GlobalCommandButton, DataFreshnessOrb, AccountPill
- **DesktopCommandRail** — vertical left nav with route links
- **MobileCommandDock** — bottom nav with route links

### Modal Components
- **SpatialModal** — 32px radius, deep shadow, backdrop blur, focus trap, escape, click-outside
- **SpatialSheet** — mobile bottom sheet / desktop side sheet
- **SpatialPopover** — lightweight floating inspector

### Command Components
- **CommandPalette** — Cmd+K global command palette with search and actions
- **GlobalCommandButton** — top bar button that opens CommandPalette

### Intelligence Components (existing, reused)
- PredictionInsightCard
- IntelligenceModal (kept, but we'll use SpatialModal wrapper)
- FactorDriverCard
- DataFreshnessLine
- EvidenceStack
- SourceTracePill
- ModelRunBadge
- UncertaintyNotice
- DataGapNotice
- FactorEvidenceSheet
- SourceAuditSheet
- MethodologyLink
- RoundedDepthPanel
- PremiumCommandButton
- CompareCompaniesPanel
- ResearchWorkflowRail

---

## 4. Visual Identity

- Dark institutional: `#080C10` background, `#0D1117` surface, `#E6EDF3` text
- Single accent: `#2962FF` institutional blue
- Semantic colors: `#22AB94` ok, `#EF9A09` warn, `#F23645` danger
- Rounded but restrained: 32px modal radius, 22px card radius, 16px small radius
- Deep shadows: `0 12px 48px rgba(0,0,0,0.5)` modals, `0 4px 12px rgba(0,0,0,0.4)` elevated
- Micro-interactions: 200ms ease transitions, soft hover lifts, smooth modal open/close
- No glass, no neon, no glow, no green/yellow dominance
- Calm density: intentional whitespace, readable type at all sizes
