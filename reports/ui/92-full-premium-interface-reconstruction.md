# Part V: Full Premium Interface Reconstruction and Workspace Rebuild

## Baseline Context
- **Baseline Commit**: `d5b2d0b10e527d9fc89f9c6d376c6978ffab98ef` ("Build authenticated research workspace and data orchestration (Part U)")
- **Verification Results**:
  - Unit & Integration Suite: PASS
  - E2E Playwright Regression: PASS (45/45)
  - Production Smoke Tests: PASS (19/19)
  - Production Data Quality: PASS (Quality=PASS)
  - Repository Hygiene: PASS (0 secrets)

---

## Current Workspace Audit

### Visual System & Interface Weaknesses
1. **Disconnected Surfaces**: While components have dark theme tags, they lack cohesive borders, common gutters, and consistent content boundaries. The app shell is split between a standard top navbar and left rail controls.
2. **Dashboard Design**: The dashboard feels like a generic grid of statistical boxes rather than a premium, guided equity research cockpit answering *"What should I explore or review right now?"*.
3. **Company detail Page Hierarchy**: A verbose tabs-only grid that hides critical signal trends below the fold, lacks responsive side-rail placement, and renders empty panels awkwardly when optional data is absent.
4. **Browser-Native Elements**: Standard browser select drop-downs and input inputs are visible in scanner presets, compare screens, and portfolio forms, detracting from the premium product feel.

---

## Route-by-Route Interface Audit

### 1. Landing Page (`?page=landing`)
- **Primary Goal**: Convert guests, explain the research-led workspace model.
- **First Impression**: Plain hero and simple differentiator panels.
- **CTA Hierarchy**: "Start research" (Primary) -> "View scanner" / "Methodology" (Secondary).
- **Empty State**: N/A.
- **Mobile Behavior**: Cards stack vertically with standard padding.
- **Visual/Copy Defects**: Very long text paragraphs; differentiators look like list entries.
- **Required Action**: Upgrade hero card contrast, refine differentiators into a visually premium comparative grid.

### 2. About Page (`?page=about`)
- **Primary Goal**: Present the broker-neutral model and sign-in values.
- **First Impression**: Simple grid lists.
- **CTA Hierarchy**: "Start researching" -> "Open scanner".
- **Empty State**: N/A.
- **Mobile Behavior**: Single column list.
- **Visual/Copy Defects**: Text lacks hierarchical styling.
- **Required Action**: Refine workflow steps into an elegant step-by-step horizontal timeline (vertical on mobile) and frame broker-neutral declarations in high-contrast panels.

### 3. Research Standards (`?page=methodology`)
- **Primary Goal**: Educate on SEBI-compliant multi-factor framework and conviction logic.
- **First Impression**: Verbose legal/technical text blocks.
- **CTA Hierarchy**: "Create free account" (if unauthenticated).
- **Empty State**: N/A.
- **Mobile Behavior**: Stacks panels linearly.
- **Visual/Copy Defects**: Flat visual hierarchy; factors lack icons or color cues.
- **Required Action**: Structure the standards using an elegant multi-column card matrix.

### 4. Terms & Disclosures (`?page=terms`)
- **Primary Goal**: Technical legal disclaimers.
- **First Impression**: Monotonous panels.
- **CTA Hierarchy**: None.
- **Empty State**: N/A.
- **Mobile Behavior**: Simple scrolling text.
- **Visual/Copy Defects**: Plain.
- **Required Action**: Layout sections with clean borders and readable dividers.

### 5. Login Page (`?page=login`)
- **Primary Goal**: Authenticate existing users.
- **First Impression**: Standard login box.
- **CTA Hierarchy**: "Sign in" (Button) -> "Create account" (Link).
- **Empty State**: N/A.
- **Mobile Behavior**: Stretches full-width.
- **Visual/Copy Defects**: Minimal visual context.
- **Required Action**: Enhance text, overlay return context contextually, and style borders elegantly.

### 6. Signup Page (`?page=signup`)
- **Primary Goal**: Onboard new users.
- **First Impression**: Form on the right, feature grid on the left.
- **CTA Hierarchy**: "Create account" (Button) -> "Sign in" (Link).
- **Empty State**: N/A.
- **Mobile Behavior**: Form stacks below details.
- **Visual/Copy Defects**: Flat items.
- **Required Action**: Use premium list cards, highlight what unlocks after registration, and link terms contextually.

### 7. Dashboard Cockpit (`?page=dashboard`)
- **Primary Goal**: Core authenticated entry point to track changes, review monitored stocks, and discover new ideas.
- **First Impression**: Scattered card stats.
- **CTA Hierarchy**: "Open scanner" -> navigation.
- **Empty State**: Plain guidelines banner.
- **Mobile Behavior**: Card grid collapses.
- **Visual/Copy Defects**: No active opportunity lists or Change tracking details.
- **Required Action**: Complete dashboard cockpit rebuild with active research briefing header, Opportunity Queue, tracked counts, and Quick Actions.

### 8. Scanner (`?page=scanner`)
- **Primary Goal**: Filter and discover scored Indian equities.
- **First Impression**: Raw dropdowns and cards.
- **CTA Hierarchy**: Preset strategy tabs.
- **Empty State**: Plain card.
- **Mobile Behavior**: Flat list.
- **Visual/Copy Defects**: Presets are cramped.
- **Required Action**: Modern filter toolbar, strategy groups, popover explaining how filters evaluate equities, and card layouts with conviction meters.

### 9. Rankings (`?page=rankings`)
- **Primary Goal**: Explore the complete universe of quantitative scores.
- **First Impression**: Basic table layout.
- **CTA Hierarchy**: Search inputs -> Columns.
- **Empty State**: Full gating locked screen for guests.
- **Mobile Behavior**: Overflow scrolling table.
- **Visual/Copy Defects**: Columns feel like a generic spreadsheet.
- **Required Action**: Redesign as premium dark card/table hybrids, adding detailed factor score metrics, thesis driver pills, and clear readability tools.

### 10. Company Detail Page (`?page=company`)
- **Primary Goal**: Deep dive on a company's fundamental profile, thesis, and risk factors.
- **First Impression**: Simple tabs layout.
- **CTA Hierarchy**: Track -> Compare -> Invest Review.
- **Empty State**: N/A.
- **Mobile Behavior**: Tabs scroll horizontally; rails stack below content.
- **Visual/Copy Defects**: Factor rating bars are flat.
- **Required Action**: Premium quote card strip, multi-column tab panels, interactive Notes panel, peer mapping, and detailed risk ratings.

### 11. Compare Page (`?page=compare`)
- **Primary Goal**: Evaluate two companies side-by-side.
- **First Impression**: Blank pre-selection screen.
- **CTA Hierarchy**: Select stock dropdowns.
- **Empty State**: Shows basic search guides.
- **Mobile Behavior**: Stacked columns.
- **Visual/Copy Defects**: Plain comparison matrix.
- **Required Action**: Unified comparison selector, suggested comparison cards from actual data, and side-by-side factor cards with structured decision tags (e.g. "Better quality profile").

### 12. Watchlist Page (`?page=watchlist`)
- **Primary Goal**: Monitor saved stocks for score changes.
- **First Impression**: Simple table of saved symbols.
- **CTA Hierarchy**: Remove button -> symbol.
- **Empty State**: Card explaining Watchlist.
- **Mobile Behavior**: Stacks companies.
- **Visual/Copy Defects**: Lacks active alert notifications.
- **Required Action**: Clear status tags showing signal shifts, last checked indicators, and compact CTA routes.

### 13. Portfolio Thesis Monitor (`?page=portfolio`)
- **Primary Goal**: Track thesis alignment on actual user stock holdings.
- **First Impression**: Manual tables and a CSV import button.
- **CTA Hierarchy**: Add Position -> Import CSV.
- **Empty State**: General description text.
- **Mobile Behavior**: Collapse metrics.
- **Visual/Copy Defects**: Form elements look native/unstyled.
- **Required Action**: Rebuild with clean dialogs, custom selector inputs, data quality warnings, and broker-handoff guidelines.

### 14. Alerts / What Changed (`?page=alerts`)
- **Primary Goal**: Review historical changes in research factors for monitored stocks.
- **First Impression**: Simple logs.
- **CTA Hierarchy**: Dismiss alert.
- **Empty State**: "No active alerts."
- **Mobile Behavior**: Stacked log events.
- **Visual/Copy Defects**: Plain text rows.
- **Required Action**: Group notifications by severity, color code signals, and link back to the research page.

### 15. Settings Page (`?page=settings`)
- **Primary Goal**: Manage account details and reset local progress.
- **First Impression**: Tabs with settings fields.
- **CTA Hierarchy**: Tab select buttons.
- **Empty State**: N/A.
- **Mobile Behavior**: Tabs stack.
- **Visual/Copy Defects**: Workspace tab could have richer info on local database sizes.
- **Required Action**: Add workspace metrics (position count, snapshot size) and clear workspace actions.

### 16. Invest Handoff (`?page=invest`)
- **Primary Goal**: Final review of research factors before launching broker.
- **First Impression**: Simple checklist.
- **CTA Hierarchy**: "Trade through broker".
- **Empty State**: N/A.
- **Mobile Behavior**: Vertical stack.
- **Visual/Copy Defects**: Checklist is flat.
- **Required Action**: Rebuild checklist with thesis health meters, broker-neutral disclaimers, and clear instructions for placing final orders.

---

## Planned Reconstruction

### Phase A: App Shell & Workspace Navigation
- Unify TopNav and LeftRail into a cohesive, dark graphite workspace container (`bg-[#060A10]`).
- Design an elegant Profile/Account button, custom drop-downs, and commands.
- Align active states using restrained borders and background glows.

### Phase B: Product Page Framework
- Implement a structured, responsive component framework for header titles, primary action buttons, context status chips, and main content grids.

### Phase C: Dashboard Cockpit
- Redesign the authenticated home screen as a workspace intelligence dashboard.
- Create an Opportunity Queue with compact company cards and key thesis points.

### Phase D: Company flagships
- Build custom visual factor bars (gradient fills, hover tooltips).
- Polish peer lists, risk cards, and note-taking interfaces.

### Phase E: Interactive components (Scanner, Compare, Watchlist, Portfolio)
- Eliminate all native selects/controls and replace with custom elements.
- Style the strategy preset rails with horizontal sliders.
- Design comparing side-by-side matrices and manual import overlays.

---

## Acceptance & Compliance Criteria

### 1. Visual Excellence
- Harmonious dark graphite palette (`#060A10` background, `#0C1119` panels, `#E8EDF2` headings).
- Elegant typography, smooth borders, and responsive stacking (no horizontal viewport overflow).
- Subtle hover transitions, focus state glows, and zero browser-native styling.

### 2. No Fake Data
- No fake reviews, testimonials, awards, or fake broker connections/sync states.
- Missing optional data is omitted quietly.

### 3. No Buy/Sell/Hold Labels
- Absolutely zero Buy, Sell, Hold, Strong Buy, Target Price, or upside percentages.
- Rely only on approved labels: "High conviction research case", "Worth researching", "Track", "Needs review", "Risk rising", "Avoid for now".

### 4. No Provider/Backend Leakage
- No API names, database table terms, backfill/migration logs, or HTTP errors displayed to users.

### 5. No Secrets
- Zero API keys, cookies, client IDs, or env variables compiled or committed.
