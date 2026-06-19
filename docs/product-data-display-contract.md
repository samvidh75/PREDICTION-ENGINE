# Product Data Display Contract

## Research Signal Computation Rules

- `score` = average of available factor scores (quality, growth, stability, momentum, valuation)
- `confidence` = (present factor count / 6) * 100
- `label` = deterministic from score + confidence + riskScore thresholds
- `tone` = deterministic from label
- `topDrivers` = top 2 highest factor scores → "{Factor} is a key contributor"
- `topRisks` = factors < 40 + riskScore < 40 → "{Factor} concerns" / "Risk profile elevated"
- missing inputs reduce confidence, never create fake certainty
- insufficient data (< 3 factors) returns "Research signals pending"

## Thesis Health Display Rules

- ThesisHealthMeter shows score ring, label chip, confidence, drivers, risks
- FactorScorePanel shows per-factor bars (omit missing)
- Company page: meter above fold, factor panel in right rail of thesis tab
- Scanner cards: signal chip + score badge + risk marker
- Rankings: signal chip per row
- Dashboard: signal dot on tracked companies
- Compare: suggested companies from real API data
- Invest handoff: signal meter in thesis review panel
- Alerts: tone chips for change type

## Factor Score Display Rules

- Show each available factor as a bar with label and numeric value
- Bar colors: >= 70 green, >= 50 blue, >= 35 amber, < 35 red
- Omit missing optional scores (don't show dashes)
- If all missing, show section-level pending state

## Driver/Risk Display Rules

- Drivers: green chips with "{Factor} is a key contributor"
- Risks: red chips with "{Factor} concerns" or "Risk profile elevated"
- Only show when real factor data exists
- Omit if no data

## Compare Signal Display Rules

- Suggested companies come from real getScanner API call
- Each suggestion shows symbol, rank, name, score
- Category buttons (Quality vs Value etc.) use first 2 ranked companies
- Selected compare state shows signal labels and factor comparison

## Dashboard Signal Display Rules

- Research briefing header with today's overview
- What Changed panel with severity-colored tone chips
- Tracked companies with signal dots (green = researching, grey = tracked)
- Scanner presets panel
- Portfolio thesis monitor summary

## Watchlist/Portfolio/Alerts Signal Display Rules

- Watchlist items: signal label chip
- Portfolio thesis monitor: status indicator
- Alerts: tone-based severity chips on change type

## Invest Handoff Signal Context Rules

- ThesisHealthMeter in StageOne review
- Score/confidence from invest context API
- Key risks from invest context
- Before-you-invest checklist
- "Final order will be placed with your broker" disclaimer
- No Buy/Sell/Hold

## Fallback Hierarchy

1. Show real data from API response
2. Omit optional missing fields quietly
3. Section-level pending state only when core data insufficient
4. Never show "prediction registry", "provider unavailable", backend error codes

## No Buy/Sell/Hold Rule

All labels must be from the allowed set: High conviction research case, Worth researching, Track, Needs review, Risk rising, Avoid for now, Research signals pending.

## No Provider/Backend Leakage Rule

No provider names, API names, backend error codes, HTTP statuses, raw exceptions, JSON, or diagnostic language.

## Core Principle

Provider/backend data must be normalized before reaching product UI. Product APIs expose only product concepts. Frontend adapters must not drop real data. Optional missing fields are omitted quietly. Pending states appear only at section level when core data is genuinely insufficient.

## Data Normalization Rules

- All API responses must pass through adapter functions before reaching product components
- Adapters must clean sector names, thesis text, scores, and risk markers
- Adapters must not drop real data — if a field has a real value, pass it through
- Adapters must replace bad fallback strings (e.g. "Sector pending company with moderate conviction context") with clean product text

## ResearchSignalView Rules

- `score`: 0–100, computed from available factor scores (average of quality, growth, stability, momentum, valuation)
- `confidence`: 0–100, computed from data sufficiency (number of present factors / 6 * 100)
- `label`: Deterministically derived from score + confidence + riskScore
  - score >= 75 && confidence >= 60 -> "High conviction research case"
  - score >= 55 && confidence >= 40 -> "Worth researching"
  - score >= 40 -> "Track"
  - score >= 25 -> "Needs review"
  - riskScore < 40 -> "Risk rising"
  - riskScore < 25 -> "Avoid for now"
  - score === null || confidence === 0 -> "Research signals pending"
- `tone`: constructive / neutral / caution / severe
- `dataSufficiency`: "Sufficient" (all 6 factors), "Partial" (1-5 factors), "Insufficient" (0 factors)
- Missing values reduce confidence, never create fake certainty
- If score cannot be computed, return "Research signals pending"
- No provider/source/backend wording

## ThesisHealthMeter Display Rules

- Shows score ring with color based on tone
- Shows label chip with proper color coding
- Shows confidence percentage
- Shows top drivers (green chips) and top risks (red chips)
- Pending state when signal is null
- Accessible: aria-label, sr-only score text
- No Buy/Hold/Sell labels
- No provider/backend vocabulary

## Factor Score Display Rules

- Show each available factor as a bar with label and numeric value
- Bar colors: >= 70 green, >= 50 blue, >= 35 amber, < 35 red
- Omit missing optional scores (don't show dashes)
- If all missing, show one section-level pending state
- No raw null/undefined display
- No dashes-only broken panel

## Public Rankings Gating

- Guest users see at most 3 ranking rows
- Guest users see "Teaser preview" indicator
- Score column shows lock icon + "Gated" badge for guests
- Signal label column shows "Sign in to view"
- Full lock panel appears below the preview with CTAs:
  - "Create free account" -> signup page
  - "Read research standards" -> methodology page
- Guest users see "Institutional-grade research models applied to Indian equities." subtitle
- Authenticated users see "Indian equities ranked by verified quantitative research assessment."
- Authenticated users see full table with search, sector filter, and all data columns
- Authenticated users see score pill, conviction label, and action buttons

## Sector Filter Rules

- Derive sector options from actual returned data only
- Ignore null, undefined, empty, unknown, "not available", "sector pending", "unavailable", "pending", "n/a"
- Hide sector filter if fewer than 2 useful sectors exist
- If sector is missing from a result, omit the sector chip/column value quietly
- Never render "Sector pending"
- Never render "Not available" as a sector chip or column value

## Scanner Card Text Rules

- Thesis field cleaned: "Sector pending company with..." text replaced with real sector or neutral research text
- If sector exists: thesis may use sector naturally
- If sector missing: "Moderate conviction research case."
- Signal label shown as color-coded chip with indicator dot
- Score shown as numeric badge
- Risk marker shown as "Risk rising" chip
- Sector chip omitted when sector is missing
- No generic filler text like "Sector pending company with moderate conviction context"

## Company Page Pending Rules

- When thesis unavailable: show "Research signals pending"
- Never show "prediction registry", "prediction not found", or backend error codes
- Factor panel: use FactorScorePanel component
- Research signal: use ThesisHealthMeter component

## Compare Suggestion Rules

- Suggested companies come from real ranking API data
- No fake company pairs
- Empty state shows up to 6 ranked companies as suggestions
- Comparison category buttons (Quality vs Value etc.) use first 2 ranked companies

## Auth Return Context Rules

- Signup page: title "Create your account", body "Create an account to continue your research."
- With return context: "Create an account to continue researching {SYMBOL}."
- Secondary link: "Already have an account? Sign in" -> login page
- Login page: title "Sign in", body "Sign in to continue your research."
- With return context: "Sign in to continue researching {SYMBOL}."
- Secondary link: "Need an account? Create one" -> signup page
- `getReturnToContext(returnTo, isSignup)` must be called with correct `isSignup` parameter:
  - Login page: `getReturnToContext(returnTo, false)`
  - Signup page: `getReturnToContext(returnTo, true)`
- Return route must be preserved after auth

## Portfolio Fallback Rules

- No repeated "Awaiting pricing" stat cards
- No fake market value or P&L
- No fake holdings
- If no monitored positions: show clear thesis-monitor empty state with CTAs:
  - Open scanner
  - Search company
  - Open watchlist
- If monitored companies exist: show thesis status, quote context if real, risk review if real

## Prohibited Frontend Terms

- Backend/provider/API/source/debug wording
- Provider names: IndianAPI, Yahoo, Jugaad, NSEPython, Upstox, Screener, Finnhub
- Terms: provider, coverage, freshness, source pending, source verified
- Terms: lineage, migration, backfill, diagnostics, data operations
- Terms: data unavailable, quote unavailable, history unavailable
- Terms: API unavailable, backend error, provider unavailable
- Terms: source unavailable, coverage incomplete, diagnostics failed
- Terms: backend, debug, test fixture
- HTTP status codes (500, 404, etc.)
- Raw exceptions, raw JSON

## No Buy/Sell/Hold Labels

- Buy, Sell, Hold, Strong Buy, Strong Sell
- Target price, Guaranteed upside
- Multibagger, Sure shot, Profit guaranteed
- "best stock to buy", "AI picks", "Top picks"
- Try Pro, Unlock Pro, Trade now, 30 days free
- guaranteed, sure shot, multibagger

## Product-Safe Fallback Language

- "Research signals pending"
- "Rankings are being compiled"
- "Awaiting research cycle"
- "Track this company to review changes over time"
- "Search a company to begin research"
- "Compare before investing"
- "Review risk before continuing"
- "Insufficient information"
- "Company metadata needs research."

## Public Navigation Rules

- Public nav must sell the product, not leak rankings
- Items: Scanner / Product / Research Standards / Sign in / Get started
- Authenticated nav can keep Rankings

## Missing Data Behavior

- When financial fields are missing/not applicable, omit them quietly
- Never show generic filler text for missing fields
- Overall score adjusts to represent verified data available
- Ranking page shows "—" for missing sector on desktop
- Mobile ranking cards omit sector chip when missing

## Dark Table Styling

- All app tables must use dark graphite background (`bg-[#0D1117]`)
- No `bg-white` or light table backgrounds anywhere in product UI
- Headers: dark subtle background with light muted text (`text-[#8B949E]`)
- Body rows: dark subtle dividers, light text (`text-[#E6EDF3]`)
- Row hover: subtle highlight state
- Tabular numeric cells use `tabular-nums` font variant
- Responsive overflow container with dark scrollbar styling
- Table container uses dark border + subtle inner shadow

## Scanner Chip Rail Styling

- Horizontal chip rails use `scrollbar-none` class to hide native scrollbar
- Chips are dark styled with borders matching the design system
- No default white/light scrollbar visible
- Missing sector chips are omitted entirely (not rendered as "Sector pending")
- Chip wrapping rows on small screens instead of clipping

## Verification & Testing

- Unit tests verify forbidden copy audit patterns across all product surfaces
- E2E tests verify public rankings gating, scanner chip rail, auth copy, and about page completeness
- Compliance audit covers: backend/provider terms, trading language, social proof, render garbage
- Tests assert no "Not available", "Sector pending", or "Awaiting pricing" in product UI
- Tests assert no Buy/Sell/Hold labels visible to users
