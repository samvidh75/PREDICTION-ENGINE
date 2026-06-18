# Premium AI-Native Interface Rebuild

Baseline commit: `dbf5cedc`

## Summary

Rebuilt the primary StockStory India UI into a premium AI-native research terminal style while preserving the product rules: research only, no recommendations, no fake metrics, and no fabricated provider claims.

## Design Goals

- Stronger premium identity for Indian equity research.
- Dimensional dashboard and floating research surfaces.
- Better mobile/tablet/desktop behavior with stacked cards on small screens.
- Clear data integrity and unavailable-data states.
- Authenticated dashboard that feels like a research command centre.

## Components Rebuilt

- Premium global tokens and surfaces in `src/styles/index.css`.
- Shared premium primitives in `src/components/premium/PremiumUI.tsx`.
- Navigation shell: `TopNav`, `Sidebar`, `AppLayout`.
- Landing page, dashboard, rankings, signals, About, login, signup.

## Pages Rebuilt

- Public landing: rebuilt from scratch with large hero, real coverage preview, dimensional terminal mockup, workflow, modules, and data integrity CTA.
- Authenticated dashboard: rebuilt with dark command header, coverage metrics, signal timeline, watchlist, portfolio source labels, and Trust Centre entry point.
- Rankings: premium leaderboard header, live coverage metrics, desktop table, mobile cards.
- Signals: premium research-change framing, metric cards, mobile signal cards, honest empty/degraded state.
- About: editorial mission/trust page with explicit product boundaries.
- Auth pages: split premium layouts with trust microcopy.

## Responsive Verification

The new `npm run audit:responsive-ui` script checks 8 viewports across major routes for overflow, nav presence, raw invalid tokens, console errors, and premium surface selectors. It writes `reports/ui/33-premium-interface-rebuild-visual-qa.md`.

## Data Safety

- No fake financial numbers were added.
- Landing/dashboard/rankings/signals metrics come from existing APIs or show unavailable/pending states.
- Portfolio copy explicitly says values are user-entered and broker data is not shown as active.
- No secrets or raw provider env values were added to visible UI.
- No formulas or scoring engines were changed.

## Remaining UI Issues

- The company detail page remains the existing source-backed research page inside the upgraded shell; a deeper component-by-component company superpage redesign is still a follow-up opportunity.
- Trust Centre data tables retain much of the existing detailed implementation, now benefiting from global premium tokens and navigation.
