# Route-by-Route Visual Acceptance Audit

Date: 2026-06-19
Source: `http://localhost:5173`
Capture: `.tmp/visual-audit/capture.ts` (Playwright headless)
Routes: 11 — landing, rankings, signals, trust, about, dashboard, search, compare, watchlist, portfolio, company-reliance
Viewports: 4 — 1440×900, 1920×1080, 390×844, 768×1024
Total captures: 44

## Scoring rubric

| Score | Meaning |
| --- | --- |
| 9–10 | Premium, intentional composition, full-width, restraint, calm |
| 7–8 | Strong, minor density or polish opportunities remain |
| 5–6 | Functional, but feels generic SaaS / card wall / oversized |
| 3–4 | Bulky blocks, narrow column, mobile shell on desktop |
| 1–2 | Broken layout, no layout, raw tokens visible |

## Width sanity (every route)

| Viewport | Public pages (01–05) | Auth pages (06–11) | Expected |
| --- | --- | --- | --- |
| desktop-1440 | 1440px content | 1384px content | 1440 full / 1440 − 56px rail |
| desktop-1920 | 1920px content | 1864px content | 1920 full / 1920 − 56px rail |
| tablet-768 | 768px content | 712px content | 768 full / 768 − 56px rail |
| mobile-390 | 390px content | 390px content | full |

No horizontal overflow detected on any route at any viewport. Empty right is zero on every captured page — full-width composition is correct.

The "bottom dock" detector returned `true` for public pages 01–05 on desktop; this is a false positive. The selector `nav.fixed.bottom-0` matches the public footer / mobile nav inside `PremiumPage` for public pages, not the `IntelligenceOSShell` mobile dock. Public pages do not use `IntelligenceOSShell`. This is a detector bug, not a layout bug. Auth pages 06–11 have the mobile dock correctly hidden on desktop (gated by `md:hidden`).

---

## 01 — Landing (`?page=landing`)

Screenshots:
- desktop-1440: `.tmp/visual-audit/01-landing_desktop-1440.png`
- desktop-1920: `.tmp/visual-audit/01-landing_desktop-1920.png`
- tablet-768: `.tmp/visual-audit/01-landing_tablet-768.png`
- mobile-390: `.tmp/visual-audit/01-landing_mobile-390.png`

Desktop score: **8.5 / 10**
Mobile score: **8.5 / 10**

What feels premium:
- Full-width hero with left/right composition (text + product preview) at `lg:grid-cols-[1.1fr_0.9fr]`
- No narrow column — content spans 1440 / 1920 viewport
- Compact product preview card with coverage counts, model run badge, source trace pills
- Single Research Intelligence OS eyebrow pill — restrained

What feels bulky / could improve:
- Workflow section has 4 cards stacked at `lg:grid-cols-4` — feels slightly generic card wall; could be tightened
- Data integrity section is a single full-width card — feels under-utilized at desktop
- Source trace pills row could collapse to a single line on mobile

Exact fixes planned:
- Tighten workflow grid to 2-col on desktop, 4-col only on xl+
- Reduce workflow icon + title + body vertical rhythm
- Make data integrity section a left/right composition (text + small chip rail) instead of single block

Remaining issues:
- Hero subline is two long sentences — could be tightened to one
- No real chart preview — currently relies on numeric counts and pills

## 02 — Rankings (`?page=rankings`)

Screenshots:
- desktop-1440: `.tmp/visual-audit/02-rankings_desktop-1440.png`
- desktop-1920: `.tmp/visual-audit/02-rankings_desktop-1920.png`
- tablet-768: `.tmp/visual-audit/02-rankings_tablet-768.png`
- mobile-390: `.tmp/visual-audit/02-rankings_mobile-390.png`

Desktop score: **8 / 10**
Mobile score: **7.5 / 10**

What feels premium:
- Full-width rankings table, no narrow column
- Compact row density, monospace symbols
- Source-backed data labelling

What feels bulky / could improve:
- Filter row above the table is a long pill rail — could be tightened into a single row
- Table is dense and looks like a generic SaaS list; could use row dividers with more breathing room
- Mobile: filter pills wrap to many lines; could become a single horizontally-scrollable row

Exact fixes planned:
- Reduce filter pill count to 3–4 most-used + "More" overflow
- Increase table row padding from `py-2` to `py-3` for calmer rhythm
- On mobile, collapse filter rail to single scrollable row

Remaining issues:
- No chart preview at top
- Empty state when symbols list is short (e.g. only a few hundred) is acceptable but could mention coverage count

## 03 — Signals / Predictions (`?page=predictions`)

Screenshots:
- desktop-1440: `.tmp/visual-audit/03-signals_desktop-1440.png`
- desktop-1920: `.tmp/visual-audit/03-signals_desktop-1920.png`
- tablet-768: `.tmp/visual-audit/03-signals_tablet-768.png`
- mobile-390: `.tmp/visual-audit/03-signals_mobile-390.png`

Desktop score: **8 / 10**
Mobile score: **8 / 10**

What feels premium:
- Compact signal list with classification chips
- "Source backed" status chip
- Severity colour system is restrained (no buy/sell language)

What feels bulky / could improve:
- Section header takes more vertical space than the signal list on mobile
- No empty-state guidance when no signals exist

Exact fixes planned:
- Tighten section header on mobile
- Add an empty-state DataUnavailableState component with a calm message

Remaining issues:
- Could use a small histogram or factor breakdown per signal — currently text only

## 04 — Trust Centre (`?page=trust`)

Screenshots:
- desktop-1440: `.tmp/visual-audit/04-trust_desktop-1440.png`
- desktop-1920: `.tmp/visual-audit/04-trust_desktop-1920.png`
- tablet-768: `.tmp/visual-audit/04-trust_tablet-768.png`
- mobile-390: `.tmp/visual-audit/04-trust_mobile-390.png`

Desktop score: **7.5 / 10**
Mobile score: **7 / 10**

What feels premium:
- Full-width trust layout, no narrow column
- Long-form methodology content with restrained typography
- Provider status labels are explicit ("healthy", "degraded", "archived")

What feels bulky / could improve:
- Page is text-heavy and could benefit from a sticky TOC on desktop
- Provider list section is a flat list — could be a 2-column table on desktop

Exact fixes planned:
- Add a sticky section index on desktop (3-4 anchors max)
- Convert provider list to a 2-col grid on desktop

Remaining issues:
- Long-form content makes page very tall on mobile — that's expected for methodology

## 05 — About (`?page=about`)

Screenshots:
- desktop-1440: `.tmp/visual-audit/05-about_desktop-1440.png`
- desktop-1920: `.tmp/visual-audit/05-about_desktop-1920.png`
- tablet-768: `.tmp/visual-audit/05-about_tablet-768.png`
- mobile-390: `.tmp/visual-audit/05-about_mobile-390.png`

Desktop score: **8 / 10**
Mobile score: **7.5 / 10**

What feels premium:
- Full-width mission page with calm typography
- Single-column reading width on desktop (`max-w-[1440px]` outer with no narrow column)
- Mission values rendered as restrained row items

What feels bulky / could improve:
- Could use a side panel on desktop with mission summary
- Reading width on desktop is full 1440px — long lines are uncomfortable; could clamp to ~720px reading column

Exact fixes planned:
- Clamp reading content to `max-w-3xl` centred on desktop for the prose sections
- Keep mission header / CTA at full-width

Remaining issues:
- None significant

## 06 — Dashboard (`?page=dashboard`) — authenticated

Screenshots:
- desktop-1440: `.tmp/visual-audit/06-dashboard_desktop-1440.png`
- desktop-1920: `.tmp/visual-audit/06-dashboard_desktop-1920.png`
- tablet-768: `.tmp/visual-audit/06-dashboard_tablet-768.png`
- mobile-390: `.tmp/visual-audit/06-dashboard_mobile-390.png`

Desktop score: **8 / 10**
Mobile score: **7.5 / 10**

What feels premium:
- Compact workspace header (Research workspace + 3 inline counts + 2 action buttons)
- Data strip is a single horizontal row with 3 cells and a pill row — no oversized metric cards
- Two-column main area: signal changes (1.3fr) + watchlist/portfolio/freshness (0.9fr)
- Empty state messages are explicit and not "fake"

What feels bulky / could improve:
- Watchlist column is 3 stacked blocks (watchlist + portfolio + freshness); portfolio and freshness could be inline chips
- "Recent" ticker chips row only shows when there's data; could also show "no recent research" copy

Exact fixes planned:
- Merge portfolio + freshness into a single block with two side-by-side fields
- Add empty state copy for "Recent" row

Remaining issues:
- No chart / mini sparkline preview on dashboard — by design (text-led dashboard)

## 07 — Search (`?page=search`) — authenticated

Screenshots:
- desktop-1440: `.tmp/visual-audit/07-search_desktop-1440.png`
- desktop-1920: `.tmp/visual-audit/07-search_desktop-1920.png`
- tablet-768: `.tmp/visual-audit/07-search_tablet-768.png`
- mobile-390: `.tmp/visual-audit/07-search_mobile-390.png`

Desktop score: **8.5 / 10**
Mobile score: **8 / 10**

What feels premium:
- Compact search input — not a giant search block
- Slim results list with monospace symbol + company name + sector chip
- Empty state shows recent searches and top sectors — calm

What feels bulky / could improve:
- Empty state on desktop is light — could add a "Top ranked today" preview
- Result list row density could be slightly tighter

Exact fixes planned:
- Add a small "Top ranked today" rail on the empty state (desktop only)
- Tighten result row padding

Remaining issues:
- No keyboard shortcut hint visible in the search input (only the global ⌘K)

## 08 — Compare (`?page=compare&ids=RELIANCE,TCS`) — authenticated

Screenshots:
- desktop-1440: `.tmp/visual-audit/08-compare_desktop-1440.png`
- desktop-1920: `.tmp/visual-audit/08-compare_desktop-1920.png`
- tablet-768: `.tmp/visual-audit/08-compare_tablet-768.png`
- mobile-390: `.tmp/visual-audit/08-compare_mobile-390.png`

Desktop score: **8 / 10**
Mobile score: **7.5 / 10**

What feels premium:
- Two cards side-by-side with a centre selector for adding a third
- Comparison matrix below renders in a full-width table
- No "Try Pro" or "Unlock Pro" upsell

What feels bulky / could improve:
- Matrix rows are dense; could use row dividers with more breathing room
- Mobile: comparison matrix scrolls horizontally — could be redesigned to a stacked row-per-metric

Exact fixes planned:
- Tighten matrix row density
- Add a row hover state with an "Inspect" link

Remaining issues:
- Horizontal scroll on mobile is unavoidable for side-by-side metrics; acceptable

## 09 — Watchlist (`?page=watchlist`) — authenticated

Screenshots:
- desktop-1440: `.tmp/visual-audit/09-watchlist_desktop-1440.png`
- desktop-1920: `.tmp/visual-audit/09-watchlist_desktop-1920.png`
- tablet-768: `.tmp/visual-audit/09-watchlist_tablet-768.png`
- mobile-390: `.tmp/visual-audit/09-watchlist_mobile-390.png`

Desktop score: **8 / 10**
Mobile score: **8 / 10**

What feels premium:
- Single full-width card with a list of saved companies
- Compact row density with monospace symbols
- Add-to-watchlist CTA at the top

What feels bulky / could improve:
- Empty state could be calmer with an inline CTA
- No sector breakdown chart

Exact fixes planned:
- Add a small sector distribution chip rail at the top of the page (only when there are saved tickers)

Remaining issues:
- None significant

## 10 — Portfolio (`?page=portfolio`) — authenticated

Screenshots:
- desktop-1440: `.tmp/visual-audit/10-portfolio_desktop-1440.png`
- desktop-1920: `.tmp/visual-audit/10-portfolio_desktop-1920.png`
- tablet-768: `.tmp/visual-audit/10-portfolio_tablet-768.png`
- mobile-390: `.tmp/visual-audit/10-portfolio_mobile-390.png`

Desktop score: **7.5 / 10**
Mobile score: **7.5 / 10**

What feels premium:
- Manual tracking language — "Add holding" form is explicit
- Holdings table is compact, no live P&L
- Empty state is explicit ("no positions saved")

What feels bulky / could improve:
- "Add holding" form is a separate card; could be an inline drawer
- Holdings table columns are dense; could be split into "core" and "details" rows

Exact fixes planned:
- Add a small allocation chip rail (sector, market cap) at the top
- Make "Add holding" an inline collapsible

Remaining issues:
- Currency handling is a manual entry — could be improved later

## 11 — Company detail (`?page=stock&id=RELIANCE`) — authenticated

Screenshots:
- desktop-1440: `.tmp/visual-audit/11-company-reliance_desktop-1440.png`
- desktop-1920: `.tmp/visual-audit/11-company-reliance_desktop-1920.png`
- tablet-768: `.tmp/visual-audit/11-company-reliance_tablet-768.png`
- mobile-390: `.tmp/visual-audit/11-company-reliance_mobile-390.png`

Desktop score: **7.5 / 10**
Mobile score: **7 / 10**

What feels premium:
- Full-width company workspace
- Score panel with classification, confidence, freshness
- Source trace and provider health explicitly labelled

What feels bulky / could improve:
- Page is information-dense; could benefit from a sticky right rail with "Key signals" on desktop
- Score panel is a single block; could be split into "What changed" + "Why"

Exact fixes planned:
- Add a sticky right rail on desktop with "Key signals" and "Inspect trace"
- Reduce the top header height by ~20%

Remaining issues:
- Long page on mobile — that's expected for a research page

---

## Cross-route observations

### What is working
- All 11 routes are full-width on desktop (no narrow column failure)
- All 11 routes have no horizontal overflow at any viewport
- No raw `undefined` / `null` / `NaN` visible in any capture
- Auth pages (06–11) correctly use `IntelligenceOSShell` (1384/1864px content) without mobile dock on desktop
- Public pages (01–05) correctly use `PremiumPage` at full viewport width
- Empty states are explicit and never use fake/sample data
- No "Try Pro" / "Unlock Pro" / "Strong Buy" / "Sell" language detected

### What is not working
- Trust Centre and About pages are text-heavy and could use better reading-width discipline
- The existing `npm run audit:visual-layout` script returns `Content: 0px` for every route (false positive) — needs fixing (PHASE 6)
- Some public pages could tighten the section-header rhythm

### Detector bugs (not layout bugs)
- The "bottom dock" detector flags public pages 01–05 as having a bottom dock on desktop. This is a false positive: the selector `nav.fixed.bottom-0` matches a footer or mobile-nav element in `PremiumPage`, not the `IntelligenceOSShell` mobile dock. Public pages do not use `IntelligenceOSShell`.

---

## Summary

- 11 routes × 4 viewports = 44 captures saved to `.tmp/visual-audit/`
- 0 horizontal-overflow failures
- 0 raw-token failures
- 0 narrow-column failures
- 1 detector false-positive (bottom dock on public pages) — flagged for fix
- 0 fake-data / no-advice / upsell-language violations

Overall average: **7.8 / 10**. All routes are full-width and respect the no-narrow-column rule. Polish opportunities centre on reading-width discipline, mobile rhythm, and dashboard density — addressed in PHASE 4.
