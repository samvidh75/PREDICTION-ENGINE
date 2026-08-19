# StockStory design frontend (static)

These are the **16 StockStory design pages** served as a static UI at `/design/`
(the app's home route `/` redirects here, so opening the site shows the design).
Each `StockStory *.dc.html` is a self-contained design page rendered in the
browser by the `dc-runtime` (`support.js`) + React (vendored under `vendor/`,
no CDN dependency). The pages link to each other, so the whole UI is navigable.

## What's here
- `index.html` — the Shell (dashboard) design, served at `/design/`.
- `StockStory *.dc.html` — the 16 design pages (Scanner, Stock Detail, Watchlist,
  Portfolio, Alerts, Compare, Sectors, Pricing, About, Methodology, etc.).
- `support.js` — the `dc-runtime` that parses the `<x-dc>` template and renders it
  with React (this is what the design tool uses to preview the pages).
- `vendor/react*.production.min.js` — vendored React 18 UMD (loaded before
  `support.js`, which requires `window.React` / `window.ReactDOM`).
- `_ds/` — the design-system bundle stub referenced by the templates.

## How the pages render
Each page's `<head>` loads `vendor/react*.js` then `support.js`. On
`DOMContentLoaded`, `support.js` finds the `<x-dc>` template + the inline
`<script data-dc-script>` logic in the page, computes the `{{ }}` bindings
(nav, index tape, charts, etc.) and renders the page into the DOM.

## How to swap back to the real app
- The React app's home route (`src/app/routes.tsx`, `DesignLanding`) hard-redirects
  to `/design/`. Point `/` back to the app (e.g. `<Navigate to="/about" replace />`)
  to restore the data-driven UI.
- `public/design/` is copied verbatim into `dist/public/design/` at build time.
