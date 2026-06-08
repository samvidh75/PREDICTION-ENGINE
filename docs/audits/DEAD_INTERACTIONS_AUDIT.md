# DEAD INTERACTIONS AUDIT

## Summary

Audit target: StockStory India React/Vite app in `PREDICTION-ENGINE/src`.

Status | Count
--- | ---
Working | 34
Partial | 16
Dead | 9
Fake CTA | 13
Critical | 7

## Critical Findings

### TRACK-94A-001

File: `src/app/PageRenderer.tsx`
Line: 79
Component: `PageRenderer`
Expected Behaviour: `?page=explore&kind=...&id=...` should render `DiscoveryEntityPage`.
Actual Behaviour: `pageKey === "explore"` has no render branch, so the authenticated app shell renders no page content for explore routes.
Root Cause: `DiscoveryEntityPage` is imported nowhere in `PageRenderer`, while `getPageKeyFromUrl()` maps `explore` as a valid `PageKey`.
Severity: CRITICAL
Fix Recommendation: Import and render `DiscoveryEntityPage` for `pageKey === "explore"` inside `AppLayout`.

### TRACK-94A-002

File: `src/app/router.ts`
Line: 111
Component: Auth route guard
Expected Behaviour: Explore routes are private discovery routes and should either render for authenticated users or redirect unauthenticated users to login.
Actual Behaviour: `PROTECTED_PAGES` omits `"explore"`, so logged-out explore URLs are not treated as protected; `PageRenderer` then falls through to `PublicLandingPage`.
Root Cause: `PageKey` includes `"explore"` at line 13, but `PROTECTED_PAGES` at lines 111-114 does not include it.
Severity: CRITICAL
Fix Recommendation: Add `"explore"` to `PROTECTED_PAGES` and render the route for authenticated users.

### TRACK-94A-003

File: `src/pages/CompanyUniversePage.tsx`
Line: 279
Component: Company primary action bar / View Sector
Expected Behaviour: Clicking `View Sector` opens the sector discovery environment.
Actual Behaviour: The click calls `navigateToExplore("sector", exploreId, { mode: "hard" })`, but the target route has no renderer, producing a blank authenticated app body.
Root Cause: Route creation is wired, but `PageRenderer` does not render `pageKey === "explore"`.
Severity: CRITICAL
Fix Recommendation: Same as TRACK-94A-001; then verify sector IDs resolve in `DiscoveryEntityPage`.

### TRACK-94A-004

File: `src/pages/DiscoveryEntityPage.tsx`
Line: 180
Component: Discovery entity `Return` / `Back to Market Intelligence`
Expected Behaviour: Return should navigate back to a working market intelligence or discovery page.
Actual Behaviour: `onBack` pushes `?page=stock` with no `id`; `PageRenderer` sends `pageKey === "company"/"stock"` without `id` to `DashboardHub`, not the expected discovery/market-intelligence context.
Root Cause: `onBack` hardcodes `const next = "?page=stock"` at line 181.
Severity: CRITICAL
Fix Recommendation: Route to `?page=discovery` or preserve the previous route instead of using an id-less stock route.

### TRACK-94A-005

File: `src/components/dashboard/MarketIntelligenceCommandCentre.tsx`
Line: 56
Component: Market Intelligence OS search
Expected Behaviour: Typing in the search input should update state, show results, and allow result navigation.
Actual Behaviour: The input has a placeholder and visual affordance but no `value`, `onChange`, `onKeyDown`, submit handler, result state, or navigation.
Root Cause: Static input markup only.
Severity: CRITICAL
Fix Recommendation: Reuse `CommandCentreSearch` or `SearchPage` logic, including `StockSearchEngine.search()` and `navigateToStock()`.

### TRACK-94A-006

File: `src/components/dashboard/MarketIntelligenceCommandCentre.tsx`
Line: 64
Component: Market Intelligence OS quick search chips
Expected Behaviour: Quick chips such as Reliance, Tata Motors, HAL should open search results or the corresponding company page.
Actual Behaviour: Chips render as `<button>` elements with hover states but no `onClick`.
Root Cause: `quickSearches.map()` renders buttons with only `className` and label.
Severity: CRITICAL
Fix Recommendation: Map each chip to a symbol and call `navigateToStock()` or update search state.

### TRACK-94A-007

File: `src/components/dashboard/MarketIntelligenceCommandCentre.tsx`
Line: 117
Component: Live market data chart panel
Expected Behaviour: The chart area should show a chart, loading state, or unavailable/error state.
Actual Behaviour: The chart is a decorative empty gradient `<div>` with fixed height.
Root Cause: No chart component, API call, state, or fallback text is wired for this panel.
Severity: CRITICAL
Fix Recommendation: Replace the decorative chart area with a real market chart component or explicit non-actionable empty state.

### TRACK-94A-008

File: `src/pages/SettingsPage.tsx`
Line: 173
Component: Security / Send Reset Link
Expected Behaviour: Clicking `Send Reset Link` should call Firebase/password reset service and show success or failure from the API.
Actual Behaviour: Handler only calls `AlertEngine.getAlerts()` and then browser `alert("Password reset link sent...")`.
Root Cause: `handlePasswordReset()` does not invoke an auth reset API.
Severity: CRITICAL
Fix Recommendation: Call the existing auth password reset service and handle success/error states in the UI.

### TRACK-94A-009

File: `src/services/portfolio/PortfolioEngine.ts`
Line: 15
Component: Portfolio initial state
Expected Behaviour: A new user portfolio should start empty unless real holdings have been imported.
Actual Behaviour: `getHoldings()` seeds five default holdings (`RELIANCE`, `HAL`, `BEL`, `HDFCBANK`, `INFY`) into localStorage when no local data exists.
Root Cause: `DEFAULT_HOLDINGS` is written at lines 57-59.
Severity: CRITICAL
Fix Recommendation: Do not seed production portfolios with sample holdings; show an empty state and onboarding/import actions.

### TRACK-94A-010

File: `src/pages/SettingsPage.tsx`
Line: 102
Component: Profile / Save Profile
Expected Behaviour: Saving profile should persist the changed display name to user profile/auth storage.
Actual Behaviour: Button only sets a notice: `"Profile changes saved locally for this session."`
Root Cause: No persistence call is made; `name` state is not written to backend, Firebase, or local profile store.
Severity: HIGH
Fix Recommendation: Persist via `userProfileService` or auth profile update and show API-backed success/error.

### TRACK-94A-011

File: `src/components/CommunityPostCard.jsx`
Line: 91
Component: Community post view count button
Expected Behaviour: Clicking the view metric should open/read the post, or the metric should not be a button.
Actual Behaviour: Button has hover/active affordance and no handler.
Root Cause: `<button>` lacks `onClick`.
Severity: HIGH
Fix Recommendation: Convert to non-interactive metric display or wire to post detail/open action.

### TRACK-94A-012

File: `src/components/CommunityPostCard.jsx`
Line: 99
Component: Community post discussion count button
Expected Behaviour: Clicking discussion count should open the discussion thread.
Actual Behaviour: Button has hover/active affordance and no handler.
Root Cause: `<button>` lacks `onClick`.
Severity: HIGH
Fix Recommendation: Convert to static metric or wire to thread view.

### TRACK-94A-013

File: `src/components/navigation/CommandCentreSearch.tsx`
Line: 19
Component: Command centre suggested searches
Expected Behaviour: Empty command search should show useful clickable suggestions.
Actual Behaviour: `const suggestions: string[] = []`, so the "Suggested searches" area renders no buttons and Enter with no results passes `undefined` into `handleSelect()`.
Root Cause: Suggestions are hardcoded to an empty array.
Severity: HIGH
Fix Recommendation: Populate suggestions from registry/recent search, and guard Enter when no item exists.

### TRACK-94A-014

File: `src/components/navigation/CommandCentreSearch.tsx`
Line: 83
Component: Command centre result reason
Expected Behaviour: Result cards should explain why a result matters.
Actual Behaviour: `getOneLineReason()` always returns `"Data unavailable"`.
Root Cause: Function ignores `stock.sector` after reading it.
Severity: MEDIUM
Fix Recommendation: Generate a real sector/company reason or hide the reason field.

### TRACK-94A-015

File: `src/components/dashboard/MarketIntelligenceCommandCentre.tsx`
Line: 126
Component: Healthometer panel
Expected Behaviour: Healthometer should show a computed score or clear unavailable state.
Actual Behaviour: The panel displays static labels only; no score or data source is wired.
Root Cause: No props, fetch, state, or healthometer component is used.
Severity: HIGH
Fix Recommendation: Wire to `HealthometerEcosystem`, `SimplifiedHealthometer`, or `/api/healthometer`.

### TRACK-94A-016

File: `src/components/dashboard/MarketIntelligenceCommandCentre.tsx`
Line: 146
Component: Quick Stats
Expected Behaviour: Market Cap, 52W High, 52W Low, and Trend should show values or navigate to a selected company.
Actual Behaviour: Rows display static text such as `"Open company page"` and `"Live source required"` with no click handler or selected company.
Root Cause: Static spans masquerade as outcome instructions.
Severity: HIGH
Fix Recommendation: Require a selected ticker and render real values, or remove the faux actionable copy.

### TRACK-94A-017

File: `src/components/dashboard/MarketIntelligenceCommandCentre.tsx`
Line: 175
Component: Company Health panel
Expected Behaviour: Dashboard company health should reflect selected/search context.
Actual Behaviour: Always renders `<PredictivePanel symbol="RELIANCE" />`.
Root Cause: Hardcoded symbol.
Severity: HIGH
Fix Recommendation: Bind to selected company or clearly label as an example, not live user context.

### TRACK-94A-018

File: `src/components/watchlist/WatchlistIntelligence.tsx`
Line: 152
Component: Watchlist Intelligence fallback cards
Expected Behaviour: Health score changes should reflect real watchlist intelligence data.
Actual Behaviour: Fallback entries set `healthScoreCurrent: 50` and derive previous score from mover change.
Root Cause: Missing API fields are converted into neutral score data.
Severity: HIGH
Fix Recommendation: Display unavailable state for missing health scores instead of synthesized neutral values.

### TRACK-94A-019

File: `src/components/intelligence/ConfidenceEngine.tsx`
Line: 136
Component: Confidence score inputs
Expected Behaviour: Confidence factors should be computed from real available market inputs or marked unavailable.
Actual Behaviour: Missing inputs fall back to `50` for trend consistency, volatility stability, institutional participation, liquidity breadth, sentiment alignment, sector momentum, and earnings quality.
Root Cause: Multiple nullish fallbacks use `?? 50`.
Severity: MEDIUM
Fix Recommendation: Preserve missingness and surface confidence degradation when factors are unavailable.

### TRACK-94A-020

File: `src/services/search/UniversalIntelligenceSearchEngine.ts`
Line: 44
Component: Universal search result telemetry
Expected Behaviour: Search previews should not display fake healthometer values for stocks without telemetry.
Actual Behaviour: `healthometerScore` falls back to `50`.
Root Cause: `s.telemetrySnapshot?.healthScore ?? 50`.
Severity: HIGH
Fix Recommendation: Return `null` for missing telemetry and render `N/A`.

## Full Inventory

Component | File | Interaction | Status | Severity
--- | --- | --- | --- | ---
App router | `src/app/router.ts:45` | Maps `?page=` values | PARTIAL | CRITICAL
Page renderer | `src/app/PageRenderer.tsx:74` | Renders authenticated pages | PARTIAL | CRITICAL
Explore route | `src/app/PageRenderer.tsx:79` | `?page=explore` page | DEAD | CRITICAL
Company page | `src/pages/CompanyUniversePage.tsx:418` | Chart Narratives | WORKING | MEDIUM
Company page | `src/pages/CompanyUniversePage.tsx:420` | Compare Companies | WORKING | MEDIUM
Company page | `src/pages/CompanyUniversePage.tsx:422` | Save to Watchlist | WORKING | HIGH
Company page | `src/pages/CompanyUniversePage.tsx:425` | View Sector | PARTIAL | CRITICAL
Company page | `src/pages/CompanyUniversePage.tsx:428` | Broker Access | WORKING | MEDIUM
Discovery entity | `src/pages/DiscoveryEntityPage.tsx:180` | Return/back | PARTIAL | CRITICAL
Dashboard hub | `src/components/dashboard/DashboardHub.tsx:102` | Discovery CTA | WORKING | MEDIUM
Dashboard hub | `src/components/dashboard/DashboardHub.tsx:121` | Research signal card open | WORKING | HIGH
Dashboard hub | `src/components/dashboard/DashboardHub.tsx:152` | Watchlist View all | WORKING | MEDIUM
Dashboard hub | `src/components/dashboard/DashboardHub.tsx:158` | Open discovery empty state | WORKING | LOW
Dashboard hub | `src/components/dashboard/DashboardHub.tsx:165` | Watchlist ticker open | WORKING | HIGH
Dashboard hub | `src/components/dashboard/DashboardHub.tsx:196` | Recent research ticker | WORKING | MEDIUM
Market Intelligence OS | `src/components/dashboard/MarketIntelligenceCommandCentre.tsx:56` | Search input | DEAD | CRITICAL
Market Intelligence OS | `src/components/dashboard/MarketIntelligenceCommandCentre.tsx:64` | Quick search chips | DEAD | CRITICAL
Market Intelligence OS | `src/components/dashboard/MarketIntelligenceCommandCentre.tsx:78` | Section cards | FAKE CTA | MEDIUM
Market Intelligence OS | `src/components/dashboard/MarketIntelligenceCommandCentre.tsx:117` | Chart area | FAKE CTA | CRITICAL
Market Intelligence OS | `src/components/dashboard/MarketIntelligenceCommandCentre.tsx:126` | Healthometer | FAKE CTA | HIGH
Market Intelligence OS | `src/components/dashboard/MarketIntelligenceCommandCentre.tsx:146` | Quick stats | FAKE CTA | HIGH
Market Intelligence OS | `src/components/dashboard/MarketIntelligenceCommandCentre.tsx:175` | Company Health hardcoded RELIANCE | PARTIAL | HIGH
Search page | `src/pages/SearchPage.tsx:126` | Search input | WORKING | HIGH
Search page | `src/pages/SearchPage.tsx:141` | Recent search chip | WORKING | MEDIUM
Search page | `src/pages/SearchPage.tsx:170` | Result card open | WORKING | HIGH
Command centre | `src/components/navigation/CommandCentre.tsx:73` | Search input | WORKING | HIGH
Command centre | `src/components/navigation/CommandCentre.tsx:92` | Search result open | WORKING | HIGH
Command centre | `src/components/navigation/CommandCentre.tsx:134` | Recent research chip | WORKING | MEDIUM
Command centre | `src/components/navigation/CommandCentre.tsx:159` | Quick actions | WORKING | MEDIUM
Command centre search | `src/components/navigation/CommandCentreSearch.tsx:19` | Suggested searches | DEAD | HIGH
Command centre search | `src/components/navigation/CommandCentreSearch.tsx:83` | Result reason | PARTIAL | MEDIUM
Portfolio | `src/pages/PortfolioPage.tsx:90` | Add modal open | WORKING | HIGH
Portfolio | `src/pages/PortfolioPage.tsx:91` | Import modal open | WORKING | HIGH
Portfolio | `src/pages/PortfolioPage.tsx:141` | Holding ticker open | WORKING | HIGH
Portfolio | `src/pages/PortfolioPage.tsx:148` | Edit holding | WORKING | HIGH
Portfolio | `src/pages/PortfolioPage.tsx:149` | Delete holding | WORKING | HIGH
Portfolio | `src/pages/PortfolioPage.tsx:167` | Add Asset submit | WORKING | HIGH
Portfolio | `src/pages/PortfolioPage.tsx:195` | CSV import submit | WORKING | HIGH
Portfolio initial state | `src/services/portfolio/PortfolioEngine.ts:57` | New-user portfolio | PARTIAL | CRITICAL
Watchlist | `src/pages/WatchlistPage.tsx:48` | Select custom list | WORKING | MEDIUM
Watchlist | `src/pages/WatchlistPage.tsx:62` | Select smart list | WORKING | MEDIUM
Watchlist | `src/pages/WatchlistPage.tsx:96` | Ticker open | WORKING | HIGH
Watchlist | `src/pages/WatchlistPage.tsx:103` | Note input | PARTIAL | MEDIUM
Watchlist | `src/pages/WatchlistPage.tsx:109` | Remove ticker | PARTIAL | MEDIUM
Watchlist intelligence | `src/components/watchlist/WatchlistIntelligence.tsx:152` | Fallback health scores | FAKE CTA | HIGH
Alerts | `src/pages/AlertCentrePage.tsx:71` | Mark all read | WORKING | MEDIUM
Alerts | `src/pages/AlertCentrePage.tsx:83` | All filter | WORKING | LOW
Alerts | `src/pages/AlertCentrePage.tsx:92` | Category filter | WORKING | LOW
Alerts | `src/pages/AlertCentrePage.tsx:153` | Open company | WORKING | HIGH
Alerts | `src/pages/AlertCentrePage.tsx:159` | Dismiss | WORKING | MEDIUM
Settings | `src/pages/SettingsPage.tsx:57` | Settings tabs | WORKING | LOW
Settings | `src/pages/SettingsPage.tsx:102` | Save Profile | PARTIAL | HIGH
Settings | `src/pages/SettingsPage.tsx:129` | Notification toggles | PARTIAL | MEDIUM
Settings | `src/pages/SettingsPage.tsx:173` | Send Reset Link | DEAD | CRITICAL
Community post | `src/components/CommunityPostCard.jsx:91` | View count button | DEAD | HIGH
Community post | `src/components/CommunityPostCard.jsx:99` | Discussion count button | DEAD | HIGH
Public landing | `src/pages/PublicLandingPage.tsx:56` | Signup CTA | WORKING | HIGH
Public landing | `src/pages/PublicLandingPage.tsx:59` | About CTA | WORKING | MEDIUM
Public landing | `src/pages/PublicLandingPage.tsx:102` | Company sample open | WORKING | MEDIUM
Navigation rail | `src/components/navigation/IntelligenceNavigationRail.tsx:193` | Explore nav | PARTIAL | HIGH
Universal search | `src/services/search/UniversalIntelligenceSearchEngine.ts:44` | Healthometer preview | FAKE CTA | HIGH
Confidence engine | `src/components/intelligence/ConfidenceEngine.tsx:136` | Confidence factor scores | FAKE CTA | MEDIUM

## Placeholder Data Investigation

Pattern | File | Line | Risk
--- | --- | --- | ---
`|| 50` | `src/services/portfolio/PortfolioEngine.ts` | 88 | Portfolio-created analytics reports average quality as `75.0` when holdings lack stock quality data.
`?? 50` | `src/components/watchlist/WatchlistIntelligence.tsx` | 142 | Missing watchlist change values are treated as numeric zero/neutral during significance checks.
Hardcoded `50` | `src/components/watchlist/WatchlistIntelligence.tsx` | 152 | Missing health score is displayed as neutral current health.
Hardcoded `50` | `src/components/watchlist/WatchlistIntelligence.tsx` | 153 | Previous health is synthesized from mover change.
`?? 50` | `src/components/intelligence/ConfidenceEngine.tsx` | 136 | Trend consistency falls back to neutral score.
`?? 50` | `src/components/intelligence/ConfidenceEngine.tsx` | 137 | Volatility stability falls back to neutral score.
`?? 50` | `src/components/intelligence/ConfidenceEngine.tsx` | 138 | Institutional participation falls back to neutral score.
`?? 50` | `src/components/intelligence/ConfidenceEngine.tsx` | 139 | Liquidity breadth falls back to neutral score.
`?? 50` | `src/components/intelligence/ConfidenceEngine.tsx` | 140 | Sentiment alignment falls back to neutral score.
`?? 50` | `src/components/intelligence/ConfidenceEngine.tsx` | 141 | Sector momentum falls back to neutral score.
`?? 50` | `src/components/intelligence/ConfidenceEngine.tsx` | 142 | Earnings quality falls back to neutral score.
`?? 50` | `src/services/search/UniversalIntelligenceSearchEngine.ts` | 44 | Search telemetry displays neutral health for missing data.
Mock telemetry | `src/services/telemetry/mockTelemetrySnapshot.ts` | 3 | Static telemetry snapshot can be mistaken for live company telemetry if imported into production UI.
Mock stream | `src/services/telemetry/MockTelemetryStream.ts` | 45 | Missing total is computed from metric defaults, and missing metric values use `50`.
Disabled legacy fetcher | `src/core/data/MarketDataFetcher.ts` | 20 | Legacy market data calls always return disabled response; any UI using it cannot produce live data.

Particularly investigated:

- Healthometer: static/fake in `MarketIntelligenceCommandCentre.tsx:126`; simplified healthometer also defaults missing synthesis score to `0.7` in `src/components/healthometer/SimplifiedHealthometer.tsx:49`.
- Factor Scores: `ConfidenceEngine.tsx:136-142` uses neutral fallbacks; `WatchlistIntelligence.tsx:152-153` uses `50`.
- Business Quality: portfolio analytics uses fallback `75.0` at `PortfolioEngine.ts:88`.
- Growth Outlook, Market Momentum, Value & Margins, Financial Stability: no direct fake CTA was found in the audited source pages, but multiple scoring engines preserve neutral defaults in lower-level services; these must not be surfaced as production values without missing-data labels.

## Routing Investigation

Pattern | File | Line | Finding
--- | --- | --- | ---
`searchParams` | `src/app/router.ts` | 42 | Query-param router is the canonical app router.
`page=stock` -> company | `src/app/router.ts` | 51 | `stock` is mapped to `company`, making `pageKey === "stock"` render branches unreachable.
Missing renderer | `src/app/PageRenderer.tsx` | 79 | `explore` is never rendered.
`window.location.href` | `src/architecture/navigation/routeCoordinator.ts` | 108 | Hard navigation is used for explore sector links.
`?page=stock` without id | `src/pages/DiscoveryEntityPage.tsx` | 181 | Return action routes to Dashboard fallback, not market intelligence.
Manual route push | `src/pages/PortfolioPage.tsx` | 61 | Stock route sets `page=stock&id=symbol`; works because router maps stock to company.
Manual route push | `src/pages/AlertCentrePage.tsx` | 49 | Alert company route sets `page=stock&id=symbol`; works through same alias.

Detected route mismatches:

- `explore` is a valid `PageKey` but unreachable as rendered UI.
- `stock` is included in `PageKey` and `PageRenderer`, but `getPageKeyFromUrl()` maps raw `"stock"` to `"company"`, so `pageKey === "stock"` branches are effectively orphaned.
- `DiscoveryEntityPage` exists but is unreachable from the app router.

## Search Investigation

Surface | Evidence | Status
--- | --- | ---
Global search page | `src/pages/SearchPage.tsx:71-104` updates input state, URL, results, and navigates results | WORKING
Recent search chips | `src/pages/SearchPage.tsx:141-145` calls `handleRecentSearch()` | WORKING
Command centre modal | `src/components/navigation/CommandCentre.tsx:38-43`, `92-99` searches and navigates | WORKING
Command centre search overlay | `src/components/navigation/CommandCentreSearch.tsx:52-75` searches and navigates results | PARTIAL
Command centre suggestions | `src/components/navigation/CommandCentreSearch.tsx:19` empty suggestions | DEAD
Market Intelligence OS search | `src/components/dashboard/MarketIntelligenceCommandCentre.tsx:56-59` no handler/state/results | DEAD
Market Intelligence OS quick chips | `src/components/dashboard/MarketIntelligenceCommandCentre.tsx:64-69` no handler | DEAD

## Top 20 Highest-Impact Interaction Failures

Rank | Finding | User Damage
--- | --- | ---
1 | TRACK-94A-001 Explore route never renders | Discovery exploration links can lead to blank app content.
2 | TRACK-94A-003 View Sector routes into broken explore page | Company-page sector exploration, a core research path, fails.
3 | TRACK-94A-005 Market Intelligence OS search input is dead | Users cannot search from a prominent dashboard search surface.
4 | TRACK-94A-006 Quick search chips are dead | Prominent shortcuts invite clicks but do nothing.
5 | TRACK-94A-009 Portfolio seeds sample holdings | Users see fake holdings as if they own them.
6 | TRACK-94A-008 Password reset does not send reset link | Security workflow falsely claims success.
7 | TRACK-94A-007 Chart panel is decorative | Live market chart expectation is unmet.
8 | TRACK-94A-004 Discovery Return routes to wrong page | Users lose context after exploring.
9 | TRACK-94A-017 Company health hardcoded to RELIANCE | Dashboard context can show the wrong company analysis.
10 | TRACK-94A-018 Watchlist health falls back to 50 | Watchlist intelligence may display fake neutral health.
11 | TRACK-94A-020 Search healthometer falls back to 50 | Search cards can imply missing telemetry is neutral health.
12 | TRACK-94A-015 Healthometer panel has no score | Core healthometer promise is visually present but not functional.
13 | TRACK-94A-016 Quick Stats show instructions instead of data | Market cap/52W/trend section fails its data outcome.
14 | TRACK-94A-010 Save Profile is session-only | Profile edits appear saved but are not persisted.
15 | TRACK-94A-013 Command centre suggestions are empty | Empty search state loses expected autocomplete/suggestion workflow.
16 | TRACK-94A-011 Community view button has no handler | Engagement affordance is decorative.
17 | TRACK-94A-012 Community discussion button has no handler | Discussion affordance is decorative.
18 | TRACK-94A-019 Confidence factors fall back to neutral | Missing data can be displayed as credible neutral confidence.
19 | TRACK-94A-014 Command result reason always says unavailable | Result card explanatory affordance is placeholder-only.
20 | Settings notification toggles are local-only | Alert channel preferences lack backend/API persistence.

