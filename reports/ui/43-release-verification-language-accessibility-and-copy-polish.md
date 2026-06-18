# Release verification: language, accessibility, and copy polish

**Baseline commit:** `94a0b863` — Fix provider status contract and Trust Centre clarity

## Summary of UI copy fixes

| File | Before | After |
|------|--------|-------|
| Sidebar | "Research" | "Trust Centre" |
| Sidebar | missing | Added "Signals" nav item |
| Sidebar redundant ternary | `isActive ? "a" + (isActive ? "b" : "")` | `isActive ? "a b"` |
| MobileNav public | "Research" | "Rankings" |
| MobileNav auth | "Watching" → "Research" → missing → "Portfolio" → "Account" | "Search" → "Rankings" → "Watchlist" → "Trust Centre" (Research tab) |
| MobileNav | missing aria-current | Added `aria-current="page"` to active tabs |
| DashboardHub | "Methodology" button | "Trust Centre" button |
| SearchPage heading | "Search Indian stocks" | "Search Indian companies" |
| SearchPage aria-label | "Search Indian stocks" | "Search Indian companies" |
| SearchPage tag | "Source registry" | "Base listing — no score yet" |
| StockStoryPage watchlist | "Remove From Watchlist" / "Add To Watchlist" | "Remove from watchlist" / "Add to watchlist" |
| StockStoryPage sidebar watchlist | "Remove from Watchlist" / "Track via Watchlist" | "Remove from watchlist" / "Track via watchlist" |
| StockStoryPage red flags | "{n} RED FLAGS DETECTED" | "{n} Risk indicators" |
| StockStoryPage factors | "Growth Outlook", "Business Quality", "Financial Stability", "Market Momentum", "Value & Margins" | "Growth metrics", "Quality metrics", "Stability score", "Price trend", "Value score" |
| TrustCentrePage formatDate | "N/A" | "Not available" |
| TrustCentrePage date guard | Rendered "As of" with null date | Guarded with `{generatedAt && (...)}` |
| TrustCentrePage env label | `key.replace(/_/g, " ")` raw key | "Provider" |
| TrustCentrePage error banner | `role="status"` | `role="alert"` |
| PremiumUI.css | Hardcoded Tailwind colors | CSS variable tokens |

## Accessibility fixes

| File | Change |
|------|--------|
| StockStoryPage tabs | Added `role="tablist"`, `role="tab"`, `aria-selected` |
| PublicPredictionsPage table headers | Added `scope="col"` to all `<th>` |
| PublicPredictionsPage rows | Added `tabIndex={0}`, `role="link"`, `onKeyDown` for Enter/Space, `focus-visible:outline-2` |
| PublicRankingsPage table rows | Added `tabIndex={0}`, `role="button"`, `onKeyDown` for Enter/Space |
| PublicRankingsPage sector select | Replaced `focus:outline-none` with `focus-visible:ring-2 focus-visible:ring-emerald-500` |
| PublicRankingsPage loading | Added `role="status" aria-live="polite"` |
| E2E test | Updated sidebar navigation test to find "Trust Centre" button |
| Global `:focus-visible` | Updated to use `--color-primary` variable |

## Route verification summary

All 11 routes × 8 viewports = 88 checks pass (responsive UI audit).

| Route | Viewports | Result |
|-------|-----------|--------|
| landing | 320–1920 | PASS |
| rankings | 320–1920 | PASS |
| signals | 320–1920 | PASS |
| about | 320–1920 | PASS |
| trust | 320–1920 | PASS |
| signin | 320–1920 | PASS |
| search-auth | 320–1920 | PASS |
| dashboard-auth | 320–1920 | PASS |
| watchlist-auth | 320–1920 | PASS |
| portfolio-auth | 320–1920 | PASS |
| company-reliance-auth | 320–1920 | PASS |

## Checks run and results

| Check | Result |
|-------|--------|
| typecheck:all | PASS |
| lint | PASS |
| test:unit | 971/971 PASS |
| validate:hygiene | PASS |
| build:frontend | PASS |
| build:backend | PASS |
| test:e2e | 36/36 PASS |
| audit:responsive-ui | 88/88 PASS |
| smoke:production | PASS (non-critical warnings) |
| verify:data:production | QUALITY=PASS (5 non-critical warnings) |
| check:market-providers | PASS |
| diagnose:scored-symbols | PASS (94/116 scored) |
| check:python-runtime | python 3.9.6, jugaad_data 0.28, nsepython 0.1 |
| probe:jugaad-data | bhavcopy=healthy, market_status=healthy, rbi_rates=healthy |
| probe:nsepython | bhavcopy=healthy, financial_results=empty, market_breadth=failed |
| probe:yahoo | blocked HTTP 429 |
| validate:fundamentals | Usable sources: 5, Blocked: 2 |
| probe:fundamentals RELIANCE | 5 usable sources |

## Provider/data status verification

| Provider | Status | Load-bearing | Domains active |
|----------|--------|-------------|----------------|
| IndianAPI | Active (when configured) | Quotes | Quotes |
| Jugaad Data | Active fallback (configured off) | Bhavcopy, RBI, market status | Bhavcopy, RBI/macro, market_status |
| NSEPython | Active fallback (configured off) | Index quote, bhavcopy | Index, bhavcopy |
| Yahoo | Blocked HTTP 429 | No | None |
| NSELib | Archived | No | None |
| Fundamentals | Partial (29/31 via DB) | Snapshots + CSV | 29 symbols |
| CSV Import | Manual | Fundamentals fallback | Manual |
| Redis | Infrastructure cache | Cache | Cache |
| Dhan/Upstox/Finnhub | Not active | No | None |

## Remaining issues

- Jugaad Data and NSEPython remain "configured off" by default — they can be enabled via feature flags for their healthy domains.
- Yahoo is blocked by HTTP 429 and requires no further compliant remediation.
- Fundamentals coverage at 29/31 symbols is partial; CSV import workflow exists for the remaining 2.
- 3 symbols (VARUNBEVER, ZOMATO, YESBANK) have no quote/history data.
- 5 non-critical data quality warnings (Yahoo degraded, Jugaad/NSEPython configured off, fundamentals partial, CSV manual).

## Confirmation

- No fake data added.
- No trading/investment advice or pro/paywall fake UI.
- No broker credentials, no Dhan/Upstox/Finnhub active references.
- No secrets printed or committed.
- All values are real data, derived from real data, explicitly unavailable, or omitted.
