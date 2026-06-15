# Frontend Performance, SEO & Accessibility Polish — Report

**Date:** 2026-06-15  
**Branch:** main (commit f6cf16f+)  
**Scope:** Production frontend polish — no backend/scoring/provider changes  

## URLs Tested

| URL | Status |
|-----|--------|
| https://www.stockstory-india.com | 200 OK |
| https://stockstory-india.com | 308 → www |

Both URLs serve the built frontend successfully. No blank screens or 500s.

---

## SEO / Metadata Changes

### index.html

| Change | Rationale |
|--------|-----------|
| Updated Open Graph image URL from `og-image.png` → `og-image.svg` | SVG is lighter, scales perfectly, and is now a real file in `public/` |
| Added `og:image:type` meta tag (`image/svg+xml`) | Proper content-type declaration for social crawlers |
| Updated Twitter card image URL from `og-image.png` → `og-image.svg` | Consistency with OG image |

### Created: `public/og-image.svg`

Previously the site referenced `og-image.png` but no such file existed in the `public/` directory. Created a branded 1200×630 SVG social preview card containing:
- "STOCKSTORY.INDIA" branding
- "AI-Powered Investor Intelligence" tagline
- Research-only disclaimer footer
- Dark theme consistent with the app's design system
- Cyan accent bar

### Verified (no changes needed)

- Canonical URL: `https://stockstory-india.com/` — correct
- Title + description: credible, no exaggerated investment claims, research-only positioning
- Robots meta: `index, follow`
- Structured data (JSON-LD): WebApplication with free pricing — valid
- PWA manifest: present with shortcuts, proper icons, language `en-IN`
- Theme color, apple-mobile-web-app tags: present
- Font preconnect/preload: present and correct (Google Fonts: Orbitron, Exo 2, Inter)

---

## Accessibility Issues Found & Fixed

| Issue | File | Fix |
|-------|------|-----|
| Brand logo in desktop nav used `<span>` with `onClick` but no keyboard support | `src/components/navigation/TopNav.tsx` | Changed to `<button type="button">` — now focusable, keyboard-activatable |
| `<Card>` component with `onClick` rendered `<button>` without `type="button"` | `src/components/ui/Card.tsx` | Added `type={onClick ? "button" : undefined}` — prevents accidental form submission |
| Mobile brand logo already used `<button>` | `src/components/navigation/TopNav.tsx` | Already correct, no change needed |
| Non-clickable `<Card>` renders `<div>` | `src/components/ui/Card.tsx` | Already correct, type attribute omitted when not a button |

### Verified (no changes needed)

- `Button` component has `type="button"` by default via `React.ButtonHTMLAttributes`
- `Input` has proper `<label>` association
- All navigation links use `<button>` elements with `type="button"`
- Sidebar and MobileNav buttons are properly labeled
- Focus-visible outlines are defined in CSS (`.ss-focus-outline:focus-visible`)
- Color contrast: text on dark backgrounds uses high-contrast values (white/90, slate-100 on slate-950, etc.)
- Reduced motion: `@media (prefers-reduced-motion: reduce)` rule exists in index.css

---

## Performance Issues Found & Fixed

### Bundle Analysis (Vite build output)

```
dist/assets/index.css             126.87 kB  (21.95 kB gzip)
dist/assets/react.js              133.42 kB  (43.33 kB gzip)
dist/assets/firebase.js           286.26 kB  (88.11 kB gzip)
dist/assets/framer.js               6.83 kB  ( 2.71 kB gzip)
dist/assets/index.js              402.73 kB  (94.59 kB gzip)
```

Total JS: ~829 KB parsed / ~229 KB gzipped. This is acceptable for a SPA with Firebase + React + framer-motion.

### Chunk strategy (vite.config.ts)

- **react chunk**: React + ReactDOM isolated — good for long-term caching
- **framer chunk**: framer-motion isolated — rarely changes
- **firebase chunk**: Firebase SDK isolated — large but stable
- **main chunk**: application code — updated most frequently

This is already well-structured. No additional code-splitting was added because:
- The critical pages (landing, login, signup) are lightweight
- The authenticated heavy pages (DashboardHub, StockStory) share the same bundle boundary
- Splitting by route would require React.lazy + Suspense wrappers in PageRenderer, which adds complexity and a flash-of-loading for minimal gain given the bundle sizes
- framer-motion is already in its own chunk at only 6.83 KB

### Console Hygiene

| Original | File | Fix |
|----------|------|-----|
| `console.log("[UserJourneyEngine] Tracked: ...")` on every user action | `src/services/behavior/UserJourneyEngine.ts` | Wrapped in `if (import.meta.env.DEV)` — production is now silent |
| `console.log('🚀 PredictiveWorker initialized')` | `src/intelligence/prediction/PredictiveWorker.ts` | Removed entirely (useless noise) |
| `console.log('🚀 PredictiveWorker initialized')` | `src/engine/PredictiveWorker.ts` | Removed entirely (same duplicate) |
| `console.log("[Firebase bootstrap] env diagnostics", ...)` | `src/config/firebase.ts` | Wrapped in `if (import.meta.env.DEV)` — production is now silent |

### Deliberately kept (intentional warnings/errors)

- `console.warn("[Firebase] Could not set auth persistence:", err)` — legitimate operational warning
- `console.warn(msg)` in `assertFirebaseEnv()` — critical startup diagnostic when env vars are missing
- `console.error('Worker error:', error)` in PredictiveWorker — real error reporting
- Auth error logging in `AuthUXLoader` — already gated by `import.meta.env.DEV`

---

## Mobile Polish

- TopNav has separate mobile header (`md:hidden` + `md:block`)
- MobileNav provides bottom tab bar for authenticated and unauthenticated users
- AppLayout uses `md:ml-[240px]` sidebar offset on desktop, full-width on mobile
- Padding and spacing use responsive Tailwind classes (`px-6`, `md:px-[72px]`)
- All interactive elements have minimum tap targets (h-10, h-11, h-12)

No overflow, cramped controls, clipped text, or unusable tables were identified at 375px viewport width.

---

## Error / Loading States

- `AuthUXLoader` covers: connecting, loading, slow (>10s), timeout (>30s), redirecting, error
- `SubsystemErrorBoundary` provides graceful degradation with context preview + error line
- Cards render "Score not available" / "Not available" gracefully when data is absent
- `EmptyState` component renders a clean placeholder with icon + description
- No raw stack traces or JSON appear in the UI

---

## Files Changed

```
M  index.html                              # OG/Twitter image URLs, added og:image:type
A  public/og-image.svg                     # Branded social preview card
M  src/services/behavior/UserJourneyEngine.ts  # Dev-only console.log
M  src/intelligence/prediction/PredictiveWorker.ts # Removed init log
M  src/engine/PredictiveWorker.ts          # Removed init log
M  src/config/firebase.ts                  # Dev-only console.log
M  src/components/navigation/TopNav.tsx    # span→button for keyboard a11y
M  src/components/ui/Card.tsx              # Added type="button" for onClick variant
```

## What Was Intentionally Not Changed

- **Backend/scoring/provider logic**: untouched (verified: no backend files modified)
- **Ranking formulas / prediction engine**: untouched
- **API contracts / data models**: untouched
- **Firebase project config / Vercel settings / production domain settings**: untouched
- **Route-level code splitting**: evaluated but not implemented (see Performance section for rationale)
- **framer-motion removal**: while heavy, it is already chunk-isolated (6.83 KB) and used across many components; removing it would require significant refactoring for marginal gain
- **Design overhaul**: the existing dark theme with slate/neutral palette is consistent and accessible

## Verification Command Results

| Command | Result |
|---------|--------|
| `npm run typecheck:frontend` | PASS (0 errors) |
| `npm run lint` | PASS (0 warnings) |
| `npm run test:unit` | PASS (71 files, 781 tests) |
| `npm run validate:hygiene` | PASS (0 secrets, 0 hazards) |
| `npm run build:frontend` | PASS (built in 1.06s) |
| `npm run build:backend` | PASS |
| Production URL: `https://www.stockstory-india.com` | 200 OK |
| Production URL: `https://stockstory-india.com` | 308 → www |

---

## Final Git Operations

```bash
git add src/ index.html public/og-image.svg reports/frontend-rebuild/09-performance-seo-accessibility.md
git commit -m "Polish frontend performance SEO and accessibility"
git push origin main
