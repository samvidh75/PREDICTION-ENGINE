# Phase 2: Public Distribution Surface Audit

## Current Public Surface Inventory

| # | Surface | Route | Status | Has OG | Has SEO | Internal links? | Notes |
|---|---------|-------|--------|--------|---------|----------------|-------|
| 1 | Landing | `/` | ✅ Live | ✅ og-image.png | Partial | No | Default OG image |
| 2 | Scanner | `/scanner` | ✅ Live | ❌ | ❌ | No | Route exists, needs SEO |
| 3 | Stock/Company | `/stock/:symbol` | ✅ Live | ❌ | ❌ | No | Existing StockPage |
| 4 | Watchlist | `/watchlist` | ✅ Live | ❌ | ❌ | No | Requires auth? |
| 5 | Pricing | `/pricing` | ✅ Live | ❌ | ❌ | No | Needs meta |
| 6 | Waitlist | `/waitlist` | ⚡ Conditional | ❌ | ❌ | No | Beta gated |
| 7 | Changelog | `/changelog` | ⚡ Conditional | ❌ | ❌ | No | Beta gated |
| 8 | Compare | `/compare` | 🔀 Redirects to / | ❌ | ❌ | No | Redirect |
| 9 | Methodology | `/methodology` | ❌ Not routed | ❌ | ❌ | N/A | Need to create |
| 10 | Trust | `/trust` | ❌ Not routed | ❌ | ❌ | N/A | Need to create |
| 11 | Support | `/support` | ❌ Not routed | ❌ | ❌ | N/A | Need to create |
| 12 | Sitemap | `/sitemap.xml` | ⚠️ Static | N/A | N/A | N/A | Missing routes, has /compare |
| 13 | Robots | `/robots.txt` | ✅ Present | N/A | N/A | N/A | Basic, needs update |
| 14 | OG images | `/og-image.png` | ✅ Default | N/A | N/A | N/A | Only default exists |
| 15 | Share | `/share/research/:id` | ❌ Not created | N/A | N/A | N/A | Phase 8 |
| 16 | Report | `/report/:symbol` | ❌ Not created | N/A | N/A | N/A | Phase 9 |
| 17 | Invite | `/invite` | ❌ Not created | N/A | N/A | N/A | Phase 14 |
| 18 | Sector | `/sectors/` | ❌ Not created | N/A | N/A | N/A | Phase 5 |
| 19 | Sector/:slug | `/sectors/:slug` | ❌ Not created | N/A | N/A | N/A | Phase 5 |
| 20 | Scanner presets | `/scanner/:preset` | ❌ Not created | N/A | N/A | N/A | Phase 6 |

## Audit Findings

### Issues Found
1. **Compare route in sitemap** — `/compare` redirects to `/` but is in sitemap.xml with priority 0.7
2. **Missing canonical routes** — `/methodology`, `/trust`, `/support`, `/pricing`, `/changelog` not in sitemap
3. **Only 4 stock pages in sitemap** — Should use dynamic or carefully curated set
4. **No sector pages** — Missing major SEO opportunity
5. **No OG metadata per page type** — All pages share default og-image.png
6. **No SEO metadata system** — No per-page title/description/structured data
7. **No robots.txt disallow rules for internal routes** — Though no internal routes exist yet
8. **No share/export functionality** — Key distribution surface missing

### Required Actions (by Phase)
- Phase 3: Add company research page system
- Phase 4: SEO metadata system
- Phase 5: Sector research hubs
- Phase 6: Scanner landing pages
- Phase 7: Methodology content
- Phase 8: Shareable research snapshots
- Phase 9: Report export
- Phase 10: OG image system
- Phase 11: Update sitemap/robots
- Phase 14: Referral/invite
- Phase 15: Trust/disclosure page

### Surface Classification
- **SEO-critical**: Landing, Scanner, Stock pages, Sector hubs, Methodology
- **Trust-critical**: Pricing, Trust, Support, Disclosures
- **Growth**: Waitlist, Invite, Share, Changelog
- **Internal**: Internal pages, diagnostics, admin routes
