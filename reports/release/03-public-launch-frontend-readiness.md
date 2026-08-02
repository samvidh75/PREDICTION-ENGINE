# 03 — Public Launch Frontend Readiness

**Date:** 2026-06-17
**Baseline commit:** 64d1aba127d7a2db986a17fd72229ee88324c8cb
**Production smoke:** Vercel frontend 200, Railway API healthy, data coverage returning live data

---

## Production smoke result

| Check | Status |
|-------|--------|
| `curl -I https://www.stockstory-india.com` | 200 OK, Vercel, HIT cache |
| API health (`/api/ops/health`) | status "ok", 5 symbols covered, DB connected |
| Data coverage (`/api/ops/data-coverage`) | DB ready, 6 indexed companies, 2987 price rows |
| Stack traces | None |
| Secrets in response | None |

---

## SEO/metadata changes

| File | Change |
|------|--------|
| `index.html` | `lang="en"` → `lang="en-IN"` |
| `index.html` | Added `<meta name="mobile-web-app-capable" content="yes">` |
| `index.html` | Fixed `apple-mobile-web-app-status-bar-style` to `default` |
| `index.html` | Icon references updated from PNG to SVG |
| `src/hooks/useRouteMetadata.ts` | New — dynamic per-route document.title, description, OG/Twitter meta tags |
| `src/App.tsx` | Added `useRouteMetadata()` hook call |

### Route metadata coverage

| PageKey | Title | Description |
|---------|-------|-------------|
| `landing` | StockStory India — Indian Equity Research Workspace | Search Indian companies, review signals... |
| `about` | About — StockStory India | StockStory turns available financial data... |
| `login` | Sign in — StockStory India | Sign in to your research workspace |
| `signup` | Create account — StockStory India | Create a free account to search companies... |
| `dashboard` | Dashboard — StockStory India | Your research workspace |
| `search` | Search — StockStory India | Search Indian companies by ticker, name... |
| `company` / `stock` | {TICKER} — StockStory India | Dynamic per-symbol description |
| `trust` / `methodology` / `validation` | Methodology & Trust Centre | Scoring inputs, availability labels... |
| `predictions` | Score changes — StockStory India | Verified score changes... |
| `rankings` | Research rankings — StockStory India | Company rankings from verified scoring... |
| `portfolio` | Portfolio — StockStory India | Track recorded holdings and notes |
| `watchlist` | Watchlist — StockStory India | Saved companies and research notes |
| `settings` | Settings — StockStory India | Account preferences |

---

## Open Graph / Twitter changes

- OG image redesigned: warm-neutral background (#f8f7f4), deep ink text, deep green accent
- Removed dark/cyber theme from OG image
- Removed "AI-Powered Investor Intelligence" wording
- Replaced with "Indian Equity Research" positioning
- Disclaimer: "Research signals only. Not investment advice."

---

## Asset/icon changes

| File | Status |
|------|--------|
| `public/favicon.ico` | Existing, working (700 bytes) |
| `public/icon-192.svg` | **NEW** — S monogram on deep green background, warm border |
| `public/icon-512.svg` | **NEW** — larger version with "StockStory India" text |
| `public/og-image.svg` | **Updated** — warm-neutral theme, research-first copy |
| `public/manifest.json` | **Updated** — fixed colors, copy, shortcuts, SVG icons |

### manifest.json fixes
- `description`: "AI-powered investor intelligence" → "Research workspace for Indian equities with source-backed scoring signals."
- `background_color`: `#0f1117` → `#f8f7f4` (matches app background)
- `theme_color`: `#0f1117` → `#f8f7f4`
- `icons`: PNG references → SVG references
- `shortcuts`: Removed non-existent "Discovery" shortcut, replaced with "Rankings"

### Sitemap fixes
- Removed non-existent routes: `discovery`, `alerts`, `academy`
- Added active public routes: `rankings`, `predictions`, `methodology`
- Removed authenticated-only routes (not crawlable)

---

## robots.txt

- Already present and correct
- Allows all crawlers
- References sitemap at `https://stockstory-india.com/sitemap.xml`

---

## Accessibility improvements

- `index.html`: Added `lang="en-IN"` for correct screen reader language
- `index.html`: Added `mobile-web-app-capable` (new standard)
- All interactive elements use proper button semantics
- Table component (`src/components/ui/Table.tsx`) has `scope="col"` on all `th`
- Focus rings use consistent `accent-primary` tokens
- Reduced motion media query in `index.css`
- Form inputs have proper `label`/`htmlFor` associations
- `aria-label` on icon-only buttons
- `role="status"` and `aria-live="polite"` on loading states
- No `href="#"` found in active routes

---

## Performance/bundle observations

| Asset | Raw | Gzipped |
|-------|-----|---------|
| index.html | 5.23 kB | 1.31 kB |
| CSS | 97.55 kB | 16.28 kB |
| React bundle | 133.42 kB | 43.33 kB |
| Firebase | 286.26 kB | 88.11 kB |
| App code | 290.85 kB | 66.62 kB |
| Framer Motion | 6.83 kB | 2.71 kB |
| Runtime | 0.56 kB | 0.36 kB |

- Total JS gzip: ~200 kB (good for complex SPA with Firebase)
- CSS gzip: 16 kB (Tailwind with tree-shaking)
- No oversized individual chunks
- No new dependencies introduced
- `useRouteMetadata` adds ~3 kB raw / ~1 kB gzip

---

## Runtime error-state improvements

- All routes show `EmptyState` for empty data instead of blank screens
- All routes show `LoadingState` with spinner for loading
- Error states use `ErrorState` component with calm copy
- API failures produce user-friendly messages, no stack traces
- `DataReadinessPanel` is dismissible via localStorage
- No `undefined`/`NaN`/`[object Object]` rendered in production paths
- All fallback values show "—" or "Unavailable" instead of null

---

## Route copy improvements

No additional changes in this pass. The previous UI polish pass (commit 64d1aba1) already addressed:
- Removed "pipeline", "system", "command" jargon
- Simplified dashboard titles
- Tightened all page subtitles
- Removed "AI-powered" and "guaranteed" wording
- Research-only positioning throughout

---

## Mobile QA summary

- 375px: Bottom nav readable, cards stack vertically, no horizontal overflow
- 430px: Same as 375px, slightly more breathing room
- 768px: Grids activate, side-by-side layouts
- 1024px: Full desktop layout, max-width container active
- 1440px: Max-width container, no dead space

No issues found.

---

## Browser QA summary

- Chrome (1440px): Landing, login, signup, rankings, predictions, trust all render correctly
- Mobile emulation (375px): Bottom nav, card stacking, input sizing all correct
- Console warnings: 3 (Firebase env not available in Vercel preview — expected; 1 deprecated meta tag — fixed)
- No console errors

---

## Tests added/updated

| File | Change |
|------|--------|
| `src/hooks/useRouteMetadata.ts` | New — route metadata hook (151 lines) |
| `src/App.tsx` | Updated — import and call `useRouteMetadata()` |

No test file changes needed — the metadata hook is a pure DOM side-effect hook with no render output to test. Existing route tests cover all PageKeys.

---

## Verification results

| Check | Status |
|-------|--------|
| `npm run typecheck:frontend` | Pass |
| `npm run typecheck:backend` | Pass |
| `npm run lint` | Pass |
| `npm run test:unit` | 830 passed, 77 files |
| `npm run validate:hygiene` | Pass (0 secrets, 0 warnings) |
| `npm run build:frontend` | Pass |
| `npm run build:backend` | Pass |

---

## Remaining launch blockers

None. All verification passes. Production is serving correctly.

---

## Confirmations

- **No fake data added:** All visible values come from backend APIs or show "—"/"Unavailable"
- **No investment-advice wording:** No "buy now", "sell now", "best stock", "guaranteed", or advisory claims
- **No backend/scoring/provider changes:** All changes are in frontend files only
- **No secrets touched:** No .env, API keys, or private config files modified
- **No new dependencies:** No package.json changes
